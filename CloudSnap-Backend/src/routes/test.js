const router = require('express').Router();
const storageService = require('../services/storage');
const { initFirebase, isInitialized } = require('../services/firebase');
const redis = require('../services/redis');

// 简单的 Redis 测试
router.get('/redis', async (req, res, next) => {
  try {
    await redis.initRedis();
    const key = `test:${Date.now()}`;
    await redis.set(key, 'ok', 10);
    const val = await redis.get(key);
    res.json({ ok: true, key, value: val, connected: redis.isConnected() });
  } catch (err) {
    next(err);
  }
});

// 存储测试（保存一个小文件到存储，根据 storage.type）
router.get('/storage', async (req, res, next) => {
  try {
    const buf = Buffer.from('cloudsnap-test-' + Date.now());
    const userId = 'system_test_user';
    const filename = `test-${Date.now()}.bin`;
    const relative = await storageService.savePhoto(buf, userId, filename);
    const url = storageService.getFileUrl(relative);
    res.json({ ok: true, relative, url });
  } catch (err) {
    next(err);
  }
});

// Firebase 初始化测试（不发送推送，只初始化并返回状态）
router.get('/firebase', async (req, res, next) => {
  try {
    await initFirebase();
    res.json({ ok: true, initialized: isInitialized() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
