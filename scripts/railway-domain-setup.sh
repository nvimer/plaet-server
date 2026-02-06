#!/bin/bash

# Railway Database and Domain Configuration Guide
# For Plaet API deployment with plaet.cloud domain

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Plaet API - Railway Database & Domain Setup Guide${NC}"
echo "======================================================"
echo ""

echo -e "${BLUE}📋 PASO 1: OBTENER DATABASE URL DE RAILWAY${NC}"
echo ""
echo -e "${YELLOW}Opción A: Railway Dashboard (RECOMENDADO)${NC}"
echo "1. Ve a: https://railway.app"
echo "2. Ve a tu proyecto Plaet API"
echo "3. Haz clic en el servicio PostgreSQL"
echo "4. Copia la 'Connection URL' que aparece"
echo ""
echo -e "${YELLOW}Opción B: Railway CLI${NC}"
echo "npx @railway/cli variables"
echo "O busca la variable RAILWAY_POSTGRESQL_DATABASE_URL"
echo ""

echo -e "${BLUE}📋 PASO 2: CONFIGURAR APP CON plaet.cloud${NC}"
echo ""
echo -e "${CYAN}En Railway Dashboard → Settings → Variables:${NC}"
echo ""
echo -e "${GREEN}📊 Variables necesarias:${NC}"
echo ""

echo -e "${YELLOW}🔐 CRITICAL - JWT_SECRET:${NC}"
echo "5cc038ee3bc4583759ab9d44264e80a8cc9946e1c6d30869ff05ffa47ffa49ed7b74ff678e3bf388f5de5fa233cb05cd23bad15662779c18517b11af397fb17f"
echo ""
echo -e "${YELLOW}🗄️ DATABASE_URL (la obtuviste en paso 1):${NC}"
echo "pega aquí el URL de Railway PostgreSQL"
echo ""
echo -e "${YELLOW}🌐 CUSTOM DOMAIN VARIABLES:${NC}"
echo "NODE_ENV=production"
echo "PORT=8080"
echo "APP_URL=https://plaet.cloud/api/v1"
echo "ALLOWED_ORIGINS=https://plaet.cloud,https://www.plaet.cloud"
echo "SALT_ROUNDS=10"
echo "JWT_ACCESS_EXPIRATION_MINUTES=30"
echo "JWT_ACCESS_EXPIRATION_DAYS=7"
echo ""

echo -e "${BLUE}📋 PASO 3: CONFIGURAR DOMINIO PERSONALIZADO${NC}"
echo ""
echo -e "${YELLOW}En Railway Dashboard → Settings → Domains:${NC}"
echo "1. Añade dominio: plaet.cloud"
echo "2. Sigue las instrucciones de Railway para DNS"
echo "3. Espera la propagación del DNS (puede tomar 5-10 minutos)"
echo ""

echo -e "${GREEN}📋 ESTRUCTURA RAILWAY DOMAINS:${NC}"
echo ""
echo -e "${CYAN}Antes de configurar:${NC}"
echo "- Dominio Railway: plaet-api-production.up.railway.app"
echo "- Dominio personalizado: plaet.cloud"
echo ""
echo -e "${CYAN}Después de configurar:${NC}"
echo "- Dominio personalizado: plaet.cloud (apunta a Railway)"
echo "- Dominio Railway: todavía existe como respaldo"
echo ""

echo -e "${BLUE}📋 PASO 4: VARIABLES FINALES ACTUALIZADAS${NC}"
echo ""
echo -e "${GREEN}Después de configurar dominio personalizado:${NC}"
echo "APP_URL=https://plaet.cloud/api/v1"
echo "ALLOWED_ORIGINS=https://plaet.cloud,https://www.plaet.cloud"
echo ""

echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo "- Configura dominio ANTES de desplegar"
echo "- Actualiza variables con tu plaet.cloud"
echo "- Espera propagación DNS si necesitas"
echo ""

echo -e "${GREEN}✅ PASOS PARA DESPLIEGUE EXITOSO:${NC}"
echo ""
echo "1. Obtener DATABASE_URL del servicio PostgreSQL Railway"
echo "2. Configurar todas las variables en Railway Dashboard"
echo "3. Configurar dominio personalizado plaet.cloud"
echo "4. Deploy!"
echo ""
echo -e "${CYAN}🎯 TU API ESTARÁ EN: https://plaet.cloud/api/v1${NC}"
echo ""

echo -e "${BLUE}📚 Herramientas útiles:${NC}"
echo "https://railway.app/docs/variables"
echo "https://railway.app/docs/domains"
echo ""
echo -e "${GREEN}🎊 ¡Ready for plaet.cloud deployment!${NC}"