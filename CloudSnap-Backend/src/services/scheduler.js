// ============================================================
// 定时任务服务
// ============================================================

const cron = require('node-cron');
const { prisma } = require('./database');
const storageService = require('./storage');
const config = require('../config');

// ===== 启动定时任务 =====
function startScheduledTasks() {
  // 每小时清理过期照片
  cron.schedule('0 * * * *', cleanupExpiredPhotos);
  console.log('[定时] 已启动: 清理过期照片（每小时）');

  // 每天9点发送过期提醒
  cron.schedule('0 9 * * *', sendExpiryReminders);
  console.log('[定时] 已启动: 发送过期提醒（每天9点）');

  // 每天凌晨2点清理过期好友请求
  cron.schedule('0 2 * * *', cleanupExpiredFriendRequests);
  console.log('[定时] 已启动: 清理过期好友请求（每天2点）');
}

// ===== 清理过期照片 =====
async function cleanupExpiredPhotos() {
  if (!config.database.url) return;

  try {
    const expired = await prisma.photo.findMany({
      where: { expiresAt: { lt: new Date() }, deletedAt: null },
      take: 100,
    });

    for (const photo of expired) {
      await storageService.deletePhoto(photo);
      await prisma.photo.update({
        where: { id: photo.id },
        data: { deletedAt: new Date() },
      });
      await prisma.user.update({
        where: { id: photo.userId },
        data: { storageUsed: { decrement: photo.size } },
      });
    }

    if (expired.length > 0) {
      console.log(`[定时] 清理了 ${expired.length} 张过期照片`);
    }
  } catch (err) {
    console.error('[定时] 清理过期照片失败:', err.message);
  }
}

// ===== 发送过期提醒 =====
async function sendExpiryReminders() {
  // [待填写] 实现过期提醒推送
}

// ===== 清理过期好友请求 =====
async function cleanupExpiredFriendRequests() {
  if (!config.database.url) return;

  try {
    const expiryDate = new Date(Date.now() - config.business.friends.requestExpiryDays * 24 * 60 * 60 * 1000);
    await prisma.friendship.deleteMany({
      where: { status: 'PENDING', createdAt: { lt: expiryDate } },
    });
  } catch (err) {
    console.error('[定时] 清理好友请求失败:', err.message);
  }
}

module.exports = { startScheduledTasks, cleanupExpiredPhotos };
