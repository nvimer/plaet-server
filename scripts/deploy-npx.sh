#!/bin/bash

# Railway Deployment Script using npx
# Modified to use npx instead of global installation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Railway Deployment with npx${NC}"

# Function to run railway commands with npx
railway() {
    npx @railway/cli "$@"
}

# Check if we need to login
echo -e "${YELLOW}Checking Railway authentication...${NC}"

if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo -e "${BLUE}Please visit: https://railway.app/login${NC}"
    echo -e "${BLUE}After login, run the following command:${NC}"
    echo -e "${YELLOW}npx @railway/cli login${NC}"
    echo ""
    echo -e "${BLUE}Then run this script again:${NC}"
    echo -e "${YELLOW}./scripts/deploy-npx.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with Railway${NC}"

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed${NC}"

# Deploy to Railway
echo -e "${BLUE}🚂 Deploying to Railway...${NC}"
railway up

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    
    # Get deployment URLs
    echo -e "${BLUE}📊 Getting deployment information...${NC}"
    
    # Wait a moment for deployment to settle
    sleep 5
    
    # Try to get domain
    RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")
    
    if [ -n "$RAILWAY_DOMAIN" ]; then
        RAILWAY_URL="https://$RAILWAY_DOMAIN"
        echo -e "${GREEN}🌐 API deployed to: $RAILWAY_URL${NC}"
        echo -e "${GREEN}📖 Documentation: $RAILWAY_URL/api/v1/docs${NC}"
        
        # Health check
        echo -e "${BLUE}🏥 Running health check...${NC}"
        sleep 10
        
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/health" || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_STATUS)${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check failed (HTTP $HTTP_STATUS) - Service may still be starting${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️  Could not determine deployment URL${NC}"
        echo -e "${BLUE}Check Railway dashboard for details${NC}"
    fi
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎊 Deployment process completed!${NC}"
echo -e "${BLUE}✨ Your Plaet API is now live on Railway!${NC}"