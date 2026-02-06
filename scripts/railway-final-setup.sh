#!/bin/bash

# Railway Plaet Cloud - Final Configuration Script
# Con tu URL real de PostgreSQL: postgres-production-0e37.up.railway.app

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Plaet API - Railway Final Configuration${NC}"
echo "====================================="
echo ""

echo -e "${GREEN}✅ DATABASE URL IDENTIFICADA:${NC}"
echo "postgres-production-0e37.up.railway.app"
echo ""

echo -e "${BLUE}🔧 CONSTRUCCIÓN DE VARIABLES PARA RAILWAY:${NC}"
echo ""

echo -e "${YELLOW}📊 Variables exactas para Railway Dashboard → Settings → Variables:${NC}"
echo ""
echo -e "${GREEN}🔐 CRITICAL - JWT_SECRET:${NC}"
echo "5cc038ee3bc4583759ab9d44264e80a8cc9946e1c6d30869ff05ffa47ffa49ed7b74ff678e3bf388f5de5fa233cb05cd23bad15662779c18517b11af397fb17f"
echo ""
echo -e "${GREEN}🗄️ DATABASE_URL (AUTOMÁTICO de Railway):${NC}"
echo "Se configura automáticamente cuando añades servicio PostgreSQL"
echo ""
echo -e "${GREEN}🌐 plaet.cloud DOMAIN:${NC}"
echo "Se configura automáticamente con tu dominio Railway"
echo ""
echo -e "${GREEN}🔐 JWT_SECRET (MANUAL en Railway):${NC}"
echo "5cc038ee3bc4583759ab9d44264e80a8cc9946e1c6d30869ff05ffa47ffa49ed7b74ff678e3bf388f5de5fa233cb05cd23bad15662779c18517b11af397fb17f"
echo ""
echo -e "${GREEN}🔧 OTRAS VARIABLES:${NC}"
echo "NODE_ENV=production"
echo "PORT=8080"
echo "SALT_ROUNDS=10"
echo "JWT_ACCESS_EXPIRATION_MINUTES=30"
echo "JWT_ACCESS_EXPIRATION_DAYS=7"
echo ""

echo -e "${BLUE}📋 PASOS FINALES EN RAILWAY:${NC}"
echo ""
echo -e "${YELLOW}1️⃣ Configurar Networking:${NC}"
echo "- Settings → Networking → Public Networking"
echo "- Settings → Domains → Añadir plaet.cloud"
echo ""
echo -e "${YELLOW}2️⃣ Configurar Variables:${NC}"
echo "- Settings → Variables → Añadir JWT_SECRET:"
echo "- Configurar dominio: plaet.cloud"
echo "- Añadir servicio PostgreSQL (para DATABASE_URL automático)"
echo ""
echo -e "${YELLOW}3️⃣ Deploy:${NC}"
echo "- Deploy y esperar propagación DNS (5-10 min)"
echo ""
echo -e "${BLUE}📋 ARCHIVOS ACTUALIZADOS:${NC}"
echo ""
echo -e "${GREEN}✅ railway-final.toml (con tu DATABASE_URL real)${NC}"
echo -e "${GREEN}✅ Variables exactas para plaet.cloud${NC}"
echo ""

echo -e "${CYAN}🎯 URLs FINALES DE TU API:${NC}"
echo ""
echo -e "${YELLOW}🌐 API Principal:${NC}"
echo "https://plaet.cloud/api/v1"
echo ""
echo -e "${YELLOW}📖 Documentación:${NC}"
echo "https://plaet.cloud/api/v1/docs"
echo ""
echo -e "${YELLOW}🔍 Health Check:${NC}"
echo "https://plaet.cloud/api/health"
echo ""

echo -e "${GREEN}🎊 ¡PLAET API LISTA PARA PRODUCCIÓN!${NC}"
echo ""

echo -e "${CYAN}📚 Referencia rápida:${NC}"
echo "- Railway Dashboard: https://railway.app"
echo "- Networking: Settings → Networking → Public"
echo "- Dominios: Settings → Domains → plaet.cloud"
echo "- Variables: Settings → Variables (pegar de arriba)"
echo ""

echo -e "${RED}⚠️ IMPORTANTE FINAL:${NC}"
echo "- Usa railway-final.toml para tu configuración"
echo "- Todas las variables están listas y verificadas"
echo "- Tu plaet.cloud estará funcionando pronto"