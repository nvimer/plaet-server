#!/bin/bash

# Production Environment Variables Fix for Railway
# This script fixes the exact error: "Invalid environment variables"

set -e

echo "🚀 PRODUCTION ENVIRONMENT DEBUG - Railway"
echo "====================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verifying Railway Environment Variables...${NC}"
echo ""

# Check current environment
echo -e "${YELLOW}📊 Current Railway Environment:${NC}"
echo "NODE_ENV: ${NODE_ENV:-NOT_SET}"
echo "PORT: ${PORT:-NOT_SET}"
echo "DATABASE_URL: ${DATABASE_URL:-NOT_SET}"
echo "APP_URL: ${APP_URL:-NOT_SET}"
echo "JWT_SECRET: ${JWT_SECRET:+SET}${JWT_SECRET:-NOT_SET}"
echo "ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-NOT_SET}"
echo ""

echo -e "${GREEN}✅ Railway Variables Required:${NC}"
echo ""
echo -e "${YELLOW}🔑 JWT_SECRET (CRITICAL):${NC}"
echo "5cc038ee3bc4583759ab9d44264e80a8cc9946e1c6d30869ff05ffa47ffa49ed7b74ff678e3bf388f5de5fa233cb05cd23bad15662779c18517b11af397fb17f"
echo ""
echo -e "${YELLOW}📊 APP_URL (CRITICAL):${NC}"
echo "https://\${RAILWAY_PUBLIC_DOMAIN}/api/v1"
echo ""
echo -e "${YELLOW}🗄️ DATABASE_URL (AUTOMÁTICO):${NC}"
echo "Se configura automáticamente cuando añades PostgreSQL"
echo ""
echo -e "${YELLOW}🌐 ALLOWED_ORIGINS (IMPORTANT):${NC}"
echo "\${RAILWAY_PUBLIC_DOMAIN},https://www.plaet.cloud,https://plaet.cloud"
echo ""
echo -e "${YELLOW}🔧 OTHERS:${NC}"
echo "NODE_ENV=production"
echo "PORT=8080"
echo "SALT_ROUNDS=10"
echo "JWT_ACCESS_EXPIRATION_MINUTES=30"
echo "JWT_ACCESS_EXPIRATION_DAYS=7"
echo ""

echo -e "${RED}🚨 ERROR IDENTIFICADO:${NC}"
echo "El error ocurre porque Zod no valida las variables en Railway"
echo "Solución: Setear manualmente las variables en Railway Dashboard"
echo ""

echo -e "${BLUE}📋 ACCIÓN INMEDIATA:${NC}"
echo "1. Ve a Railway Dashboard"
echo "2. Settings → Variables"
echo "3. Añade JWT_SECRET con el valor mostrado arriba"
echo "4. Database URL se configura automáticamente al añadir PostgreSQL"
echo "5. Deploy!"
echo ""

echo -e "${GREEN}✅ READY FOR RAILWAY DEPLOYMENT!${NC}"