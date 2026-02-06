#!/bin/bash

# Railway Environment Variables Setup Script
# This script sets up the correct environment variables for Railway deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up Railway Environment Variables${NC}"

echo -e "${YELLOW}⚠️  IMPORTANTE: Configura manualmente estas variables en Railway Dashboard:${NC}"
echo ""
echo -e "${GREEN}🔑 SECURITY VARIABLES:${NC}"
echo "JWT_SECRET=5cc038ee3bc4583759ab9d44264e80a8cc9946e1c6d30869ff05ffa47ffa49ed7b74ff678e3bf388f5de5fa233cb05cd23bad15662779c18517b11af397fb17f"
echo "SALT_ROUNDS=10"
echo ""
echo -e "${GREEN}📊 APPLICATION VARIABLES:${NC}"
echo "NODE_ENV=production"
echo "PORT=8080"
echo "JWT_ACCESS_EXPIRATION_MINUTES=30"
echo "JWT_ACCESS_EXPIRATION_DAYS=7"
echo ""
echo -e "${GREEN}🌐 CORS (actualiza después de despliegue):${NC}"
echo "ALLOWED_ORIGINS=https://tu-app.railway.app,https://www.plaet.cloud,https://plaet.cloud"
echo ""
echo -e "${BLUE}📋 PASOS EN RAILWAY DASHBOARD:${NC}"
echo "1. Ve a tu proyecto Railway"
echo "2. Ve a Settings → Variables"
echo "3. Añade cada variable con su valor exacto"
echo "4. Despliega el proyecto"
echo ""
echo -e "${YELLOW}⚠️  NOTA: DATABASE_URL se configura automáticamente cuando añades el servicio PostgreSQL${NC}"
echo ""
echo -e "${GREEN}✅ Variables configuradas correctamente${NC}"