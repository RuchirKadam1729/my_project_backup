#!/bin/bash

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Stopping Judiciary System${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}🛑 Stopping all services...${NC}"
docker-compose down

echo ""
echo -e "${YELLOW}📝 Cleaning up...${NC}"

# Keep .deployment-urls for reference
if [ -f ".deployment-urls" ]; then
    echo -e "   Keeping .deployment-urls (URLs from last deployment)"
fi

echo ""
echo -e "${BLUE}✅ All services stopped${NC}"
echo ""
echo -e "To start again: ${YELLOW}./deploy.sh${NC}"
echo ""