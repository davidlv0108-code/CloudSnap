// ============================================================
// CloudSnap 后端 - 中间件
// ============================================================

// middleware/auth.js - JWT 认证中间件
const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = {
  verifyToken: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: '令牌无效或已过期' });
    }
  },

  generateToken: (userId) => {
    return jwt.sign(
      { userId, iat: Math.floor(Date.now() / 1000) },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  },

  generateRefreshToken: (userId) => {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  },
};

// middleware/errorHandler.js - 错误处理
module.exports.errorHandler = (err, req, res, next) => {
  console.error('[错误]', err);

  // Prisma 错误
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: '资源未找到' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: '资源已存在' });
    }
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: '令牌无效' });
  }

  res.status(500).json({ error: '服务器内部错误' });
};

// middleware/logger.js - 请求日志
module.exports.requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
};
