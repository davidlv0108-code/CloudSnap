// ============================================================
// AI 服务 - 人脸识别 + 场景识别
// ============================================================

const axios = require('axios');
const config = require('../config');

class AIService {
  constructor() {
    this.apiKey = config.ai.baidu.apiKey;
    this.secretKey = config.ai.baidu.secretKey;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  // ===== 获取 Access Token =====
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.apiKey || !this.secretKey) {
      throw new Error('AI 服务未配置');
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`;
    const res = await axios.post(url);
    this.accessToken = res.data.access_token;
    this.tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  // ===== 分析照片 =====
  async analyzePhoto(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');

    const [faceResult, sceneResult] = await Promise.all([
      this.detectFaces(base64Image),
      this.detectScene(base64Image),
    ]);

    const hasFaces = faceResult.faces.length > 0;
    const isLandscape = sceneResult.scene && !['人物', '室内', '其他'].includes(sceneResult.scene);

    let type = 'other';
    if (hasFaces && isLandscape) type = 'both';
    else if (hasFaces) type = 'person';
    else if (isLandscape) type = 'landscape';

    return {
      type,
      faces: faceResult.faces,
      scene: sceneResult.scene,
    };
  }

  // ===== 人脸检测 =====
  async detectFaces(base64Image) {
    try {
      const token = await this.getAccessToken();
      const url = `https://aip.baidubce.com/rest/2.0/face/v3/detect?access_token=${token}`;

      const res = await axios.post(url, {
        image: base64Image,
        image_type: 'BASE64',
        face_field: 'faceshape,facetype,age,gender,beauty',
      });

      return {
        faces: res.data.result?.face_list || [],
      };
    } catch (err) {
      console.error('[AI] 人脸检测失败:', err.message);
      return { faces: [] };
    }
  }

  // ===== 场景识别 =====
  async detectScene(base64Image) {
    try {
      const token = await this.getAccessToken();
      const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${token}`;

      const res = await axios.post(url, `image=${encodeURIComponent(base64Image)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const result = res.data.result?.[0];
      return {
        scene: result?.keyword || '未知',
        score: result?.score || 0,
      };
    } catch (err) {
      console.error('[AI] 场景识别失败:', err.message);
      return { scene: '未知', score: 0 };
    }
  }

  // ===== 注册人脸 =====
  async registerFace(imageBuffer, userId) {
    // [待填写] 实现人脸注册
    // 1. 调用百度AI注册人脸
    // 2. 返回 face_token
    throw new Error('人脸注册功能待实现');
  }

  // ===== 人脸比对 =====
  async compareFaces(faceToken1, faceToken2) {
    // [待填写] 实现人脸比对
    throw new Error('人脸比对功能待实现');
  }
}

module.exports = new AIService();
