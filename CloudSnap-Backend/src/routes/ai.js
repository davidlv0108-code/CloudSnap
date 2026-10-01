// ============================================================
// AI 智能分类路由
// ============================================================

const router = require('express').Router();
const multer = require('multer');
const config = require('../config');
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');
const aiService = require('../services/ai');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(authMiddleware);

// ===== 分析照片（不保存）=====
router.post('/analyze', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传照片' });

    if (!config.ai.baidu.apiKey) {
      return res.status(501).json({ error: 'AI 服务尚未配置' });
    }

    const analysis = await aiService.analyzePhoto(req.file.buffer);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// ===== 获取人脸分组 =====
router.get('/faces', async (req, res, next) => {
  try {
    const groups = await prisma.faceGroup.findMany({
      where: { userId: req.user.userId },
      include: { _count: { select: { photos: true } } },
    });
    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

// ===== 重命名人脸分组 =====
router.put('/faces/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const group = await prisma.faceGroup.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json({ group });
  } catch (err) {
    next(err);
  }
});

// ===== 获取地点分组 =====
router.get('/locations', async (req, res, next) => {
  try {
    const photos = await prisma.photo.findMany({
      where: { userId: req.user.userId, deletedAt: null, location: { not: null } },
      select: { id: true, location: true, gps: true },
    });

    const groups = {};
    for (const photo of photos) {
      const loc = photo.location;
      if (!groups[loc]) groups[loc] = { name: loc, photos: [], count: 0 };
      groups[loc].photos.push(photo.id);
      groups[loc].count++;
    }

    res.json({ locations: Object.values(groups) });
  } catch (err) {
    next(err);
  }
});

// ===== 注册用户人脸 =====
router.post('/register-face', upload.single('face'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传人脸照片' });

    const faceToken = await aiService.registerFace(req.file.buffer, req.user.userId);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { faceToken },
    });

    res.json({ success: true, faceToken });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
