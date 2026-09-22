#!/usr/bin/env bash
# Prueba de extremo a extremo del refresh token contra las Edge Functions desplegadas.
#
# Refresca una vez y luego vuelve a presentar el token ya usado: el servidor debe
# rechazarlo como TOKEN_REUSED y cerrar todas las sesiones de ese usuario.
#
# Hay dos formas de darle un refresh token:
#   1. Pegar el de una sesión abierta en el navegador (recomendado: la contraseña no
#      pasa por la terminal). DevTools > Application > Local Storage > tu dominio >
#      `refreshToken`. Ese token queda quemado después de la prueba, así que no
#      sirve de nada si alguien lo ve.
#   2. Dejar el campo vacío e iniciar sesión con email y contraseña. Cada intento
#      fallido cuenta: 5 bloquean la cuenta 15 minutos.
#
# Al terminar, todos tus refresh tokens quedan invalidados. La sesión de la app deja de
# renovarse y, cuando venza su access token (máximo 30 minutos), habrá que volver a entrar.
#
# Uso: bash scripts/api-checks/refresh-flow.sh
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-alkrxrcpdxecpzgykbrz}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"

# Las funciones no validan la apikey (verify_jwt = false), así que es opcional.
read -r -p "Anon key (opcional, Enter para omitir): " ANON
read -r -p "Refresh token de una sesión del navegador (Enter para usar email y contraseña): " R1

post() { # post <función> <json>
  local args=(-s -X POST "$BASE/$1" -H "Content-Type: application/json")
  if [ -n "$ANON" ]; then args+=(-H "apikey: $ANON"); fi
  curl "${args[@]}" -d "$2"
}

field() { # field <json> <python expr sobre d>
  printf '%s' "$1" | python3 -c "import sys, json; d = json.load(sys.stdin); print($2)"
}

if [ -n "$R1" ]; then
  echo "0) usando el refresh token que pegaste (sin login)"
else
  read -r -p "Email de tu cuenta de Plaet (el mismo con el que entras a plaet.cloud): " EMAIL
  read -r -s -p "Contraseña de Plaet (la de plaet.cloud, no la de Google ni la de Supabase): " PASS
  echo
  # Cada intento fallido cuenta: 5 bloquean la cuenta 15 minutos. Confirma antes de enviar.
  echo "   Recibí una contraseña de ${#PASS} caracteres."
  read -r -p "   ¿Es la longitud correcta? Enter para iniciar sesión, Ctrl+C para cancelar: " _

  LOGIN_BODY=$(python3 -c 'import json, sys; print(json.dumps({"email": sys.argv[1], "password": sys.argv[2]}))' "$EMAIL" "$PASS")

  echo "0) login"
  LOGIN=$(post auth-login "$LOGIN_BODY")
  R1=$(field "$LOGIN" 'd["data"]["refreshToken"]' 2>/dev/null) || {
    echo "   No se pudo iniciar sesión: $LOGIN"
    case "$LOGIN" in
      *INVALID_CREDENTIALS*) echo "   -> Ese email no existe." ;;
      *ACCOUNT_LOCKED*)      echo "   -> Cuenta bloqueada por intentos fallidos: espera 15 minutos." ;;
      *"Invalid credentials"*) echo "   -> El email existe pero la contraseña no coincide (cuenta como intento fallido)." ;;
    esac
    exit 1
  }
  echo "   ok"
fi

echo "1) refresco con el token vigente          (esperado: success = True)"
RESP1=$(post auth-refresh-token "$(printf '{"refreshToken":"%s"}' "$R1")")
field "$RESP1" '"   success =", d.get("success"), "|", d.get("message") or d.get("code")'

echo "2) reúso del token ya quemado             (esperado: success = False | code = TOKEN_REUSED)"
RESP2=$(post auth-refresh-token "$(printf '{"refreshToken":"%s"}' "$R1")")
field "$RESP2" '"   success =", d.get("success"), "| code =", d.get("code")'

echo "3) el token nuevo del paso 1, ya muerto   (esperado: success = False | code = TOKEN_REUSED)"
R2=$(field "$RESP1" 'd["data"]["refreshToken"]' 2>/dev/null) || {
  echo "   No hay token nuevo porque el paso 1 falló; no se puede hacer esta comprobación."
  exit 1
}
RESP3=$(post auth-refresh-token "$(printf '{"refreshToken":"%s"}' "$R2")")
field "$RESP3" '"   success =", d.get("success"), "| code =", d.get("code")'

echo
echo "Listo. Tus refresh tokens quedaron invalidados: vuelve a iniciar sesión en la app."
