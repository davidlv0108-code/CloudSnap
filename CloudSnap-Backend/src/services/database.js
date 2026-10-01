// ============================================================
// 数据库服务 - Prisma
// ============================================================

const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient({
  log: config.server.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

async function initDatabase() {
  if (!config.database.url) {
    console.warn('[数据库] ⚠️ DATABASE_URL 未配置，数据库功能不可用');
    return;
  }
  await prisma.$connect();
}

module.exports = { prisma, initDatabase };
