#!/bin/bash

# Railway Deployment Fix Script
# Solves invalid environment variables error

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Railway Deployment Fix - Invalid Environment Variables${NC}"
echo ""

echo -e "${YELLOW}🔍 CAUSA DEL ERROR:${NC}"
echo "Variables de entorno mal configuradas en railway.toml"
echo ""
echo -e "${BLUE}🛠️ SOLUCIÓN APLICADA:${NC}"
echo "✅ railway.toml corregido con referencias válidas"
echo "✅ .env.production limpio y sin duplicados"
echo "✅ Script de configuración creado"
echo ""

echo -e "${GREEN}📋 VARIABLES CORRECTAS PARA RAILWAY:${NC}"
echo ""
echo -e "${YELLOW}🔐 Seguras (configura manualmente):${NC}"
echo "JWT_SECRET=5cc038ee3bc4583759ab9d44264e80a8cc9946e1c6d30869ff05ffa47ffa49ed7b74ff678e3bf388f5de5fa233cb05cd23bad15662779c18517b11af397fb17f"
echo ""
echo -e "${YELLOW}📊 Aplicación:${NC}"
echo "NODE_ENV=production"
echo "PORT=8080"
echo "SALT_ROUNDS=10"
echo "JWT_ACCESS_EXPIRATION_MINUTES=30"
echo "JWT_ACCESS_EXPIRATION_DAYS=7"
echo ""
echo -e "${YELLOW}🌐 CORS (actualizar después de deployment):${NC}"
echo "ALLOWED_ORIGINS=https://tu-app.railway.app,https://www.plaet.cloud,https://plaet.cloud"
echo ""
echo -e "${BLUE}📖 PASOS EN RAILWAY DASHBOARD:${NC}"
echo "1. Settings → Variables"
echo "2. Añadir cada variable con valor exacto"
echo "3. Añadir servicio PostgreSQL (DATABASE_URL automático)"
echo "4. Deploy"
echo ""
echo -e "${GREEN}✅ Ahora ejecuta: ./scripts/deploy-npx.sh${NC}"
echo ""
echo -e "${BLUE}🔧 También disponible: ./scripts/setup-railway-env.sh${NC}"