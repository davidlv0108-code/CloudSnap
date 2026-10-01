// ============================================================
// Redis 缓存服务
// ============================================================

const config = require('../config');

let client = null;

async function initRedis() {
  if (!config.redis || !config.redis.url) {
    console.warn('[Redis] ⚠️ REDIS_URL 未配置');
    return;
  }

  try {
    const { createClient } = require('redis');
    client = createClient({ url: config.redis.url });
    client.on('error', (err) => console.error('[Redis] Error:', err));
    await client.connect();
    console.log('[Redis] 已连接');
  } catch (err) {
    console.error('[Redis] 初始化失败:', err.message || err);
    client = null;
  }
}

async function get(key) {
  if (!client) return null;
  return await client.get(key);
}

async function set(key, value, ttl = 3600) {
  if (!client) return;
  await client.set(key, value, { EX: ttl });
}

async function del(key) {
  if (!client) return;
  await client.del(key);
}

module.exports = { initRedis, get, set, del };
module.exports.isConnected = () => !!(client && client.isOpen);
