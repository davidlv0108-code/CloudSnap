#!/bin/bash

# ============================================================
# CloudSnap 本地快速启动脚本
# ============================================================

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     🚀 CloudSnap 本地启动助手                     ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查环境
echo "📋 检查环境..."
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "   请访问: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js ${NC}$(node --version)"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm ${NC}$(npm --version)"

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git 未安装${NC}"
    echo "   请访问: https://git-scm.com/"
    exit 1
fi

echo -e "${GREEN}✅ Git ${NC}$(git --version | cut -d' ' -f3)"

echo ""
echo "════════════════════════════════════════════════════"
echo ""

# 菜单
echo "请选择启动方式："
echo ""
echo "  1️⃣  一键启动所有服务（推荐）"
echo "  2️⃣  仅启动后端"
echo "  3️⃣  仅启动前端"
echo "  4️⃣  仅启动移动端"
echo "  5️⃣  清理和重置"
echo "  6️⃣  查看使用说明"
echo ""
read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🚀 启动所有服务...${NC}"
        echo ""
        
        # 启动后端
        echo -e "${YELLOW}📌 终端 1: 启动后端${NC}"
        echo "命令: cd CloudSnap-Backend && npm install && npm run dev"
        echo ""
        
        # 启动前端
        echo -e "${YELLOW}📌 终端 2: 启动前端${NC}"
        echo "命令: cd CloudSnap-Frontend && npm install && npm start"
        echo ""
        
        # 启动移动端
        echo -e "${YELLOW}📌 终端 3: 启动移动端${NC}"
        echo "命令: cd CloudSnap-Mobile && npm install expo-camera && expo start"
        echo ""
        
        echo -e "${GREEN}📋 接下来的步骤：${NC}"
        echo ""
        echo "1. 打开 3 个新的终端窗口"
        echo "2. 在每个终端中分别运行上面的命令"
        echo "3. 等待所有服务启动完成"
        echo "4. 访问应用："
        echo "   - 后端 API: http://localhost:3000/health"
        echo "   - 前端 Web: http://localhost:3001"
        echo "   - 移动端: 扫描 Expo 二维码"
        echo ""
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}🔙 启动后端...${NC}"
        echo ""
        cd CloudSnap-Backend
        
        if [ ! -d "node_modules" ]; then
            echo "📦 安装依赖..."
            npm install
        fi
        
        echo ""
        echo -e "${GREEN}✅ 后端启动${NC}"
        npm run dev
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}🌐 启动前端...${NC}"
        echo ""
        cd CloudSnap-Frontend
        
        if [ ! -d "node_modules" ]; then
            echo "📦 安装依赖..."
            npm install
        fi
        
        echo ""
        echo -e "${GREEN}✅ 前端启动${NC}"
        npm start
        ;;
        
    4)
        echo ""
        echo -e "${BLUE}📱 启动移动端...${NC}"
        echo ""
        cd CloudSnap-Mobile
        
        if [ ! -d "node_modules" ]; then
            echo "📦 安装依赖..."
            npm install
            npm install expo-camera expo-image-manipulator
        fi
        
        echo ""
        echo -e "${GREEN}✅ 移动端启动${NC}"
        expo start
        ;;
        
    5)
        echo ""
        echo -e "${YELLOW}⚠️  清理和重置${NC}"
        echo ""
        
        read -p "确定要清理吗？(y/n): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo "🗑️  删除后端 node_modules..."
            rm -rf CloudSnap-Backend/node_modules
            rm -f CloudSnap-Backend/package-lock.json
            
            echo "🗑️  删除前端 node_modules..."
            rm -rf CloudSnap-Frontend/node_modules
            rm -f CloudSnap-Frontend/package-lock.json
            
            echo "🗑️  删除移动端 node_modules..."
            rm -rf CloudSnap-Mobile/node_modules
            rm -f CloudSnap-Mobile/package-lock.json
            
            echo "🗑️  清空上传文件..."
            rm -rf CloudSnap-Backend/uploads/*
            
            echo "🗑️  删除数据库..."
            rm -f CloudSnap-Backend/prisma/dev.db
            
            echo ""
            echo -e "${GREEN}✅ 清理完成${NC}"
        fi
        ;;
        
    6)
        echo ""
        echo "📖 使用说明："
        echo ""
        echo "✅ 确保已安装："
        echo "   - Node.js 16+ (https://nodejs.org/)"
        echo "   - npm 8+ (随 Node.js 安装)"
        echo "   - Git (https://git-scm.com/)"
        echo ""
        echo "📱 推荐的启动步骤："
        echo "   1. 选择选项 1（一键启动所有服务）"
        echo "   2. 打开 3 个终端窗口"
        echo "   3. 在每个窗口中运行给定的命令"
        echo "   4. 等待启动完成"
        echo "   5. 打开 http://localhost:3001 测试"
        echo ""
        echo "📊 测试地址："
        echo "   - 后端 API: http://localhost:3000"
        echo "   - 前端 Web: http://localhost:3001"
        echo "   - API 健康检查: http://localhost:3000/health"
        echo "   - 数据库可视化: http://localhost:5555 (启动时)"
        echo ""
        echo "🔧 常用命令："
        echo "   npm run dev          - 开发模式启动"
        echo "   npm test             - 运行测试"
        echo "   npm start            - 生产模式启动"
        echo ""
        echo "💡 如需详细信息，查看 LOCAL_TESTING_GUIDE.md"
        echo ""
        ;;
        
    *)
        echo ""
        echo -e "${RED}❌ 无效选项${NC}"
        echo ""
        ;;
esac

echo ""
