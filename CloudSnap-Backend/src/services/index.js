// ============================================================
// 服务初始化入口
// ============================================================

const config = require('../config');

async function initServices() {
  // 初始化数据库
  const { initDatabase } = require('./database');
  await initDatabase();
  console.log('[服务] 数据库已连接');

  // 初始化 Redis（如果配置了）
  if (config.redis.url) {
    const { initRedis } = require('./redis');
    await initRedis();
    console.log('[服务] Redis已连接');
  }

  // 初始化 Firebase（如果配置了）
  if (config.push && config.push.firebase && config.push.firebase.projectId) {
    const { initFirebase } = require('./firebase');
    await initFirebase();
    console.log('[服务] Firebase已初始化');
  }

  // 启动定时任务
  const { startScheduledTasks } = require('./scheduler');
  startScheduledTasks();
  console.log('[服务] 定时任务已启动');
}

module.exports = { initServices };
