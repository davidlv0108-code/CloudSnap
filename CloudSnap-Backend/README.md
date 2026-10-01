# CloudSnap-Backend

本项目为 CloudSnap 后端服务。此 README 包含本地开发、备份与生产迁移的基本步骤。

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 生成 Prisma client 并推送 schema（本地使用 SQLite 或设置 `DATABASE_URL` 指向 Postgres）

```bash
npx prisma generate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma
```

3. 启动

```bash
npm run dev
```

4. 健康检查

```bash
curl http://localhost:3000/health
```

## 备份

运行备份脚本会把 SQLite（若使用）与 uploads 目录打包到 `backups/`：

```bash
node scripts/backup.js
```

## 生产迁移要点

- 将 `DATABASE_URL` 设置为 PostgreSQL，并在生产机上运行 `npx prisma migrate deploy`。
- 配置 `storage.type` 为 `s3` 并填写 `storage.s3` 配置（accessKeyId/secretAccessKey/region/bucket/publicUrl）。
- 配置 `push.firebase`（service account）和 APNs 证书用于推送。
- 配置支付、短信、OAuth 等第三方服务的密钥和回调。
- 使用 HTTPS（证书或反向代理），并替换 `jwt.secret` 为强随机值。
- 配置备份策略与日志监控（例如 Sentry）。

## 打包、上传与自动部署脚本

项目提供了一个示例打包与部署脚本，适用于有 SSH 登录权限且目标机已安装 Docker 的情况：

- `.env.production.example`：示例生产环境变量文件（请复制为 `.env` 并填写真实值）。
- `scripts/deploy_and_test.sh`：上传 zip、在远端解压并执行 `docker-compose up --build -d`，并对 `/health` 做一次简单检测。

示例用法（本地执行）:

```bash
# 在项目根打包
zip -r cloudsnap-backend.zip CloudSnap-Backend

# 上传并在远端部署
./scripts/deploy_and_test.sh cloudsnap-backend.zip user@your-server:/home/user/
```

注意：脚本假定目标服务器已安装 `docker` 和 `docker-compose`，并且你具有 SSH 登录权限。运行脚本前请务必修改并上传 `.env`（或在远端手动创建），以保证数据库与存储配置正确。

## 验证外部服务（本地/远程）

项目提供了若干测试端点，用于验证外部服务连通性（在服务启动后访问）：

- `GET /api/test/redis` — 初始化 Redis（若 `REDIS_URL` 已配置），写入并读取一个临时键，返回连接状态。
- `GET /api/test/storage` — 将一个小文件写入当前配置的存储（`local` 或 `s3`/MinIO），并返回相对路径与可访问 URL。
- `GET /api/test/firebase` — 初始化 Firebase Admin SDK（如已配置 `push.firebase`），返回是否成功初始化。

示例（在本机或远端执行）：

```bash
# Redis 测试
curl http://localhost:3000/api/test/redis

# 存储测试
curl http://localhost:3000/api/test/storage

# Firebase 初始化测试
curl http://localhost:3000/api/test/firebase
```

如果测试返回错误，把完整的响应和 `docker-compose logs backend`（或 `node src/app.js` 的 stderr）输出贴给我，我会继续帮你诊断并修复。

如果你希望，我可以继续：
- 将后端打包为 Docker 镜像并提供 `docker-compose` 示例；
- scaffold 一个移动客户端（React Native）并实现基本集成；
- 编写生产部署脚本（systemd / Docker / Kubernetes）。
