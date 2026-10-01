// ============================================================
// CloudSnap 后端 - 测试套件
// ============================================================

// tests/auth.test.js - 认证测试
const request = require('supertest');
const app = require('../src/app');

describe('认证 API', () => {
  let token;
  let userId;

  test('应该能够注册', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe('test@example.com');

    token = response.body.token;
    userId = response.body.user.id;
  });

  test('应该能够登录', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  test('应该能够获取个人资料', async () => {
    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('test@example.com');
  });

  test('应该能够更新个人资料', async () => {
    const response = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Name');
  });

  test('没有 token 应该返回 401', async () => {
    const response = await request(app)
      .get('/api/user/profile');

    expect(response.status).toBe(401);
  });
});

// tests/photos.test.js - 照片测试
describe('照片 API', () => {
  let token;
  let photoId;

  beforeAll(async () => {
    // 注册用户获取 token
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'photo-test@example.com',
        password: 'password123',
        name: 'Photo Test User',
      });

    token = response.body.token;
  });

  test('应该能够获取照片列表', async () => {
    const response = await request(app)
      .get('/api/photos')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.photos)).toBe(true);
  });

  test('应该能够上传照片', async () => {
    const response = await request(app)
      .post('/api/photos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('fake image'), 'test.jpg');

    expect(response.status).toBe(200);
    expect(response.body.filename).toBeDefined();
    expect(response.body.url).toBeDefined();

    photoId = response.body.id;
  });

  test('应该能够删除照片', async () => {
    const response = await request(app)
      .delete(`/api/photos/${photoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// tests/sessions.test.js - 会话测试
describe('拍摄会话 API', () => {
  let token;
  let sessionId;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'session-test@example.com',
        password: 'password123',
        name: 'Session Test User',
      });

    token = response.body.token;
  });

  test('应该能够创建会话', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Session',
        captureDays: 7,
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Test Session');

    sessionId = response.body.id;
  });

  test('应该能够获取会话列表', async () => {
    const response = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('应该能够添加参与者', async () => {
    // 首先注册另一个用户
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'participant@example.com',
        password: 'password123',
        name: 'Participant',
      });

    const response = await request(app)
      .post(`/api/sessions/${sessionId}/participants`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: userResponse.body.user.id });

    expect(response.status).toBe(200);
  });
});

// tests/friends.test.js - 好友测试
describe('好友 API', () => {
  let user1Token;
  let user2Id;
  let requestId;

  beforeAll(async () => {
    const user1Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'friend1@example.com',
        password: 'password123',
        name: 'Friend 1',
      });

    user1Token = user1Response.body.token;

    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'friend2@example.com',
        password: 'password123',
        name: 'Friend 2',
      });

    user2Id = user2Response.body.user.id;
  });

  test('应该能够发送好友请求', async () => {
    const response = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ addresseeId: user2Id });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PENDING');

    requestId = response.body.id;
  });

  test('应该能够接受好友请求', async () => {
    const response = await request(app)
      .post(`/api/friends/accept/${requestId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ACCEPTED');
  });

  test('应该能够获取好友列表', async () => {
    const response = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

// tests/health.test.js - 健康检查测试
describe('系统健康检查', () => {
  test('应该能够访问健康检查端点', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('应该能够测试 Redis', async () => {
    const response = await request(app).get('/api/test/redis');

    expect(response.status).toBe(200);
  });

  test('应该能够测试存储', async () => {
    const response = await request(app).get('/api/test/storage');

    expect(response.status).toBe(200);
  });

  test('应该能够测试数据库', async () => {
    const response = await request(app).get('/api/test/database');

    expect(response.status).toBe(200);
  });
});

// ============================================================
// 运行测试
// ============================================================

/**
 * 运行测试命令:
 * 
 * npm test                    # 运行所有测试
 * npm test -- --watch        # 监视模式
 * npm test -- --coverage     # 覆盖率报告
 * npm test -- auth.test.js   # 运行特定测试
 */
