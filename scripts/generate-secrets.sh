#!/bin/bash
# scripts/generate-secrets.sh
# Run this to generate secure random credentials for production

set -e

echo "🔐 CloudSnap Production Secrets Generator"
echo "==========================================="
echo ""

# Function to generate random base64 string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d '\n'
}

# Function to generate random alphanumeric
generate_alphanumeric() {
    local length=${1:-32}
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$length"
}

echo "📝 Generating secrets (save these securely)..."
echo ""

JWT_SECRET=$(generate_secret 32)
echo "JWT_SECRET=$JWT_SECRET"

POSTGRES_PASSWORD=$(generate_alphanumeric 24)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"

REDIS_PASSWORD=$(generate_alphanumeric 24)
echo "REDIS_PASSWORD=$REDIS_PASSWORD"

MINIO_PASSWORD=$(generate_alphanumeric 24)
echo "MINIO_ROOT_PASSWORD=$MINIO_PASSWORD"

echo ""
echo "🔑 Generating SSH deployment key..."
echo ""

# Generate SSH key for deployment (if not exists)
if [ ! -f ~/.ssh/cloudsnap_deploy ]; then
    ssh-keygen -t ed25519 -f ~/.ssh/cloudsnap_deploy -N "" -C "cloudsnap-deploy"
    echo "✅ SSH key generated: ~/.ssh/cloudsnap_deploy"
else
    echo "⚠️  SSH key already exists: ~/.ssh/cloudsnap_deploy"
fi

echo ""
echo "📋 Next steps:"
echo "1. Copy the secrets above to a secure location (password manager)"
echo "2. Add DEPLOY_KEY to GitHub secrets:"
echo "   cat ~/.ssh/cloudsnap_deploy | base64 -w 0"
echo "3. Add DEPLOY_HOST and DEPLOY_USER to GitHub secrets"
echo "4. Copy public key to production server:"
echo "   cat ~/.ssh/cloudsnap_deploy.pub"
