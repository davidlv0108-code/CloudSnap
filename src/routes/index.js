// ============================================================
// 路由统一入口
// ============================================================

const express = require('express');
const router = express.Router();

// ===== 认证路由 =====
router.use('/auth', require('./auth'));

// ===== 照片路由 =====
router.use('/photos', require('./photos'));

// ===== 会话路由 =====
router.use('/sessions', require('./sessions'));

// ===== 好友路由 =====
router.use('/friends', require('./friends'));

// ===== AI 智能分类路由 =====
router.use('/ai', require('./ai'));

// ===== 支付路由 =====
router.use('/billing', require('./billing'));

// ===== 推送通知路由 =====
router.use('/push', require('./push'));

// ===== 用户路由 =====
router.use('/user', require('./user'));

// ===== 测试与外部服务连通性 =====
router.use('/test', require('./test'));

module.exports = router;
