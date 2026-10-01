// ============================================================
// 支付路由 - Google Play Billing + Apple StoreKit
// ============================================================

const router = require('express').Router();
const config = require('../config');
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ===== 获取订阅方案 =====
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: '免费版',
        price: 0,
        storage: '2 GB',
        features: ['基础功能', '10位好友', '本地存储'],
      },
      {
        id: 'pro',
        name: '专业版',
        price: 12,
        priceYearly: 99,
        storage: '50 GB',
        features: ['AI智能分类', '云同步', '100位好友'],
        googleProductId: 'cloudsnap_pro_monthly',
        appleProductId: 'com.cloudsnap.pro.monthly',
      },
      {
        id: 'family',
        name: '家庭版',
        price: 25,
        priceYearly: 199,
        storage: '200 GB',
        features: ['6人共享', 'AI智能分类', '500位好友'],
        googleProductId: 'cloudsnap_family_monthly',
        appleProductId: 'com.cloudsnap.family.monthly',
      },
    ],
  });
});

// ===== 同步订阅状态 =====
router.post('/sync', async (req, res, next) => {
  try {
    const { plan, purchaseToken, productId, platform } = req.body;

    if (!config.business.plans[plan]) {
      return res.status(400).json({ error: '无效的订阅方案' });
    }

    // [待填写] 验证购买凭证
    // Google Play: 调用 Google Play Developer API 验证
    // Apple: 调用 App Store Server API 验证
    // 示例:
    // if (platform === 'android') {
    //   const isValid = await verifyGooglePurchase(purchaseToken, productId);
    // } else if (platform === 'ios') {
    //   const isValid = await verifyApplePurchase(purchaseToken, productId);
    // }

    // 创建订阅记录
    const subscription = await prisma.subscription.create({
      data: {
        userId: req.user.userId,
        plan,
        platform,
        productId,
        purchaseToken,
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 更新用户方案
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        plan,
        storageLimit: config.business.plans[plan].storage,
      },
    });

    res.json({ subscription, user });
  } catch (err) {
    next(err);
  }
});

// ===== 恢复购买 =====
router.post('/restore', async (req, res, next) => {
  try {
    const { platform, purchaseToken } = req.body;

    // [待填写] 验证并恢复订阅
    // 查询 Google Play / Apple 的订阅状态

    res.json({ message: '恢复购买功能待实现' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
