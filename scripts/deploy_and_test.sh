#!/bin/bash
# deploy_and_test.sh
# 用法: ./deploy_and_test.sh /path/to/cloudsnap-backend.zip user@server:/target/path

set -euo pipefail

ZIP_PATH=${1:-}
REMOTE=${2:-}

if [[ -z "$ZIP_PATH" || -z "$REMOTE" ]]; then
  echo "Usage: $0 /path/to/cloudsnap-backend.zip user@server:/target/path"
  exit 1
fi

# 解析远程路径
REMOTE_USER_HOST=$(echo "$REMOTE" | cut -d: -f1)
REMOTE_PATH=$(echo "$REMOTE" | cut -d: -f2-)
if [[ -z "$REMOTE_PATH" ]]; then REMOTE_PATH="~"; fi

# 上传 zip
echo "Uploading $ZIP_PATH to $REMOTE_USER_HOST:$REMOTE_PATH"
scp "$ZIP_PATH" "$REMOTE"

# 在远程解压并部署（依赖 docker/docker-compose）
ssh "$REMOTE_USER_HOST" bash -s <<'EOF'
set -euo pipefail
REMOTE_PATH="$REMOTE_PATH"
cd "$REMOTE_PATH"
mkdir -p cloudsnap-backend
unzip -o $(basename "$ZIP_PATH") -d cloudsnap-backend
cd cloudsnap-backend/CloudSnap-Backend
# 若需要，复制 .env 到 .env（请先在远程编辑 .env 或传入密钥）
# 启动（后台）
docker-compose up --build -d
sleep 5
# 检查服务
if docker-compose ps | grep -q backend; then
  echo "Containers started. Showing backend logs (last 100 lines):"
  docker-compose logs --no-color --tail=100 backend || true
fi
# 健康检查
curl -sS http://127.0.0.1:3000/health || echo "Health check failed"
EOF

echo "Done. Check remote logs above for details."
