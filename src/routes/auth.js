// ============================================================
// 认证路由 - 注册/登录/社交登录
// ============================================================

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');

// ===== 注册 =====
router.post('/register', async (req, res, next) => {
  try {
    const { phone, email, password, name } = req.body;

    if (!password || !name) {
      return res.status(400).json({ error: '昵称和密码为必填项' });
    }
    if (!phone && !email) {
      return res.status(400).json({ error: '手机号或邮箱为必填项' });
    }

    // 检查是否已注册
    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
    });
    if (existing) {
      return res.status(409).json({ error: '该用户已注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone,
        email,
        password: hashedPassword,
        name,
        platform: req.body.platform || 'android',
        storageLimit: config.business.plans.free.storage,
      },
    });

    // 生成 Token
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        plan: user.plan,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== 登录 =====
router.post('/login', async (req, res, next) => {
  try {
    const { phone, email, password } = req.body;

    if (!password || (!phone && !email)) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    // 生成 Token
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        plan: user.plan,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== 微信登录 =====
// [待填写] 需要配置 config.oauth.wechat.appId 和 appSecret
router.post('/wechat', async (req, res, next) => {
  try {
    const { code } = req.body;
    // TODO: 实现微信登录
    // 1. 用 code 换取 access_token
    // 2. 获取用户信息
    // 3. 查找或创建用户
    res.status(501).json({ error: '微信登录尚未配置，请在 config/index.js 中填写微信配置' });
  } catch (err) {
    next(err);
  }
});

// ===== Google 登录 =====
// [待填写] 需要配置 config.oauth.google.clientId
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    // TODO: 实现 Google 登录
    // 1. 验证 idToken
    // 2. 获取用户信息
    // 3. 查找或创建用户
    res.status(501).json({ error: 'Google 登录尚未配置' });
  } catch (err) {
    next(err);
  }
});

// ===== Apple 登录 =====
// [待填写] 需要配置 config.oauth.apple
router.post('/apple', async (req, res, next) => {
  try {
    const { identityToken } = req.body;
    // TODO: 实现 Apple 登录
    res.status(501).json({ error: 'Apple 登录尚未配置' });
  } catch (err) {
    next(err);
  }
});

// ===== 发送短信验证码 =====
// [待填写] 需要配置 config.sms.aliyun 或 config.sms.tencent
router.post('/send-sms', async (req, res, next) => {
  try {
    const { phone } = req.body;
    // TODO: 实现短信发送
    res.status(501).json({ error: '短信服务尚未配置' });
  } catch (err) {
    next(err);
  }
});

// ===== 退出登录 =====
router.post('/logout', authMiddleware, async (req, res) => {
  res.json({ message: '已退出登录' });
});

// ===== 获取当前用户 =====
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
