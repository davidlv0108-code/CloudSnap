// ============================================================
// 请求日志中间件
// ============================================================

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    const log = `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms ${ip}`;
    if (statusCode >= 400) {
      console.error(log);
    } else {
      console.log(log);
    }
  });

  next();
}

module.exports = { requestLogger };
