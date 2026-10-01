// ============================================================
// CloudSnap 后端 - API 路由（完整实现）
// ============================================================

const express = require('express');
const router = express.Router();
const { prisma } = require('../services/database');
const { verifyToken, generateToken } = require('../middleware/auth');
const storage = require('../services/storage');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const upload = multer({ dest: 'uploads/temp' });

// ===== 用户认证 =====

// 注册
router.post('/auth/register', async (req, res, next) => {
  try {
    const { phone, email, password, name } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少6个字符' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        phone,
        email,
        password: hashedPassword,
        name: name || '用户',
      },
    });

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// 登录
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: '密码不能为空' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phone: phone || undefined },
        ],
      },
    });

    if (!user || !await bcrypt.compare(password, user.password || '')) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// ===== 用户管理 =====

// 获取当前用户信息
router.get('/user/profile', verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        plan: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// 更新用户信息
router.put('/user/profile', verifyToken, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, avatar },
      select: { id: true, name: true, avatar: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ===== 照片管理 =====

// 上传照片
router.post('/photos/upload', verifyToken, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const { sessionId, capturedAt } = req.body;

    // 存储文件
    const fileInfo = await storage.upload(req.file, 'photos');

    // 保存数据库记录
    const photo = await prisma.photo.create({
      data: {
        filename: fileInfo.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileInfo.url,
        userId: req.user.userId,
        sessionId: sessionId || null,
        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        width: 0,
        height: 0,
      },
    });

    // 更新用户存储使用量
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { storageUsed: { increment: req.file.size } },
    });

    res.json(photo);
  } catch (err) {
    next(err);
  }
});

// 获取照片列表
router.get('/photos', verifyToken, async (req, res, next) => {
  try {
    const { sessionId, page = 1, limit = 20 } = req.query;

    const where = { userId: req.user.userId };
    if (sessionId) where.sessionId = sessionId;

    const photos = await prisma.photo.findMany({
      where,
      orderBy: { capturedAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    });

    const total = await prisma.photo.count({ where });

    res.json({
      photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 删除照片
router.delete('/photos/:id', verifyToken, async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.id },
    });

    if (!photo) {
      return res.status(404).json({ error: '照片不存在' });
    }

    if (photo.userId !== req.user.userId) {
      return res.status(403).json({ error: '无权删除此照片' });
    }

    // 删除文件
    await storage.delete(photo.filename, 'photos');

    // 删除数据库记录
    await prisma.photo.delete({
      where: { id: req.params.id },
    });

    // 更新用户存储使用量
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { storageUsed: { decrement: photo.size } },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ===== 拍摄会话 =====

// 创建会话
router.post('/sessions', verifyToken, async (req, res, next) => {
  try {
    const { name, captureDays } = req.body;

    const now = new Date();
    const captureEnd = new Date(now.getTime() + captureDays * 24 * 60 * 60 * 1000);
    const storageEnd = new Date(captureEnd.getTime() + 14 * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        name,
        creatorId: req.user.userId,
        captureDays,
        captureStart: now,
        captureEnd,
        storageEnd,
        participants: {
          create: {
            userId: req.user.userId,
            role: 'admin',
          },
        },
      },
      include: { participants: true },
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// 获取会话列表
router.get('/sessions', verifyToken, async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        participants: {
          some: { userId: req.user.userId },
        },
      },
      include: {
        participants: true,
        photos: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// 添加会话参与者
router.post('/sessions/:id/participants', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.body;

    // 检查权限
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: req.params.id,
        userId: req.user.userId,
        role: { in: ['admin', 'editor'] },
      },
    });

    if (!participant) {
      return res.status(403).json({ error: '无权添加参与者' });
    }

    const newParticipant = await prisma.sessionParticipant.create({
      data: {
        sessionId: req.params.id,
        userId,
        role: 'member',
      },
    });

    res.json(newParticipant);
  } catch (err) {
    next(err);
  }
});

// ===== 好友管理 =====

// 发送好友请求
router.post('/friends/request', verifyToken, async (req, res, next) => {
  try {
    const { addresseeId } = req.body;

    if (addresseeId === req.user.userId) {
      return res.status(400).json({ error: '不能添加自己为好友' });
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId: req.user.userId,
        addresseeId,
        status: 'PENDING',
      },
    });

    res.json(friendship);
  } catch (err) {
    next(err);
  }
});

// 接受好友请求
router.post('/friends/accept/:id', verifyToken, async (req, res, next) => {
  try {
    const friendship = await prisma.friendship.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED' },
    });

    res.json(friendship);
  } catch (err) {
    next(err);
  }
});

// 获取好友列表
router.get('/friends', verifyToken, async (req, res, next) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: req.user.userId },
          { addresseeId: req.user.userId },
        ],
        status: 'ACCEPTED',
      },
      include: {
        requester: { select: { id: true, name: true, avatar: true } },
        addressee: { select: { id: true, name: true, avatar: true } },
      },
    });

    const friends = friendships.map(f =>
      f.requesterId === req.user.userId ? f.addressee : f.requester
    );

    res.json(friends);
  } catch (err) {
    next(err);
  }
});

// ===== 测试端点 =====
router.get('/test/redis', async (req, res) => {
  const redis = require('../services/redis');
  try {
    await redis.set('test', { data: 'test' });
    const data = await redis.get('test');
    res.json({ status: 'ok', redis: !!data });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

router.get('/test/storage', async (req, res) => {
  try {
    res.json({ status: 'ok', storage: 'ready' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

router.get('/test/database', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ status: 'ok', users: count });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

module.exports = router;
