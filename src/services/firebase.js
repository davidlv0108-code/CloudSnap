// ============================================================
// 推送通知服务 - Firebase Cloud Messaging
// ============================================================

const config = require('../config');

let admin = null;

async function initFirebase() {
  if (!config.push || !config.push.firebase || !config.push.firebase.projectId) {
    console.warn('[推送] ⚠️ Firebase 未配置');
    return;
  }

  try {
    const firebaseAdmin = require('firebase-admin');

    const privateKey = config.push.firebase.privateKey
      ? config.push.firebase.privateKey.replace(/\\n/g, '\n')
      : undefined;

    const credential = {
      projectId: config.push.firebase.projectId,
      clientEmail: config.push.firebase.clientEmail,
      privateKey,
    };

    if (!admin) {
      admin = firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(credential),
      });
    }

    console.log('[推送] Firebase 已初始化');
  } catch (err) {
    console.error('[推送] Firebase 初始化失败:', err.message || err);
  }
}

// ===== 发送推送通知 =====
async function sendPushNotification(token, title, body, data = {}) {
  if (!admin) {
    console.warn('[推送] Firebase 未初始化，跳过推送');
    return;
  }

  const message = {
    token,
    notification: { title, body },
    data,
    android: { notification: { channelId: 'cloudsnap_channel' } },
    apns: { payload: { aps: { badge: 1, sound: 'default' } } },
  };

  try {
    await admin.messaging().send(message);
  } catch (err) {
    console.error('[推送] 发送失败:', err.message || err);
  }
}

module.exports = { initFirebase, sendPushNotification };
module.exports.isInitialized = () => !!admin;
