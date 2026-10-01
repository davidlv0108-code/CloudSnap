// ============================================================
// 好友路由
// ============================================================

const router = require('express').Router();
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ===== 搜索用户 =====
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.userId } },
          { OR: [{ phone: { contains: q } }, { email: { contains: q } }, { name: { contains: q } }] },
        ],
      },
      select: { id: true, name: true, avatar: true, phone: true, platform: true },
      take: 20,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// ===== 发送好友请求 =====
router.post('/request', async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    const addressee = await prisma.user.findUnique({ where: { phone } });

    if (!addressee) return res.status(404).json({ error: '用户不存在' });
    if (addressee.id === req.user.userId) return res.status(400).json({ error: '不能添加自己' });

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.user.userId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: req.user.userId },
        ],
      },
    });

    if (existing) return res.status(400).json({ error: '已有好友请求或已是好友' });

    const friendship = await prisma.friendship.create({
      data: {
        requesterId: req.user.userId,
        addresseeId: addressee.id,
        message,
        status: 'PENDING',
      },
    });

    res.status(201).json({ friendship });
  } catch (err) {
    next(err);
  }
});

// ===== 接受好友请求 =====
router.post('/accept/:id', async (req, res, next) => {
  try {
    const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || friendship.addresseeId !== req.user.userId) {
      return res.status(404).json({ error: '好友请求不存在' });
    }

    const updated = await prisma.friendship.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED' },
    });

    res.json({ friendship: updated });
  } catch (err) {
    next(err);
  }
});

// ===== 拒绝好友请求 =====
router.post('/reject/:id', async (req, res, next) => {
  try {
    const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || friendship.addresseeId !== req.user.userId) {
      return res.status(404).json({ error: '好友请求不存在' });
    }

    await prisma.friendship.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ===== 获取好友列表 =====
router.get('/', async (req, res, next) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: req.user.userId }, { addresseeId: req.user.userId }],
        status: 'ACCEPTED',
      },
      include: {
        requester: { select: { id: true, name: true, avatar: true, phone: true, platform: true } },
        addressee: { select: { id: true, name: true, avatar: true, phone: true, platform: true } },
      },
    });

    const friends = friendships.map(f => {
      const friend = f.requesterId === req.user.userId ? f.addressee : f.requester;
      return { ...friend, friendsSince: f.updatedAt };
    });

    res.json({ friends });
  } catch (err) {
    next(err);
  }
});

// ===== 获取待处理的好友请求 =====
router.get('/requests', async (req, res, next) => {
  try {
    const requests = await prisma.friendship.findMany({
      where: { addresseeId: req.user.userId, status: 'PENDING' },
      include: { requester: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// ===== 删除好友 =====
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: req.user.userId, addresseeId: req.params.id },
          { requesterId: req.params.id, addresseeId: req.user.userId },
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
