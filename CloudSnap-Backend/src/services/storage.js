// ============================================================
// 文件存储服务 - 本地/S3/OSS
// ============================================================

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

class StorageService {
  constructor() {
    this.type = config.storage.type;
    this.localPath = config.storage.localPath;

    // 初始化 S3 客户端（若使用 s3）
    if (this.type === 's3' && config.storage.s3 && config.storage.s3.accessKeyId) {
      const AWS = require('aws-sdk');
      AWS.config.update({
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        region: config.storage.s3.region,
      });
      this.s3 = new AWS.S3();
    }

    // 确保本地目录存在
    if (this.type === 'local' && this.localPath) {
      [this.localPath, path.join(this.localPath, 'thumbnails')].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    }
  }

  // ===== 保存照片 =====
  async savePhoto(buffer, userId, filename) {
    const relativePath = `${userId}/${filename}`;

    if (this.type === 'local') {
      return await this._saveLocal(relativePath, buffer);
    } else if (this.type === 's3') {
      return await this._saveS3(relativePath, buffer);
    }
  }

  // ===== 生成缩略图 =====
  async generateThumbnail(buffer, userId, filename) {
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbPath = `${userId}/thumbnails/${filename}`;
    return await this.savePhoto(thumbnail, userId, `thumbnails/${filename}`);
  }

  // ===== 删除照片 =====
  async deletePhoto(photo) {
    if (this.type === 'local') {
      const filesToDelete = [photo.url, photo.thumbnailUrl].filter(Boolean);
      for (const file of filesToDelete) {
        const fullPath = path.join(this.localPath, file);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } else if (this.type === 's3') {
      const AWS = require('aws-sdk');
      if (!this.s3) {
        this.s3 = new AWS.S3();
      }
      const objects = [];
      if (photo.url) objects.push({ Key: photo.url });
      if (photo.thumbnailUrl) objects.push({ Key: photo.thumbnailUrl });
      if (objects.length === 0) return;
      await this.s3.deleteObjects({
        Bucket: config.storage.s3.bucket,
        Delete: { Objects: objects },
      }).promise();
    }
  }

  // ===== 本地存储 =====
  async _saveLocal(relativePath, buffer) {
    const fullPath = path.join(this.localPath, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return relativePath;
  }

  // ===== S3 存储 =====
  async _saveS3(key, buffer) {
    if (!this.s3) {
      const AWS = require('aws-sdk');
      AWS.config.update({
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        region: config.storage.s3.region,
      });
      this.s3 = new AWS.S3();
    }

    await this.s3.putObject({
      Bucket: config.storage.s3.bucket,
      Key: key,
      Body: buffer,
      ACL: 'private',
      ContentType: 'application/octet-stream',
    }).promise();
    return key;
  }

  // ===== 获取文件 URL =====
  getFileUrl(relativePath) {
    if (this.type === 'local') {
      return `/uploads/${relativePath}`;
    } else if (this.type === 's3') {
      return `${config.storage.s3.publicUrl}/${relativePath}`;
    }
    return relativePath;
  }
}

module.exports = new StorageService();
