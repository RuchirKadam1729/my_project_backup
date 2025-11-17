#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Judiciary System - Automated Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to extract tunnel URL
get_tunnel_url() {
    local service=$1
    local max_attempts=20
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service tunnel...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        URL=$(docker-compose logs $service 2>&1 | grep -oE 'https://[a-z0-9\-]+\.trycloudflare\.com' | tail -1)
        
        if [ ! -z "$URL" ]; then
            echo -e "${GREEN}✅ $service: $URL${NC}"
            echo "$URL"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Failed to get $service tunnel URL after $max_attempts attempts${NC}"
    return 1
}

# Step 1: Start all services
echo -e "${YELLOW}📦 Starting Docker services...${NC}"
docker-compose up -d

# Step 2: Wait for services to initialize
echo -e "${YELLOW}⏳ Waiting for services to initialize (15 seconds)...${NC}"
sleep 15

# Step 3: Get backend tunnel URL
BACKEND_URL=$(get_tunnel_url "tunnel-backend")
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to get backend tunnel URL. Check logs:${NC}"
    echo "  docker-compose logs tunnel-backend"
    exit 1
fi

# Step 4: Update frontend .env
echo ""
echo -e "${YELLOW}📝 Updating frontend/.env with backend URL...${NC}"
cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=$BACKEND_URL
WATCHPACK_POLLING=true
EOF
echo -e "${GREEN}✅ Updated frontend/.env${NC}"

# Step 5: Restart frontend with new configuration
echo ""
echo -e "${YELLOW}🔄 Restarting frontend with new configuration...${NC}"
docker-compose stop frontend
docker-compose up -d frontend

# Step 6: Wait for frontend to rebuild
echo -e "${YELLOW}⏳ Waiting for frontend to rebuild (30 seconds)...${NC}"
sleep 30

# Step 7: Get frontend tunnel URL
FRONTEND_URL=$(get_tunnel_url "tunnel-frontend")
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to get frontend tunnel URL. Check logs:${NC}"
    echo "  docker-compose logs tunnel-frontend"
    exit 1
fi

# Step 8: Verify all services are healthy
echo ""
echo -e "${YELLOW}🔍 Checking service health...${NC}"

# Check if backend is responding
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/" | grep -q "200\|404"; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend might not be ready yet${NC}"
fi

# Display final summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "   Backend API:  ${YELLOW}$BACKEND_URL${NC}"
echo -e "   Frontend App: ${YELLOW}$FRONTEND_URL${NC}"
echo ""
echo -e "${BLUE}👥 Share with others:${NC}"
echo -e "   ${GREEN}$FRONTEND_URL${NC}"
echo ""
echo -e "${BLUE}🔐 Demo Credentials:${NC}"
echo "   Root:   root / password"
echo "   Lawyer: lawyer@test.com / password"
echo "   Judge:  judge@test.com / password"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "   View logs:        docker-compose logs -f"
echo "   View frontend:    docker-compose logs -f frontend"
echo "   View backend:     docker-compose logs -f backend"
echo "   Stop services:    docker-compose down"
echo "   Restart:          ./deploy.sh"
echo ""
echo -e "${BLUE}💾 Save these URLs - they'll change if you restart!${NC}"
echo ""

# Save URLs to a file for reference
cat > .deployment-urls << EOF
# Generated: $(date)
BACKEND_URL=$BACKEND_URL
FRONTEND_URL=$FRONTEND_URL
EOF

echo -e "${GREEN}✅ URLs saved to .deployment-urls${NC}"
echo ""