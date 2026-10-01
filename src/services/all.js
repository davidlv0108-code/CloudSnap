// ============================================================
// CloudSnap 后端 - 业务服务层
// ============================================================

// services/database.js - 数据库连接
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  prisma,
  
  async initDatabase() {
    try {
      await prisma.$connect();
      console.log('[数据库] 已连接');
    } catch (err) {
      console.error('[数据库] 连接失败:', err);
      throw err;
    }
  },
};

// services/storage.js - 文件存储服务
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const AWS = require('aws-sdk');

const storage = {
  // 本地存储
  async uploadLocal(file, folder = 'photos') {
    const dir = path.join(config.storage.localPath, folder);
    await fs.ensureDir(dir);
    
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(dir, filename);
    await fs.move(file.path, filepath);
    
    return {
      filename,
      folder,
      url: `/uploads/${folder}/${filename}`,
      size: file.size,
    };
  },

  // S3 存储
  async uploadS3(file, folder = 'photos') {
    const s3 = new AWS.S3({
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
      region: config.storage.s3.region,
    });

    const key = `${folder}/${Date.now()}-${file.originalname}`;
    const params = {
      Bucket: config.storage.s3.bucket,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();
    return {
      filename: path.basename(key),
      folder,
      url: result.Location,
      size: file.size,
    };
  },

  // 根据配置自动选择存储方式
  async upload(file, folder = 'photos') {
    if (config.storage.type === 's3') {
      return this.uploadS3(file, folder);
    }
    return this.uploadLocal(file, folder);
  },

  // 删除文件
  async delete(filename, folder = 'photos') {
    if (config.storage.type === 's3') {
      const s3 = new AWS.S3(config.storage.s3);
      await s3.deleteObject({
        Bucket: config.storage.s3.bucket,
        Key: `${folder}/${filename}`,
      }).promise();
    } else {
      const filepath = path.join(config.storage.localPath, folder, filename);
      await fs.remove(filepath);
    }
  },
};

module.exports = storage;

// services/redis.js - Redis 缓存
const redis = require('redis');
const config = require('../config');

let client;

module.exports = {
  async init() {
    if (!config.redis.url) {
      console.warn('[Redis] 未配置，跳过初始化');
      return;
    }

    client = redis.createClient({ url: config.redis.url });
    client.on('error', err => console.error('[Redis] 错误:', err));
    await client.connect();
    console.log('[Redis] 已连接');
  },

  async get(key) {
    if (!client) return null;
    return await client.get(key);
  },

  async set(key, value, ttl = config.redis.defaultTTL) {
    if (!client) return;
    await client.setEx(key, ttl, JSON.stringify(value));
  },

  async del(key) {
    if (!client) return;
    await client.del(key);
  },

  async getClient() {
    return client;
  },
};

// services/ai.js - AI 服务（人脸识别、图像分类）
const axios = require('axios');

module.exports = {
  // 百度 AI 人脸识别
  async recognizeFace(imageUrl) {
    try {
      const response = await axios.post(
        'https://aip.baidubce.com/rest/2.0/face/v3/detect',
        { image: imageUrl, image_type: 'URL' },
        { params: { access_token: await this.getBaiduToken() } }
      );
      return response.data;
    } catch (err) {
      console.error('[AI] 人脸识别错误:', err);
      return null;
    }
  },

  // 百度 AI 图像分类
  async classifyImage(imageUrl) {
    try {
      const response = await axios.post(
        'https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general',
        { image: imageUrl, image_type: 'URL' },
        { params: { access_token: await this.getBaiduToken() } }
      );
      return response.data?.result || [];
    } catch (err) {
      console.error('[AI] 图像分类错误:', err);
      return [];
    }
  },

  // 获取百度 Token
  async getBaiduToken() {
    const response = await axios.post(
      'https://aip.baidubce.com/oauth/2.0/token',
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: config.ai.baidu.apiKey,
          client_secret: config.ai.baidu.secretKey,
        },
      }
    );
    return response.data.access_token;
  },
};

// services/push.js - 推送通知服务
const admin = require('firebase-admin');

let firebaseApp;

module.exports = {
  async init() {
    if (!config.push.firebase.projectId) {
      console.warn('[推送] Firebase 未配置');
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.push.firebase.projectId,
        privateKey: config.push.firebase.privateKey,
        clientEmail: config.push.firebase.clientEmail,
      }),
    });
    console.log('[推送] Firebase 已初始化');
  },

  async sendNotification(fcmToken, { title, body, data }) {
    if (!firebaseApp) return false;

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data,
      });
      return true;
    } catch (err) {
      console.error('[推送] 发送失败:', err);
      return false;
    }
  },

  async sendToTopic(topic, message) {
    if (!firebaseApp) return false;
    try {
      await admin.messaging().send({
        topic,
        ...message,
      });
      return true;
    } catch (err) {
      console.error('[推送] 发送主题消息失败:', err);
      return false;
    }
  },
};

// services/index.js - 服务初始化
const database = require('./database');
const redis = require('./redis');
const push = require('./push');

module.exports = {
  async initServices() {
    await database.initDatabase();
    await redis.init();
    await push.init();
    console.log('[服务] 全部初始化完成');
  },
};
