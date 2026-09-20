-- Ensayo de la migración 00010 (refresh token) + prueba funcional.
--
-- Termina a propósito con un ERROR que empieza en 'RESULTADO ->'. Ese error es la
-- respuesta: al abortar, Postgres deshace TODO, migración y tokens de prueba.

-- ============ 00010_token_rotation.sql ============
-- ============================
-- REFRESH TOKEN ROTATION
-- ============================
-- auth-login has always issued a refresh token and stored it in `tokens`, but
-- nothing ever consumed it: there was no refresh endpoint, so a session simply
-- died after 30 minutes and the user logged in again.
--
-- Rotation: each refresh burns the token it was given and hands back a new pair.
-- A refresh token presented twice means it leaked, so every refresh token of that
-- user is blacklisted and the session ends.

CREATE INDEX IF NOT EXISTS "idx_tokens_token" ON "tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_tokens_user" ON "tokens"("userId", "type");

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('rotate_refresh_token_tx', 'blacklist_tokens_tx')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rotate_refresh_token_tx(
  p_old_token TEXT,
  p_user_id UUID,
  p_new_access TEXT,
  p_new_refresh TEXT,
  p_access_expires TIMESTAMP,
  p_refresh_expires TIMESTAMP
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT id, blacklisted, expires, "userId" INTO v_row
  FROM tokens
  WHERE token = p_old_token AND type = 'REFRESH'
  FOR UPDATE;

  -- Status is returned, not raised: raising would roll back the very writes that
  -- make reuse detection meaningful.
  IF NOT FOUND THEN
    RETURN 'TOKEN_NOT_FOUND';
  END IF;

  IF v_row."userId" IS DISTINCT FROM p_user_id THEN
    RETURN 'TOKEN_MISMATCH';
  END IF;

  -- Already burned: treat it as a leak and end every session of this user.
  IF v_row.blacklisted THEN
    UPDATE tokens SET blacklisted = true
    WHERE "userId" = p_user_id AND type = 'REFRESH' AND blacklisted = false;
    RETURN 'TOKEN_REUSED';
  END IF;

  IF v_row.expires <= NOW() THEN
    RETURN 'TOKEN_EXPIRED';
  END IF;

  UPDATE tokens SET blacklisted = true WHERE id = v_row.id;

  INSERT INTO tokens (token, type, expires, blacklisted, "userId") VALUES
    (p_new_access,  'ACCESS',  p_access_expires,  false, p_user_id),
    (p_new_refresh, 'REFRESH', p_refresh_expires, false, p_user_id);

  -- The table only grows otherwise; drop this user's dead rows while we are here.
  DELETE FROM tokens
  WHERE "userId" = p_user_id AND expires < NOW() - INTERVAL '7 days';

  RETURN 'OK';
END;
$$;

-- Logout: burn whatever the client hands back.
CREATE OR REPLACE FUNCTION public.blacklist_tokens_tx(
  p_user_id UUID,
  p_tokens TEXT[],
  p_all BOOLEAN DEFAULT false
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_all THEN
    UPDATE tokens SET blacklisted = true
    WHERE "userId" = p_user_id AND blacklisted = false;
  ELSE
    UPDATE tokens SET blacklisted = true
    WHERE "userId" = p_user_id AND blacklisted = false AND token = ANY(p_tokens);
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_refresh_token_tx(TEXT, UUID, TEXT, TEXT, TIMESTAMP, TIMESTAMP) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.blacklist_tokens_tx(UUID, TEXT[], BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rotate_refresh_token_tx(TEXT, UUID, TEXT, TEXT, TIMESTAMP, TIMESTAMP) TO service_role;
GRANT EXECUTE ON FUNCTION public.blacklist_tokens_tx(UUID, TEXT[], BOOLEAN) TO service_role;


-- ============ prueba funcional ============
DO $do$
DECLARE
  v_usuario UUID;
  v_estado_1 TEXT;
  v_estado_2 TEXT;
  v_viejo_quemado BOOLEAN;
  v_nuevos INTEGER;
  v_vivos_tras_reuso INTEGER;
  v_cerrados INTEGER;
BEGIN
  SELECT id INTO v_usuario FROM users WHERE deleted = false LIMIT 1;
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'RESULTADO -> no hay usuarios para la prueba';
  END IF;

  -- Sesión de partida: un par de tokens como los que emite auth-login.
  INSERT INTO tokens (token, type, expires, blacklisted, "userId") VALUES
    ('test-access-1',  'ACCESS',  NOW() + INTERVAL '30 minutes', false, v_usuario),
    ('test-refresh-1', 'REFRESH', NOW() + INTERVAL '7 days',     false, v_usuario);

  -- 1) Refresco normal: el viejo se quema y entran dos nuevos.
  v_estado_1 := rotate_refresh_token_tx(
    'test-refresh-1', v_usuario, 'test-access-2', 'test-refresh-2',
    (NOW() + INTERVAL '30 minutes')::TIMESTAMP, (NOW() + INTERVAL '7 days')::TIMESTAMP);

  SELECT blacklisted INTO v_viejo_quemado FROM tokens WHERE token = 'test-refresh-1';
  SELECT COUNT(*) INTO v_nuevos FROM tokens WHERE token IN ('test-access-2', 'test-refresh-2');

  -- 2) Reúso del token ya quemado: debe cerrar TODAS las sesiones del usuario.
  v_estado_2 := rotate_refresh_token_tx(
    'test-refresh-1', v_usuario, 'test-access-3', 'test-refresh-3',
    (NOW() + INTERVAL '30 minutes')::TIMESTAMP, (NOW() + INTERVAL '7 days')::TIMESTAMP);

  SELECT COUNT(*) INTO v_vivos_tras_reuso
  FROM tokens WHERE "userId" = v_usuario AND type = 'REFRESH' AND blacklisted = false;

  -- 3) Logout: quema lo que le pasen.
  v_cerrados := blacklist_tokens_tx(v_usuario, ARRAY['test-access-2'], false);

  RAISE EXCEPTION 'RESULTADO -> refresco=% (esperado OK) | viejo_quemado=% (esperado t) | nuevos=% (esperado 2) | reuso=% (esperado TOKEN_REUSED) | refresh_vivos_tras_reuso=% (esperado 0) | logout_cerrados=% (esperado 1)',
    v_estado_1, v_viejo_quemado, v_nuevos, v_estado_2, v_vivos_tras_reuso, v_cerrados;
END
$do$;