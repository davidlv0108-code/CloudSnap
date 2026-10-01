#!/bin/bash
# scripts/quick-deploy.sh
# Quick start script for first-time deployment
# Usage: ./quick-deploy.sh <server-ip> <domain>

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <server-ip> [domain]"
    echo "Example: $0 203.0.113.5 api.cloudsnap.com"
    exit 1
fi

SERVER_IP="$1"
DOMAIN="${2:-$SERVER_IP}"
SSH_KEY="$HOME/.ssh/cloudsnap_deploy"
DEPLOY_USER="deploy"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🚀 CloudSnap Quick Deployment Script                ║"
echo "║   Initializing production server                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ========== STEP 1: VERIFY PREREQUISITES ==========
echo -e "${BLUE}[Step 1/6]${NC} Verifying prerequisites..."
echo ""

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    echo "   Run: bash scripts/generate-secrets.sh"
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ SSH not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅${NC} SSH key found"
echo -e "${GREEN}✅${NC} SSH client available"
echo ""

# ========== STEP 2: TEST SSH CONNECTION ==========
echo -e "${BLUE}[Step 2/6]${NC} Testing SSH connection to $SERVER_IP..."
echo ""

if ssh -i "$SSH_KEY" -o ConnectTimeout=5 "root@$SERVER_IP" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} SSH connection successful"
else
    echo -e "${RED}❌ Cannot SSH to root@$SERVER_IP${NC}"
    echo "   Check:"
    echo "   1. Server IP is correct"
    echo "   2. Port 22 is open"
    echo "   3. SSH key has correct permissions (600)"
    exit 1
fi
echo ""

# ========== STEP 3: RUN SERVER SETUP ==========
echo -e "${BLUE}[Step 3/6]${NC} Running server setup script..."
echo ""

ssh -i "$SSH_KEY" "root@$SERVER_IP" << 'EOF'
set -e

echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y > /dev/null 2>&1

echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
fi

echo "🐳 Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>/dev/null
    chmod +x /usr/local/bin/docker-compose
fi

echo "👤 Creating deploy user..."
if ! id -u deploy &> /dev/null; then
    useradd -m -s /bin/bash deploy
fi
usermod -aG docker deploy

echo "📁 Creating directories..."
mkdir -p /home/deploy/cloudsnap/{certs,logs/nginx,backups}
chown -R deploy:deploy /home/deploy/cloudsnap

echo "🔑 Setting up SSH..."
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

echo "✅ Server setup complete"
EOF

echo -e "${GREEN}✅${NC} Server setup complete"
echo ""

# ========== STEP 4: ADD SSH KEY ==========
echo -e "${BLUE}[Step 4/6]${NC} Adding deployment SSH key to authorized_keys..."
echo ""

SSH_PUB_KEY=$(cat "$SSH_KEY.pub")
ssh -i "$SSH_KEY" "root@$SERVER_IP" "echo '$SSH_PUB_KEY' >> /home/deploy/.ssh/authorized_keys"

echo -e "${GREEN}✅${NC} SSH key added"
echo ""

# ========== STEP 5: COPY APPLICATION FILES ==========
echo -e "${BLUE}[Step 5/6]${NC} Copying application files to server..."
echo ""

echo "  - Copying docker-compose.yml..."
scp -i "$SSH_KEY" -q CloudSnap-Backend/docker-compose.yml "$DEPLOY_USER@$SERVER_IP:/home/deploy/cloudsnap/"

echo "  - Copying Dockerfile..."
scp -i "$SSH_KEY" -q CloudSnap-Backend/Dockerfile "$DEPLOY_USER@$SERVER_IP:/home/deploy/cloudsnap/"

echo "  - Copying nginx.conf..."
scp -i "$SSH_KEY" -q CloudSnap-Backend/nginx.conf "$DEPLOY_USER@$SERVER_IP:/home/deploy/cloudsnap/"

echo "  - Copying package files..."
scp -i "$SSH_KEY" -q CloudSnap-Backend/package.json CloudSnap-Backend/package-lock.json "$DEPLOY_USER@$SERVER_IP:/home/deploy/cloudsnap/"

echo "  - Copying prisma schema..."
scp -i "$SSH_KEY" -qr CloudSnap-Backend/prisma "$DEPLOY_USER@$SERVER_IP:/home/deploy/cloudsnap/"

echo "  - Copying source code..."
scp -i "$SSH_KEY" -qr CloudSnap-Backend/src "$DEPLOY_USER@$SERVER_IP:/home/deploy/cloudsnap/"

echo -e "${GREEN}✅${NC} Files copied"
echo ""

# ========== STEP 6: INSTRUCTIONS FOR REMAINING SETUP ==========
echo -e "${BLUE}[Step 6/6]${NC} Final setup instructions..."
echo ""
echo -e "${YELLOW}⚠️  MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1️⃣  Create .env file on server:"
echo "   ssh -i ~/.ssh/cloudsnap_deploy $DEPLOY_USER@$SERVER_IP"
echo "   cd /home/deploy/cloudsnap"
echo "   nano .env"
echo ""
echo "   Paste content from: CloudSnap-Backend/.env.production"
echo "   Fill in these values with YOUR actual credentials:"
echo "   - POSTGRES_PASSWORD=..."
echo "   - REDIS_PASSWORD=..."
echo "   - MINIO_ROOT_PASSWORD=..."
echo "   - JWT_SECRET=..."
echo "   - CORS_ORIGIN=https://$DOMAIN"
echo ""
echo "   Save (Ctrl+O, Enter, Ctrl+X)"
echo "   Then: chmod 600 .env"
echo ""
echo "2️⃣  Start services:"
echo "   docker compose pull"
echo "   docker compose up -d"
echo "   sleep 30"
echo ""
echo "3️⃣  Initialize database:"
echo "   docker compose exec backend npx prisma db push"
echo ""
echo "4️⃣  Create MinIO bucket:"
echo "   docker compose exec minio mc mb minio/cloudsnap"
echo ""
echo "5️⃣  Verify deployment:"
echo "   bash scripts/verify-deployment.sh"
echo ""
echo "6️⃣  Setup GitHub Secrets:"
echo "   - Go to GitHub: Settings → Secrets and variables → Actions"
echo "   - Add DEPLOY_KEY: cat ~/.ssh/cloudsnap_deploy | base64 -w 0"
echo "   - Add DEPLOY_HOST: $SERVER_IP"
echo "   - Add DEPLOY_USER: $DEPLOY_USER"
echo ""
echo "7️⃣  Test first deployment:"
echo "   git add ."
echo "   git commit -m 'test: trigger CI/CD'"
echo "   git push origin main"
echo ""
echo -e "${GREEN}✅${NC} Quick setup complete!"
echo ""
echo "📋 For detailed instructions, see: COMPLETE_DEPLOYMENT_GUIDE.md"
echo ""
