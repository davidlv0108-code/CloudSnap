#!/bin/bash
# scripts/setup-server.sh
# Run this on production server to bootstrap Docker, users, and directories

set -e

echo "🚀 CloudSnap Production Server Setup"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ This script must be run as root (use: sudo bash setup-server.sh)"
   exit 1
fi

# ========== UPDATE SYSTEM ==========
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# ========== INSTALL DOCKER ==========
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    echo "✅ Docker installed"
else
    echo "⚠️  Docker already installed"
fi

# ========== INSTALL DOCKER COMPOSE ==========
if ! docker compose version &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "⚠️  Docker Compose already installed"
fi

# ========== INSTALL DEPENDENCIES ==========
echo "📚 Installing dependencies..."
apt-get install -y \
    curl \
    wget \
    git \
    jq \
    postgresql-client \
    redis-tools \
    certbot \
    python3-certbot-nginx

# ========== CREATE DEPLOY USER ==========
echo "👤 Setting up deploy user..."
if ! id -u deploy &> /dev/null; then
    useradd -m -s /bin/bash deploy
    echo "✅ User 'deploy' created"
else
    echo "⚠️  User 'deploy' already exists"
fi

# ========== ADD DOCKER PERMISSIONS ==========
usermod -aG docker deploy

# ========== CREATE APP DIRECTORY ==========
echo "📁 Creating application directories..."
mkdir -p /home/deploy/cloudsnap/{certs,logs/nginx,backups}
mkdir -p /home/deploy/cloudsnap/db_data
mkdir -p /home/deploy/cloudsnap/minio_data
mkdir -p /home/deploy/cloudsnap/redis_data

# Set permissions
chown -R deploy:deploy /home/deploy/cloudsnap
chmod 755 /home/deploy/cloudsnap

# ========== SETUP SSH DIRECTORY ==========
echo "🔑 Setting up SSH..."
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# ========== DOCKER DAEMON CONFIG ==========
echo "⚙️  Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "experimental": false,
  "metrics-addr": "127.0.0.1:9323"
}
EOF

# Restart Docker
systemctl restart docker

# ========== FIREWALL SETUP ==========
echo "🔥 Setting up firewall (ufw)..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    echo "✅ Firewall configured"
fi

# ========== CREATE CRON BACKUP ==========
echo "⏰ Setting up automated backups..."
cat > /home/deploy/cloudsnap/backup.sh << 'BACKUP_SCRIPT'
#!/bin/bash
# Backup script for CloudSnap

BACKUP_DIR="/home/deploy/cloudsnap/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_BACKUPS=7

mkdir -p $BACKUP_DIR

# Backup database
docker compose -f /home/deploy/cloudsnap/docker-compose.yml exec -T db pg_dump -U cloudsnap -d cloudsnap | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Backup MinIO
docker compose -f /home/deploy/cloudsnap/docker-compose.yml exec minio mc mirror minio/cloudsnap $BACKUP_DIR/minio_$TIMESTAMP/ --quiet

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +$KEEP_BACKUPS -delete

echo "[$(date)] Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz" >> /var/log/cloudsnap-backup.log
BACKUP_SCRIPT

chmod +x /home/deploy/cloudsnap/backup.sh
chown deploy:deploy /home/deploy/cloudsnap/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -u deploy -l 2>/dev/null || true; echo "0 2 * * * /home/deploy/cloudsnap/backup.sh") | crontab -u deploy -

# ========== SYSTEM LIMITS ==========
echo "📊 Setting system limits..."
cat >> /etc/security/limits.conf << EOF
deploy soft nofile 65536
deploy hard nofile 65536
deploy soft nproc 65536
deploy hard nproc 65536
EOF

# ========== LOGROTATE CONFIG ==========
echo "📜 Setting up log rotation..."
cat > /etc/logrotate.d/cloudsnap << EOF
/home/deploy/cloudsnap/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 deploy deploy
  sharedscripts
}
/var/log/cloudsnap-backup.log {
  daily
  rotate 7
  compress
  delaycompress
}
EOF

# ========== SUMMARY ==========
echo ""
echo "✅ Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy SSH public key to /home/deploy/.ssh/authorized_keys"
echo "   Example: echo 'ssh-ed25519 AAAA...' >> /home/deploy/.ssh/authorized_keys"
echo ""
echo "2. Copy files to /home/deploy/cloudsnap/:"
echo "   - docker-compose.yml"
echo "   - .env (with real credentials)"
echo "   - nginx.conf (optional)"
echo ""
echo "3. SSH into as deploy user:"
echo "   ssh deploy@$HOSTNAME"
echo ""
echo "4. Start services:"
echo "   cd /home/deploy/cloudsnap"
echo "   docker compose pull"
echo "   docker compose up -d"
echo ""
echo "🔗 Deployed services will be at:"
echo "   - Backend: http://localhost:3000"
echo "   - MinIO: http://localhost:9000 (console: 9001)"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
