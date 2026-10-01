// ============================================================
// 推送通知路由
// ============================================================

const router = require('express').Router();
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');
const pushService = require('../services/push');

router.use(authMiddleware);

// ===== 注册推送 Token =====
router.post('/register', async (req, res, next) => {
  try {
    const { token, platform } = req.body;

    const data = platform === 'ios' ? { apnsToken: token } : { fcmToken: token };

    await prisma.user.update({
      where: { id: req.user.userId },
      data,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ===== 发送测试通知 =====
router.post('/test', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const token = user.fcmToken || user.apnsToken;

    if (!token) {
      return res.status(400).json({ error: '未注册推送Token' });
    }

    await pushService.sendPushNotification(
      token,
      'CloudSnap 测试通知',
      '如果你看到了这条消息，说明推送配置成功！',
      { type: 'test' }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
