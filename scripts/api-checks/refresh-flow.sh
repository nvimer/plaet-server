#!/usr/bin/env bash
# Prueba de extremo a extremo del refresh token contra las Edge Functions desplegadas.
#
# Inicia sesión, refresca, y vuelve a presentar el token ya usado: el servidor debe
# rechazarlo como TOKEN_REUSED y cerrar todas las sesiones de ese usuario. Por eso,
# al terminar tendrás que volver a iniciar sesión en la app.
#
# La contraseña se pide sin eco y no queda en el historial.
#
# Uso: bash scripts/api-checks/refresh-flow.sh
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-alkrxrcpdxecpzgykbrz}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"

read -r -p "Anon key (VITE_DB_ANON_KEY): " ANON
read -r -p "Email: " EMAIL
read -r -s -p "Contraseña: " PASS
echo

post() { # post <función> <json>
  curl -s -X POST "$BASE/$1" -H "apikey: $ANON" -H "Content-Type: application/json" -d "$2"
}

field() { # field <json> <python expr sobre d>
  printf '%s' "$1" | python3 -c "import sys, json; d = json.load(sys.stdin); print($2)"
}

LOGIN_BODY=$(python3 -c 'import json, sys; print(json.dumps({"email": sys.argv[1], "password": sys.argv[2]}))' "$EMAIL" "$PASS")

echo "0) login"
LOGIN=$(post auth-login "$LOGIN_BODY")
R1=$(field "$LOGIN" 'd["data"]["refreshToken"]' 2>/dev/null) || {
  echo "   No se pudo iniciar sesión: $LOGIN"
  exit 1
}
echo "   ok"

echo "1) refresco con el token vigente          (esperado: success = True)"
RESP1=$(post auth-refresh-token "$(printf '{"refreshToken":"%s"}' "$R1")")
field "$RESP1" '"   success =", d.get("success"), "|", d.get("message")'

echo "2) reúso del token ya quemado             (esperado: success = False | code = TOKEN_REUSED)"
RESP2=$(post auth-refresh-token "$(printf '{"refreshToken":"%s"}' "$R1")")
field "$RESP2" '"   success =", d.get("success"), "| code =", d.get("code")'

echo "3) el token nuevo del paso 1, ya muerto   (esperado: success = False | code = TOKEN_REUSED)"
R2=$(field "$RESP1" 'd["data"]["refreshToken"]')
RESP3=$(post auth-refresh-token "$(printf '{"refreshToken":"%s"}' "$R2")")
field "$RESP3" '"   success =", d.get("success"), "| code =", d.get("code")'

echo
echo "Listo. Tu sesión en la app quedó cerrada: vuelve a iniciar sesión."
