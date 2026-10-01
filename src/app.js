// ============================================================
// CloudSnap 服务器入口
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { initServices } = require('./services');

const app = express();

// ===== 安全中间件 =====
app.use(helmet());
app.use(compression());

// ===== CORS =====
app.use(cors({
  origin: config.server.corsOrigins.length > 0 ? config.server.corsOrigins : true,
  credentials: true,
}));

// ===== 请求日志 =====
app.use(morgan('combined'));
app.use(requestLogger);

// ===== 限流 =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 100,                    // 每IP最多100个请求
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api/', limiter);

// ===== 上传限流 =====
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1分钟
  max: 10,               // 每分钟最多10次上传
  message: { error: '上传过于频繁，请稍后再试' },
});
app.use('/api/photos/upload', uploadLimiter);

// ===== 解析请求体 =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== 静态文件 =====
app.use('/uploads', express.static(config.storage.localPath));

// ===== 健康检查 =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  });
});

// ===== API 路由 =====
app.use('/api', routes);

// ===== 错误处理 =====
app.use(errorHandler);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// ===== 初始化并启动 =====
async function start() {
  try {
    // 初始化服务（数据库、Redis、Firebase等）
    await initServices();
    console.log('[启动] 服务初始化完成');

    // 启动服务器
    const PORT = config.server.port;
    const HOST = config.server.host || '0.0.0.0';

    app.listen(PORT, HOST, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║     CloudSnap 服务器已启动                       ║');
      console.log('╠══════════════════════════════════════════════════╣');
      console.log(`║  环境: ${config.server.nodeEnv.padEnd(42)}║`);
      console.log(`║  端口: ${String(PORT).padEnd(42)}║`);
      console.log(`║  数据库: ${config.database.url ? '已配置' : '⚠️ 未配置'.padEnd(38)}║`);
      console.log(`║  存储: ${config.storage.localPath ? '已配置' : '⚠️ 未配置'.padEnd(40)}║`);
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('[启动] 失败:', err);
    process.exit(1);
  }
}

// ===== 优雅关闭 =====
process.on('SIGTERM', () => {
  console.log('[关闭] 收到 SIGTERM 信号，正在关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[关闭] 收到 Ctrl+C，正在关闭...');
  process.exit(0);
});

// ===== 未捕获异常处理 =====
process.on('uncaughtException', (err) => {
  console.error('[异常] Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[异常] Unhandled Rejection:', err);
});

start();

module.exports = app;
