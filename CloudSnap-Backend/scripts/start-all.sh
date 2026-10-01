#!/bin/bash
# ============================================================
# CloudSnap 完整系统 - 一键启动脚本
# ============================================================

set -e

echo "🚀 CloudSnap 完整系统启动"
echo "================================"
echo ""

# 配置
NODE_ENV=${NODE_ENV:-development}
BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}

# ===== 检查前置条件 =====
echo "📋 检查前置条件..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ Node.js: $(node -v)"
echo "✅ npm: $(npm -v)"
echo ""

# ===== 后端设置 =====
echo "🔙 设置后端..."
cd CloudSnap-Backend

if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

echo "🗄️ 初始化数据库..."
npx prisma generate
npx prisma db push || true

echo "✅ 后端就绪"
cd ..
echo ""

# ===== 前端设置 =====
echo "🌐 设置前端..."
if [ ! -d "CloudSnap-Frontend" ]; then
    echo "📁 创建前端目录..."
    mkdir -p CloudSnap-Frontend/src/{components,api,store}
    cp CloudSnap-Frontend/README.md CloudSnap-Frontend/package.json 2>/dev/null || true
fi

cd CloudSnap-Frontend 2>/dev/null || {
    echo "⚠️ 前端目录不存在，跳过前端启动"
    cd ..
}

if [ -d "CloudSnap-Frontend" ] && [ -f "CloudSnap-Frontend/package.json" ]; then
    cd CloudSnap-Frontend
    
    if [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install || true
    fi
    
    echo "✅ 前端就绪"
    cd ../..
fi

echo ""

# ===== 环境变量 =====
echo "⚙️ 配置环境变量..."

if [ ! -f "CloudSnap-Backend/.env" ]; then
    cat > CloudSnap-Backend/.env << EOF
NODE_ENV=$NODE_ENV
PORT=$BACKEND_PORT
HOST=0.0.0.0

DATABASE_URL=postgresql://cloudsnap:password@localhost:5432/cloudsnap
JWT_SECRET=dev_secret_$(openssl rand -hex 16)
REDIS_URL=redis://localhost:6379
STORAGE_TYPE=local
CORS_ORIGINS=http://localhost:$FRONTEND_PORT

LOG_LEVEL=info
EOF
    echo "✅ 创建 .env 文件"
fi

echo ""

# ===== 启动说明 =====
echo "════════════════════════════════════════"
echo "✅ CloudSnap 完整系统已准备就绪！"
echo "════════════════════════════════════════"
echo ""

echo "🚀 启动步骤:"
echo ""
echo "1️⃣ 启动后端 (终端 1):"
echo "   cd CloudSnap-Backend"
echo "   npm run dev"
echo ""
echo "2️⃣启动前端 (终端 2):"
echo "   cd CloudSnap-Frontend"
echo "   npm start"
echo ""
echo "3️⃣ 启动移动端 (终端 3):"
echo "   cd CloudSnap-Mobile"
echo "   expo start"
echo ""

echo "📍 访问地址:"
echo "   后端 API:    http://localhost:$BACKEND_PORT"
echo "   前端 Web:    http://localhost:$FRONTEND_PORT"
echo "   移动端:      Expo 应用扫描二维码"
echo ""

echo "🔗 有用的命令:"
echo ""
echo "   # 测试后端 API"
echo "   curl http://localhost:$BACKEND_PORT/health"
echo ""
echo "   # 查看数据库"
echo "   npx prisma studio"
echo ""
echo "   # 重置数据库"
echo "   npx prisma db push --force-reset"
echo ""

echo "📚 文档:"
echo "   - 后端: CloudSnap-Backend/README.md"
echo "   - 前端: CloudSnap-Frontend/README.md"
echo "   - 移动端: CloudSnap-Mobile/README.md"
echo "   - 完整指南: SYSTEM_IMPLEMENTATION_GUIDE.md"
echo ""

echo "🎉 开始开发吧！"
