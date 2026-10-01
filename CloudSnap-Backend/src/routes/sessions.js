// ============================================================
// 会话路由 - 拍摄会话管理
// ============================================================

const router = require('express').Router();
const crypto = require('crypto');
const config = require('../config');
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ===== 创建拍摄会话 =====
router.post('/', async (req, res, next) => {
  try {
    const { name, captureDays, friendIds = [] } = req.body;
    const userId = req.user.userId;

    if (!captureDays || captureDays < 1 || captureDays > config.business.session.maxCaptureDays) {
      return res.status(400).json({
        error: `拍摄期必须为1-${config.business.session.maxCaptureDays}天`,
      });
    }

    const captureStart = new Date();
    const captureEnd = new Date(captureStart.getTime() + captureDays * 24 * 60 * 60 * 1000);
    const storageEnd = new Date(captureEnd.getTime() + config.business.session.storageDays * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        name,
        creatorId: userId,
        captureDays,
        captureStart,
        captureEnd,
        storageEnd,
        participants: { create: [{ userId, role: 'creator' }] },
      },
    });

    // 邀请好友
    if (friendIds.length > 0) {
      await prisma.sessionParticipant.createMany({
        data: friendIds.map(friendId => ({
          sessionId: session.id,
          userId: friendId,
          role: 'member',
        })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

// ===== 获取我的会话列表 =====
router.get('/', async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        participants: { some: { userId: req.user.userId } },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// ===== 获取会话详情 =====
router.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        photos: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) return res.status(404).json({ error: '会话不存在' });

    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// ===== 生成邀请码 =====
router.post('/:id/invite', async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: '会话不存在' });

    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const invite = await prisma.sessionInvite.create({
      data: {
        sessionId: session.id,
        inviterId: req.user.userId,
        code,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({ invite });
  } catch (err) {
    next(err);
  }
});

// ===== 通过邀请码加入会话 =====
router.post('/join', async (req, res, next) => {
  try {
    const { code } = req.body;

    const invite = await prisma.sessionInvite.findUnique({
      where: { code },
      include: { session: true },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: '邀请码无效或已过期' });
    }

    if (invite.usedBy) {
      return res.status(400).json({ error: '邀请码已被使用' });
    }

    await prisma.sessionParticipant.create({
      data: {
        sessionId: invite.sessionId,
        userId: req.user.userId,
        role: 'member',
      },
    });

    await prisma.sessionInvite.update({
      where: { id: invite.id },
      data: { usedBy: req.user.userId },
    });

    res.json({ session: invite.session });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
