// ============================================================
// 照片路由 - 上传/查看/删除/AI筛选
// ============================================================

const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const config = require('../config');
const { prisma } = require('../services/database');
const { authMiddleware } = require('../middleware/auth');
const storageService = require('../services/storage');
const aiService = require('../services/ai');

// ===== Multer 配置 =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.limits.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只能上传图片文件'));
    }
    cb(null, true);
  },
});

// 所有路由都需要登录
router.use(authMiddleware);

// ===== 上传照片（带AI筛选）=====
router.post('/upload', upload.single('photo'), async (req, res, next) => {
  try {
    const { uploadType = 'both', sessionId } = req.body;
    const userId = req.user.userId;

    // 支持两种上传方式：multipart/form-data （req.file）或 JSON 包含 base64 字符串（req.body.file）
    let buffer = null;
    let originalName = null;
    let mimeType = null;

    if (req.file) {
      buffer = req.file.buffer;
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.body && req.body.file) {
      // 支持 data URL 或纯 base64
      const data = req.body.file;
      const matches = data.match(/^data:(image\/[a-zA-Z0-9+.]+);base64,(.+)$/);
      let b64 = data;
      if (matches) {
        mimeType = matches[1];
        b64 = matches[2];
      }
      buffer = Buffer.from(b64, 'base64');
      originalName = req.body.filename || `upload_${Date.now()}`;
      mimeType = mimeType || 'image/jpeg';
    } else {
      return res.status(400).json({ error: '请选择照片' });
    }

    // 检查存储空间
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.storageUsed + buffer.length > user.storageLimit) {
      return res.status(413).json({ error: '存储空间不足' });
    }

    // AI 分析（如果配置了AI）
    let analysis = { type: 'unknown', faces: [], scene: '', tags: [] };
    if (config.ai && config.ai.baidu && config.ai.baidu.apiKey) {
      analysis = await aiService.analyzePhoto(buffer);
    }

    // 根据类型筛选
    const shouldUpload = aiService.shouldUpload(analysis.type, uploadType);
    if (!shouldUpload) {
      return res.json({
        uploaded: false,
        reason: `照片类型为「${analysis.type}」，不符合「${uploadType}」筛选条件`,
        analysis,
      });
    }

    // 生成文件名并保存照片（storageService.savePhoto 返回相对路径）
    const ext = (mimeType && mimeType.split('/')[1]) || 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
    const relativePath = await storageService.savePhoto(buffer, userId, filename);
    const thumbRel = await storageService.generateThumbnail(buffer, userId, filename).catch(() => null);

    const url = storageService.getFileUrl(relativePath);
    const thumbnailUrl = thumbRel ? storageService.getFileUrl(thumbRel) : null;

    // 计算过期时间
    let expiresAt = null;
    if (sessionId) {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (session) {
        expiresAt = session.storageEnd;
      }
    } else {
      expiresAt = new Date(Date.now() + config.business.session.storageDays * 24 * 60 * 60 * 1000);
    }

    // 保存到数据库
    const photo = await prisma.photo.create({
      data: {
        filename: filename,
        originalName,
        mimeType,
        size: buffer.length,
        url,
        thumbnailUrl,
        aiCategory: analysis.type,
        aiTags: (analysis.tags && analysis.tags.join(',')) || null,
        aiDescription: analysis.scene || null,
        userId,
        sessionId: sessionId || null,
        expiresAt,
      },
    });

    // 更新存储用量
    if (user) {
      await prisma.user.update({
        where: { id: userId },
        data: { storageUsed: { increment: buffer.length } },
      });
    }

    // 如果包含人脸，分发到群组成员
    if (analysis.faces && analysis.faces.length > 0 && sessionId) {
      await aiService.distributeToMembers(photo, analysis.faces, sessionId).catch(() => {});
    }

    res.status(201).json({
      uploaded: true,
      photo,
      analysis: {
        type: analysis.type,
        scene: analysis.scene,
        faceCount: analysis.faces ? analysis.faces.length : 0,
        distributed: (analysis.faces && analysis.faces.length > 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== 获取照片列表 =====
router.get('/', async (req, res, next) => {
  try {
    const { category, favorite, sessionId, page = 1, limit = 50 } = req.query;
    const where = { userId: req.user.userId, deletedAt: null };

    if (category) where.aiCategory = category;
    if (favorite === 'true') where.isFavorite = true;
    if (sessionId) where.sessionId = sessionId;

    const photos = await prisma.photo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.photo.count({ where });

    res.json({ photos, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// ===== 获取单张照片 =====
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.id },
      include: { session: true },
    });

    if (!photo || photo.deletedAt) {
      return res.status(404).json({ error: '照片不存在' });
    }

    res.json({ photo });
  } catch (err) {
    next(err);
  }
});

// ===== 收藏/取消收藏 =====
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
    if (!photo) return res.status(404).json({ error: '照片不存在' });

    const updated = await prisma.photo.update({
      where: { id: req.params.id },
      data: { isFavorite: !photo.isFavorite },
    });

    res.json({ photo: updated });
  } catch (err) {
    next(err);
  }
});

// ===== 删除照片 =====
router.delete('/:id', async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
    if (!photo) return res.status(404).json({ error: '照片不存在' });

    if (photo.userId !== req.user.userId) {
      return res.status(403).json({ error: '无权删除此照片' });
    }

    // 删除文件
    await storageService.deletePhoto(photo);

    // 更新存储用量
    await prisma.user.update({
      where: { id: photo.userId },
      data: { storageUsed: { decrement: photo.size } },
    });

    // 删除数据库记录
    await prisma.photo.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
