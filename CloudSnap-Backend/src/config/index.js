// ============================================================
// CloudSnap 后端配置文件
// ⚠️ 所有需要你填写的配置项都已标注 [待填写]
// ============================================================
 const path = require('path');

module.exports = {
  // ===== 服务器配置 =====
  server: {
    // [待填写] 服务器IP地址（本地开发用 localhost，生产用你的服务器IP）
     host: process.env.HOST || 'localhost',

    // 服务器端口
    port: process.env.PORT || 3000,

    // 运行环境: development | production
    nodeEnv: process.env.NODE_ENV || 'development',

    // [待填写] 允许的前端域名（CORS），多个用逗号分隔
    // 示例: ['http://localhost:3000', 'http://10.234.33.148:3000']
     corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  },

  // ===== 数据库配置 =====
  database: {
    // [待填写] PostgreSQL 连接字符串
    // 格式: postgresql://用户名:密码@主机:端口/数据库名
    // 示例: postgresql://cloudsnap:password@localhost:5432/cloudsnap
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',

    // 连接池大小
    poolSize: 10,
  },

  // ===== JWT 认证配置 =====
  jwt: {
    // [待填写] JWT 密钥（至少32个字符的随机字符串）
    // 生成命令: openssl rand -hex 32
    secret: process.env.JWT_SECRET || 'dev_secret_please_change',

    // Token 过期时间
    expiresIn: '7d',

    // 刷新 Token 过期时间
    refreshExpiresIn: '30d',
  },

  // ===== 文件存储配置 =====
  storage: {
    // 存储类型: local | s3 | oss
    type: process.env.STORAGE_TYPE || 'local',

    // [待填写] 本地存储路径
    // Windows: 'C:\\Users\\PC\\Desktop\\照片'
    // Linux: '/var/www/cloudsnap/uploads'
     localPath: process.env.STORAGE_LOCAL_PATH || path.join(__dirname, '..', '..', 'uploads'),

    // [待填写] AWS S3 配置（如使用 S3）
    s3: {
      accessKeyId: process.env.STORAGE_S3_ACCESSKEYID || '',
      secretAccessKey: process.env.STORAGE_S3_SECRETACCESSKEY || '',
      region: process.env.STORAGE_S3_REGION || '',
      bucket: process.env.STORAGE_S3_BUCKET || '',
      publicUrl: process.env.STORAGE_S3_PUBLICURL || '',
    },

    // [待填写] 阿里云 OSS 配置（如使用 OSS）
    oss: {
      accessKeyId: '',         // [待填写]
      accessKeySecret: '',     // [待填写]
      region: '',              // [待填写] 示例: oss-cn-hangzhou
      bucket: '',              // [待填写]
      endpoint: '',            // [待填写]
    },

    // 文件限制
    limits: {
      maxFileSize: 20 * 1024 * 1024,  // 单文件最大 20MB
      maxStoragePerUser: 2 * 1024 * 1024 * 1024,  // 每用户 2GB
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    },
  },

  // ===== Redis 配置 =====
  redis: {
    // [待填写] Redis 连接字符串
    // 示例: redis://localhost:6379
    url: process.env.REDIS_URL || '',

    // 缓存过期时间（秒）
    defaultTTL: 3600,
  },

  // ===== AI 服务配置 =====
  ai: {
    // [待填写] 百度AI配置（人脸识别 + 图像分类）
    // 注册地址: https://cloud.baidu.com/product/face
    baidu: {
      apiKey: '',              // [待填写]
      secretKey: '',           // [待填写]
    },

    // [待填写] Google Cloud Vision（可选）
    googleVision: {
      apiKey: '',              // [待填写]
    },
  },

  // ===== 推送通知配置 =====
  push: {
    // [待填写] Firebase Admin SDK 配置
    // 下载地址: https://console.firebase.google.com
    firebase: {
      projectId: '',          // [待填写]
      privateKey: '',         // [待填写]
      clientEmail: '',        // [待填写]
    },

    // [待填写] Apple Push Notification Service (APNs)
    apns: {
      teamId: '',             // [待填写]
      keyId: '',              // [待填写]
      privateKey: '',         // [待填写]
      bundleId: '',           // [待填写]
    },
  },

  // ===== 社交登录配置 =====
  oauth: {
    // [待填写] 微信开放平台
    // 注册地址: https://open.weixin.qq.com
    wechat: {
      appId: '',               // [待填写]
      appSecret: '',           // [待填写]
    },

    // [待填写] Google OAuth
    // 注册地址: https://console.cloud.google.com
    google: {
      clientId: '',            // [待填写]
      clientSecret: '',        // [待填写]
    },

    // [待填写] Apple Sign In
    // 注册地址: https://developer.apple.com
    apple: {
      serviceId: '',           // [待填写]
      teamId: '',              // [待填写]
      keyId: '',               // [待填写]
      privateKey: '',          // [待填写]
    },
  },

  // ===== 支付配置 =====
  payment: {
    // [待填写] Google Play Billing
    googlePlay: {
      packageName: '',        // [待填写] 示例: com.cloudsnap.app
      serviceAccountEmail: '', // [待填写]
      privateKey: '',         // [待填写]
    },

    // [待填写] Apple App Store
    appStore: {
      bundleId: '',           // [待填写]
      sharedSecret: '',       // [待填写]
    },

    // [待填写] 支付宝
    alipay: {
      appId: '',              // [待填写]
      privateKey: '',        // [待填写]
      publicKey: '',         // [待填写]
    },

    // [待填写] 微信支付
    wechatPay: {
      appId: '',              // [待填写]
      mchId: '',              // [待填写]
      apiKey: '',             // [待填写]
    },
  },

  // ===== 短信服务配置 =====
  sms: {
    // [待填写] 阿里云短信
    // 注册地址: https://www.aliyun.com/product/sms
    aliyun: {
      accessKeyId: '',        // [待填写]
      accessKeySecret: '',    // [待填写]
      signName: '',           // [待填写] 短信签名
      templateCode: '',       // [待填写] 短信模板
    },

    // [待填写] 腾讯云短信
    tencent: {
      secretId: '',           // [待填写]
      secretKey: '',          // [待填写]
      appId: '',              // [待填写]
      signName: '',          // [待填写]
      templateId: '',        // [待填写]
    },
  },

  // ===== 邮件配置 =====
  email: {
    // [待填写] SMTP 配置
    smtp: {
      host: '',               // [待填写] 示例: smtp.gmail.com
      port: 587,
      user: '',               // [待填写]
      pass: '',               // [待填写]
    },

    // 发件人信息
    from: {
      name: 'CloudSnap',
      address: '',            // [待填写]
    },
  },

  // ===== 业务逻辑配置 =====
  business: {
    // 拍摄会话配置
    session: {
      maxCaptureDays: 7,      // 拍摄期最大天数
      storageDays: 14,        // 存取期天数
      maxParticipants: 50,    // 每会话最大参与人数
    },

    // 好友系统配置
    friends: {
      maxFriends: 500,        // 最大好友数
      requestExpiryDays: 7,   // 好友请求过期天数
    },

    // 订阅方案
    plans: {
      free: {
        storage: 2 * 1024 * 1024 * 1024,   // 2GB
        maxFriends: 10,
        aiClassify: false,
        cloudSync: false,
      },
      pro: {
        storage: 50 * 1024 * 1024 * 1024,  // 50GB
        maxFriends: 100,
        aiClassify: true,
        cloudSync: true,
      },
      family: {
        storage: 200 * 1024 * 1024 * 1024, // 200GB
        maxFriends: 500,
        aiClassify: true,
        cloudSync: true,
        members: 6,
      },
    },
  },

  // ===== 监控配置 =====
  monitoring: {
    // [待填写] Sentry 错误监控
    sentryDsn: '',            // [待填写]

    // [待填写] 日志级别: debug | info | warn | error
    logLevel: 'info',
  },
};
