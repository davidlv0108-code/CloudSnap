#!/bin/bash

# ============================================================
# CloudSnap 项目清理脚本 - 删除所有不必要的文档
# ============================================================

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🧹 CloudSnap 项目清理脚本                           ║"
echo "║   将删除所有不必要的文档文件                           ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 要删除的文件列表
files_to_delete=(
    "ALIYUN_DEPLOYMENT_GUIDE.md"
    "ALIYUN_QUICK_START.md"
    "CAMERA_FEATURE_COMPLETE.md"
    "CAMERA_INTEGRATION_GUIDE.md"
    "CAMERA_START_NOW.md"
    "CLOUDSNAP_COMPLETE_SYSTEM.md"
    "COMPLETE_DEPLOYMENT_GUIDE.md"
    "DEPLOYMENT.md"
    "DEPLOYMENT_CHECKLIST.md"
    "DEPLOYMENT_COMPLETE.md"
    "DEPLOYMENT_SUMMARY.md"
    "FINAL_DELIVERABLES.md"
    "FINAL_SUMMARY.md"
    "GITHUB_SECRETS_SETUP.md"
    "LOCAL_QUICK_START.md"
    "LOCAL_TESTING_GUIDE.md"
    "PROJECT_COMPLETION_SUMMARY.md"
    "QUICKSTART_30MIN.md"
    "README_DEPLOYMENT.md"
    "RUN_AND_TEST_NOW.md"
    "START_HERE.md"
    "SYSTEM_IMPLEMENTATION_GUIDE.md"
    "YOU_ARE_HERE.md"
    "QUICK_REFERENCE.sh"
)

echo "📋 要删除的文件数量: ${#files_to_delete[@]}"
echo ""
echo "将删除以下文件："
for file in "${files_to_delete[@]}"; do
    echo "  ❌ $file"
done
echo ""

# 确认
read -p "确定要删除这些文件吗？(y/n): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    echo ""
    echo "🗑️  开始删除..."
    
    deleted_count=0
    for file in "${files_to_delete[@]}"; do
        if [ -f "$file" ]; then
            rm -f "$file"
            echo "  ✅ 已删除: $file"
            ((deleted_count++))
        fi
    done
    
    echo ""
    echo "✅ 清理完成！"
    echo "   已删除 $deleted_count 个文件"
    echo ""
    echo "📁 保留的重要文件:"
    echo "   ✓ README.md (项目说明)"
    echo "   ✓ CloudSnap-Backend/ (后端代码)"
    echo "   ✓ CloudSnap-Frontend/ (前端代码)"
    echo "   ✓ CloudSnap-Mobile/ (移动端代码)"
    echo "   ✓ .github/ (GitHub Actions)"
    echo ""
    echo "🚀 下一步："
    echo "   git add ."
    echo "   git commit -m 'Clean: remove documentation files'"
    echo "   git push origin main"
    echo ""
else
    echo "❌ 取消了清理操作"
    echo ""
fi
