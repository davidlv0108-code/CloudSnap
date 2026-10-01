// ============================================================
// 用户路由
// ============================================================

const router = require('express').Router();
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ===== 获取用户资料 =====
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        plan: true, storageUsed: true, storageLimit: true, createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ===== 更新用户资料 =====
router.patch('/profile', async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, avatar },
      select: { id: true, name: true, avatar: true },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ===== 获取存储使用情况 =====
router.get('/storage', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { storageUsed: true, storageLimit: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ===== 删除账户 =====
router.delete('/account', async (req, res, next) => {
  try {
    // [待填写] 删除用户所有数据
    // 1. 删除用户照片文件
    // 2. 删除用户数据库记录
    // 3. 取消订阅
    // 4. 发送确认邮件

    res.json({ message: '账户删除功能待实现' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
