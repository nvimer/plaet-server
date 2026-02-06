#!/bin/bash

# Railway Networking Configuration Guide for Plaet API
# Public vs Private Networking explained

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🌐 Railway Networking Configuration - Plaet API${NC}"
echo "=============================================="
echo ""

echo -e "${BLUE}📍 UBICACIÓN EXACTA DE NETWORKING:${NC}"
echo ""
echo -e "${YELLOW}Railway Dashboard → Tu Proyecto Plaet API → Settings → Networking${NC}"
echo "ó"
echo -e "${YELLOW}Railway Dashboard → Tu Proyecto Plaet API → Settings → Domains${NC}"
echo ""

echo -e "${BLUE}🔧 TIPOS DE NETWORKING EN RAILWAY:${NC}"
echo ""

echo -e "${GREEN}🌍 PUBLIC NETWORKING (Recomendado para plaet.cloud)${NC}"
echo "----------------------------------------"
echo "✅ Tu API es accesible públicamente"
echo "✅ Dominios personalizados funcionan (plaet.cloud)"
echo "✅ HTTPS automático con certificados Let's Encrypt"
echo "✅ Ideal para APIs públicas como plaet.cloud"
echo ""
echo -e "${CYAN}Configuración para plaet.cloud:${NC}"
echo "- Public Networking seleccionado"
echo "- plaet.cloud apunta a tu app Railway"
echo "- Todo el mundo puede acceder a tu API"
echo ""

echo -e "${YELLOW}🔒 PRIVATE NETWORKING${NC}"
echo "---------------------------"
echo "🔒 Solo accesible dentro de Railway VPC"
echo "🔒 No accesible desde internet público"
echo "🔒 Para servicios internos o bases de datos"
echo "🔒 No funciona para APIs públicas como plaet.cloud"
echo ""

echo -e "${BLUE}📋 PASO 1: CONFIGURAR PUBLIC NETWORKING${NC}"
echo ""
echo -e "${YELLOW}En Railway Dashboard:${NC}"
echo "1. Settings → Networking (o Domains)"
echo "2. Selección: Public Networking"
echo "3. Agregar dominio: plaet.cloud"
echo "4. Configurar tipo: Public"
echo ""

echo -e "${CYAN}Configuración específica:${NC}"
echo ""
echo -e "${GREEN}✅ Networking Type:${NC} Public"
echo -e "${GREEN}✅ Domain:${NC} plaet.cloud"
echo -e "${GREEN}✅ Protocol:${NC} HTTPS (automático)"
echo -e "${GREEN}✅ Port:${NC} 443 (automático)"
echo -e "${GREEN}✅ Certificate:${NC} Let's Encrypt (automático)"
echo ""

echo -e "${BLUE}📋 PASO 2: DOMAINS CONFIGURATION${NC}"
echo ""
echo -e "${YELLOW}En Settings → Domains:${NC}"
echo "1. Añadir dominio: plaet.cloud"
echo "2. Railway te dará registros DNS"
echo "3. Configurar tu DNS con los registros de Railway"
echo ""
echo -e "${CYAN}Registros DNS típicos que Railway dará:${NC}"
echo ""
echo -e "${GREEN}Tipo: CNAME${NC}"
echo -e "${GREEN}Host: @${NC}"
echo -e "${GREEN}Value: tu-app-production.up.railway.app${NC}"
echo ""
echo -e "${YELLOW}O para www:${NC}"
echo -e "${GREEN}Host: www${NC}"
echo -e "${GREEN}Value: tu-app-production.up.railway.app${NC}"
echo ""

echo -e "${BLUE}📋 PASO 3: VARIABLES DE ENTORNO ACTUALIZADAS${NC}"
echo ""
echo -e "${YELLOW}Para Public Networking con plaet.cloud:${NC}"
echo ""
echo -e "${GREEN}APP_URL=https://plaet.cloud/api/v1${NC}"
echo -e "${GREEN}ALLOWED_ORIGINS=https://plaet.cloud,https://www.plaet.cloud${NC}"
echo -e "${GREEN}NODE_ENV=production${NC}"
echo "PORT=8080 (interno de Railway)"
echo ""

echo -e "${BLUE}📋 ESTRUCTURA FINAL DE NETWORKING:${NC}"
echo ""
echo -e "${CYAN}Internet → plaet.cloud → Railway${NC}"
echo -e "${CYAN}        ↓               ↑${NC}"
echo -e "${CYAN}  HTTPS → 443 → Public Network → plaet-api:${NC}"
echo -e "${CYAN}  HTTPS → 443 → Public Network → plaet-api:${NC}"
echo ""

echo -e "${RED}⚠️  IMPORTANTE - NO USAR PRIVATE NETWORKING${NC}"
echo ""
echo -e "${RED}Private networking previene que plaet.cloud sea accesible${NC}"
echo -e "${RED}Tu API de restaurante necesita ser PÚBLICA${NC}"
echo -e "${RED}Private = Solo para servicios internos${NC}"
echo ""

echo -e "${BLUE}📋 PASO 4: VERIFICACIÓN${NC}"
echo ""
echo -e "${YELLOW}Después de configurar:${NC}"
echo "1. Deploy tu app"
echo "2. Espera 5-10 minutos (propagación DNS)"
echo "3. Verifica: https://plaet.cloud/api/v1"
echo "4. Prueba documentación: https://plaet.cloud/api/v1/docs"
echo ""

echo -e "${GREEN}✅ RESULTADO FINAL:${NC}"
echo ""
echo -e "${CYAN}Tu Plaet API estará accesible en:${NC}"
echo -e "${YELLOW}🌐 https://plaet.cloud/api/v1${NC}"
echo -e "${YELLOW}📖 https://plaet.cloud/api/v1/docs${NC}"
echo "e "${YELLOW}🔍 https://plaet.cloud/api/health${NC}"
echo ""

echo -e "${GREEN}🎊 ¡Listo para despliegue con Public Networking!${NC}"
echo ""