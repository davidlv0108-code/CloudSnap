// ============================================================
// 错误处理中间件
// ============================================================

function errorHandler(err, req, res, next) {
  console.error('[错误]', err);

  // Multer 错误
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件大小超过限制（最大20MB）' });
    }
    return res.status(400).json({ error: err.message });
  }

  // Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: '数据已存在' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: '记录不存在' });
    }
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: '无效的认证令牌' });
  }

  // 默认错误
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    code: err.code,
  });
}

module.exports = { errorHandler };
