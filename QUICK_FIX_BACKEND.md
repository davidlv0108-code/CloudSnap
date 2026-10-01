# 🚀 快速修复 - 后端数据库连接问题

## ❌ 问题

```
PrismaClientInitializationError: 
错误：找不到环境变量: DATABASE_URL
```

## ✅ 快速修复（3 步）

### 第 1 步：更新 .env 文件

打开 `CloudSnap-Backend/.env`，确保第一行是：

```env
NODE_ENV=development
DATABASE_URL=file:./prisma/dev.db
```

### 第 2 步：初始化数据库

```bash
cd CloudSnap-Backend

# 生成 Prisma
npx prisma generate

# 初始化数据库
npx prisma db push
```

### 第 3 步：启动后端

```bash
npm run dev

# 应该看到: ✅ 后端已启动
```

---

## 🧪 验证

```bash
# 测试后端是否运行
curl http://localhost:3000/health

# 应该返回
# {"status":"ok",...}
```

---

## ✅ 完成！

现在可以继续部署了。

