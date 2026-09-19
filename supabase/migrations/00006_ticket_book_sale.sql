-- ============================
-- TICKET BOOK SALE
-- ============================
-- Selling a ticket book creates the book and the cash payment that funds the
-- open register. The Express server did both in one transaction; this keeps that
-- guarantee now that the write comes from an Edge Function.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'sell_ticket_book_tx'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sell_ticket_book_tx(
  p_restaurant_id UUID,
  p_customer_id UUID,
  p_total_portions INTEGER,
  p_purchase_price NUMERIC,
  p_expiry_days INTEGER,
  p_day_start TIMESTAMP,
  p_day_end TIMESTAMP,
  p_daily_limit INTEGER DEFAULT 3
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closure_id UUID;
  v_books_today INTEGER;
  v_book_id UUID;
BEGIN
  IF p_total_portions IS NULL OR p_total_portions <= 0 THEN
    RAISE EXCEPTION 'INVALID_PORTIONS: total portions must be positive';
  END IF;

  SELECT id INTO v_closure_id
  FROM cash_closures
  WHERE restaurant_id = p_restaurant_id AND status = 'OPEN' AND deleted = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASH_CLOSURE_REQUIRED: No hay un turno de caja abierto. Por favor abre caja antes de vender tiqueteras.';
  END IF;

  -- The customer row is locked so two cashiers can't both pass the daily limit.
  PERFORM 1 FROM customers WHERE id = p_customer_id AND restaurant_id = p_restaurant_id AND deleted = false FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND: customer does not belong to this restaurant';
  END IF;

  SELECT COUNT(*) INTO v_books_today
  FROM ticket_books
  WHERE "customerId" = p_customer_id
    AND restaurant_id = p_restaurant_id
    AND status = 'active'
    AND purchase_date >= p_day_start
    AND purchase_date <= p_day_end;

  IF v_books_today >= p_daily_limit THEN
    RAISE EXCEPTION 'DAILY_TICKET_LIMIT_EXCEEDED: El cliente ya ha adquirido el límite máximo de % tiqueteras hoy. Intenta mañana.', p_daily_limit;
  END IF;

  INSERT INTO ticket_books (
    "customerId", total_portions, consumed_portions, purchase_price,
    purchase_date, expiry_date, status, restaurant_id, updated_at
  ) VALUES (
    p_customer_id, p_total_portions, 0, p_purchase_price,
    NOW(), NOW() + make_interval(days => p_expiry_days), 'active', p_restaurant_id, NOW()
  )
  RETURNING id INTO v_book_id;

  INSERT INTO payments (method, amount, cash_closure_id, transaction_ref)
  VALUES ('CASH', p_purchase_price, v_closure_id,
          format('Venta Tiquetera: %s porciones', p_total_portions));

  RETURN v_book_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sell_ticket_book_tx(UUID, UUID, INTEGER, NUMERIC, INTEGER, TIMESTAMP, TIMESTAMP, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sell_ticket_book_tx(UUID, UUID, INTEGER, NUMERIC, INTEGER, TIMESTAMP, TIMESTAMP, INTEGER) TO service_role;
