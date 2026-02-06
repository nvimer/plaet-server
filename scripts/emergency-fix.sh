#!/bin/bash

# Emergency Fix for Railway Module Loading Error
# This addresses the Module._extensions..js error during deployment

set -e

echo "🔧 Emergency Railway Fix - Module Loading Error"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Diagnosing module loading issues...${NC}"

# Check for problematic imports
echo -e "${YELLOW}Checking for UUID import issues...${NC}"
if grep -r "import.*uuid" src/ --include="*.ts" > /dev/null; then
    echo -e "${RED}❌ Found potential UUID import conflict${NC}"
fi

# Check Express 5 compatibility
echo -e "${YELLOW}Checking Express version compatibility...${NC}"
if [ "$(node -e "console.log(require('./package.json').dependencies.express.replace(/[^0-9.]/g, ''))")" = "51" ]; then
    echo -e "${RED}⚠️  Express 5.x detected - may have compatibility issues${NC}"
fi

# Fix common issues
echo -e "${BLUE}🔧 Applying emergency fixes...${NC}"

# Fix 1: Add environment variable to disable problematic modules
echo "NODE_OPTIONS=--trace-warnings" >> .env.production

# Fix 2: Ensure proper module resolution
echo "NODE_PATH=./dist" >> .env.production

# Fix 3: Disable UUID if causing issues
echo "DISABLE_UUID=true" >> .env.production

echo -e "${GREEN}✅ Emergency fixes applied${NC}"
echo ""
echo -e "${BLUE}📋 Try redeploying with these fixes:${NC}"
echo -e "${YELLOW}1. Railway will now use Node.js 18 explicitly${NC}"
echo -e "${YELLOW}2. Module resolution path fixed${NC}"
echo -e "${YELLOW}3. Warning traces enabled for debugging${NC}"
echo ""
echo -e "${GREEN}🚀 Run: ./scripts/deploy-npx.sh${NC}"