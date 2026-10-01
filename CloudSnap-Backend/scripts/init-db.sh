#!/bin/bash

# ============================================================
# CloudSnap 后端数据库初始化脚本
# ============================================================

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🔧 CloudSnap 后端数据库初始化                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 进入后端目录
cd CloudSnap-Backend || exit 1

echo "📋 检查环境..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "✅ npm $(npm --version)"

echo ""
echo "📦 安装依赖..."
npm install

echo ""
echo "🔨 生成 Prisma 客户端..."
npx prisma generate

echo ""
echo "💾 初始化数据库..."
npx prisma db push

echo ""
echo "📊 启动 Prisma Studio（数据库可视化）..."
echo "   打开浏览器访问: http://localhost:5555"
echo ""
read -p "按 Enter 启动 Prisma Studio..."
npx prisma studio

echo ""
echo "✅ 数据库初始化完成！"
echo ""
