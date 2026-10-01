#!/bin/bash
# scripts/verify-deployment.sh
# Run this after deployment to verify all services are healthy

set -e

echo "🔍 CloudSnap Deployment Verification"
echo "===================================="
echo ""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

FAILED=0

# ========== DOCKER SERVICES CHECK ==========
echo "📦 Checking Docker services..."
echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠️  docker-compose.yml not found in current directory${NC}"
    echo "   Run this script from /home/deploy/cloudsnap directory"
    exit 1
fi

# Check Docker daemon
docker ps > /dev/null 2>&1
check_status $? "Docker daemon running" || ((FAILED++))

# Check if services are running
echo ""
echo "🟢 Verifying running containers..."

services=("db" "redis" "minio" "backend")
for service in "${services[@]}"; do
    status=$(docker compose ps $service --format json 2>/dev/null | grep '"State":"running"' | wc -l)
    if [ $status -eq 1 ]; then
        check_status 0 "Service '$service' is running"
    else
        check_status 1 "Service '$service' is NOT running"
        ((FAILED++))
    fi
done

# ========== HEALTH CHECKS ==========
echo ""
echo "💓 Running health checks..."
echo ""

# PostgreSQL
echo -n "Testing PostgreSQL... "
if docker compose exec -T db pg_isready -U cloudsnap -d cloudsnap > /dev/null 2>&1; then
    check_status 0 "PostgreSQL health check"
else
    check_status 1 "PostgreSQL health check FAILED"
    ((FAILED++))
fi

# Redis
echo -n "Testing Redis... "
if docker compose exec -T redis redis-cli ping | grep -q "PONG"; then
    check_status 0 "Redis health check"
else
    check_status 1 "Redis health check FAILED"
    ((FAILED++))
fi

# MinIO
echo -n "Testing MinIO... "
if curl -f -s http://localhost:9000/minio/health/live > /dev/null; then
    check_status 0 "MinIO health check"
else
    check_status 1 "MinIO health check FAILED"
    ((FAILED++))
fi

# Backend API
echo -n "Testing Backend API... "
if curl -f -s http://localhost:3000/health > /dev/null; then
    check_status 0 "Backend health check"
else
    check_status 1 "Backend health check FAILED"
    ((FAILED++))
fi

# ========== DATABASE TESTS ==========
echo ""
echo "📊 Testing database connectivity..."
echo ""

# Test SQL query
echo -n "Testing SQL query... "
if docker compose exec -T db psql -U cloudsnap -d cloudsnap -c "SELECT 1;" > /dev/null 2>&1; then
    check_status 0 "Database query execution"
else
    check_status 1 "Database query execution FAILED"
    ((FAILED++))
fi

# Check tables exist
echo -n "Checking database tables... "
table_count=$(docker compose exec -T db psql -U cloudsnap -d cloudsnap -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null)
if [ "$table_count" -gt 0 ]; then
    check_status 0 "Database tables exist ($table_count tables)"
else
    check_status 1 "No tables found in database"
    ((FAILED++))
fi

# ========== STORAGE TESTS ==========
echo ""
echo "💾 Testing storage functionality..."
echo ""

# Check MinIO bucket
echo -n "Checking MinIO bucket... "
if docker compose exec -T minio mc ls minio/cloudsnap > /dev/null 2>&1; then
    check_status 0 "MinIO bucket 'cloudsnap' exists"
else
    check_status 1 "MinIO bucket 'cloudsnap' NOT found"
    ((FAILED++))
fi

# Test file upload
echo -n "Testing file upload... "
test_file=$(mktemp)
echo "test" > "$test_file"
if curl -f -s -F "file=@$test_file" http://localhost:3000/api/test/storage > /dev/null 2>&1; then
    check_status 0 "File upload test"
    rm -f "$test_file"
else
    check_status 1 "File upload test FAILED"
    rm -f "$test_file"
    ((FAILED++))
fi

# ========== API ENDPOINT TESTS ==========
echo ""
echo "🔗 Testing API endpoints..."
echo ""

# Test storage endpoint
echo -n "Testing /api/test/storage... "
storage_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/test/storage)
if [ "$storage_response" -eq 200 ] || [ "$storage_response" -eq 201 ]; then
    check_status 0 "/api/test/storage (HTTP $storage_response)"
else
    check_status 1 "/api/test/storage (HTTP $storage_response)"
    ((FAILED++))
fi

# Test Redis endpoint
echo -n "Testing /api/test/redis... "
redis_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/test/redis)
if [ "$redis_response" -eq 200 ] || [ "$redis_response" -eq 201 ]; then
    check_status 0 "/api/test/redis (HTTP $redis_response)"
else
    check_status 1 "/api/test/redis (HTTP $redis_response)"
    ((FAILED++))
fi

# Test Firebase endpoint
echo -n "Testing /api/test/firebase... "
firebase_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/test/firebase)
if [ "$firebase_response" -eq 200 ] || [ "$firebase_response" -eq 201 ]; then
    check_status 0 "/api/test/firebase (HTTP $firebase_response)"
else
    check_status 1 "/api/test/firebase (HTTP $firebase_response) - likely not configured (OK)"
fi

# ========== RESOURCE USAGE ==========
echo ""
echo "📈 Resource usage..."
echo ""

echo "Container resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}"

# ========== DISK SPACE ==========
echo ""
echo "💿 Disk space..."
echo ""

docker system df

# ========== LOG REVIEW ==========
echo ""
echo "📜 Recent logs..."
echo ""

echo "Backend logs (last 20 lines):"
docker compose logs --tail=20 backend | head -20

# ========== SUMMARY ==========
echo ""
echo "===================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "🎉 Your CloudSnap deployment is healthy and ready to use!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure your domain DNS to point to this server"
    echo "2. Setup SSL certificates with Let's Encrypt"
    echo "3. Test the API: curl http://localhost:3000/health"
    echo "4. Access MinIO console: http://localhost:9001"
    echo "5. Monitor logs: docker compose logs -f backend"
    exit 0
else
    echo -e "${RED}❌ $FAILED CHECK(S) FAILED${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check logs: docker compose logs <service>"
    echo "2. Verify .env file: cat .env"
    echo "3. Restart services: docker compose restart"
    echo "4. Check disk space: df -h"
    echo "5. Check memory: free -h"
    exit 1
fi
