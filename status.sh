#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  System Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if containers are running
check_service() {
    local service=$1
    if docker-compose ps $service | grep -q "Up"; then
        echo -e "${GREEN}✅ $service${NC}"
        return 0
    else
        echo -e "${RED}❌ $service (not running)${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📦 Docker Services:${NC}"
check_service mongodb
check_service backend
check_service frontend
check_service tunnel-backend
check_service tunnel-frontend

echo ""

# Get current URLs if available
BACKEND_URL=$(docker-compose logs tunnel-backend 2>&1 | grep -oE 'https://[a-z0-9\-]+\.trycloudflare\.com' | tail -1)
FRONTEND_URL=$(docker-compose logs tunnel-frontend 2>&1 | grep -oE 'https://[a-z0-9\-]+\.trycloudflare\.com' | tail -1)

if [ ! -z "$BACKEND_URL" ] && [ ! -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}🔗 Current URLs:${NC}"
    echo -e "   Backend:  ${GREEN}$BACKEND_URL${NC}"
    echo -e "   Frontend: ${GREEN}$FRONTEND_URL${NC}"
    echo ""
else
    echo -e "${RED}⚠️  Tunnel URLs not found. Services may still be starting.${NC}"
    echo ""
fi

# Check if saved URLs exist
if [ -f ".deployment-urls" ]; then
    echo -e "${YELLOW}💾 Last deployed URLs (from .deployment-urls):${NC}"
    cat .deployment-urls | grep -E "BACKEND_URL|FRONTEND_URL" | sed 's/^/   /'
    echo ""
fi

echo -e "${BLUE}📋 Quick Commands:${NC}"
echo "   Redeploy:      ./deploy.sh"
echo "   View logs:     docker-compose logs -f"
echo "   Stop all:      docker-compose down"
echo ""