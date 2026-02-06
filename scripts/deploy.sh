#!/bin/bash

# Railway Deployment Script for Plaet API
# This script automates deployment to Railway with production best practices

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Railway Deployment for Plaet API${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not found. Please install it with: npm install -g @railway/cli${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js${NC}"
        exit 1
    fi
    
    if [[ ! -f "package.json" ]]; then
        echo -e "${RED}❌ package.json not found. Please run this from the project root.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
}

# Build the application
build_app() {
    echo -e "${BLUE}🔨 Building application...${NC}"
    
    # Run build command
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Build completed successfully${NC}"
}

# Deploy to Railway
deploy_to_railway() {
    echo -e "${BLUE}🚂 Deploying to Railway...${NC}"
    
    # Check if logged in to Railway
    if ! railway whoami &> /dev/null; then
        echo -e "${YELLOW}⚠️  Not logged in to Railway. Please run: railway login${NC}"
        railway login
    fi
    
    # Get current project info
    PROJECT_NAME=$(railway project name 2>/dev/null || echo "plaet-api")
    
    # Check if project exists, create if not
    if railway project list | grep -q "$PROJECT_NAME"; then
        echo -e "${BLUE}📋 Using existing project: $PROJECT_NAME${NC}"
    else
        echo -e "${YELLOW}📋 Creating new project: $PROJECT_NAME${NC}"
        railway create "$PROJECT_NAME"
        railway link
    fi
    
    # Deploy with Railway CLI
    echo -e "${BLUE}🚢 Deploying service...${NC}"
    railway up
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}🎉 Deployment successful!${NC}"
        
        # Get deployment URLs
        echo -e "${BLUE}📊 Getting deployment information...${NC}"
        RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")
        RAILWAY_URL="https://$RAILWAY_DOMAIN"
        
        echo -e "${GREEN}🌐 API deployed to: $RAILWAY_URL${NC}"
        echo -e "${GREEN}📖 Documentation available at: $RAILWAY_URL/api/v1/docs${NC}"
        
        # Save deployment info
        echo "$RAILWAY_URL" > .last_deployment
        
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
}

# Run health check
health_check() {
    echo -e "${BLUE}🏥 Running health check...${NC}"
    
    RAILWAY_URL=$(cat .last_deployment 2>/dev/null || echo "")
    if [ -n "$RAILWAY_URL" ]; then
        echo -e "${RED}❌ No deployment URL found${NC}"
        return 1
    fi
    
    # Wait a few seconds for service to start
    sleep 10
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/health" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_STATUS)${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed (HTTP $HTTP_STATUS)${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    PLAET API RAILWAY DEPLOYMENT${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    check_prerequisites
    build_app
    deploy_to_railway
    health_check
    
    echo ""
    echo -e "${GREEN}🎊 Deployment process completed!${NC}"
    echo -e "${BLUE}Visit your API at: $(cat .last_deployment 2>/dev/null || echo 'Check Railway dashboard')${NC}"
}

# Run main function
main "$@"