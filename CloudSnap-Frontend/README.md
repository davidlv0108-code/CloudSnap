// ============================================================
// CloudSnap Web Frontend - 完整实现
// ============================================================

// frontend/package.json
{
  "name": "cloudsnap-web",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "zustand": "^4.3.2",
    "antd": "^5.1.0",
    "@ant-design/icons": "^5.0.0",
    "dayjs": "^1.11.7",
    "react-dropzone": "^14.2.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  }
}

// frontend/src/api/client.js - API 客户端
import axios from 'axios';
import { useAuthStore } from '../store/auth';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    throw error.response?.data || error;
  }
);

export default client;

// frontend/src/api/auth.js - 认证 API
import client from './client';

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  getProfile: () => client.get('/user/profile'),
  updateProfile: (data) => client.put('/user/profile', data),
};

// frontend/src/api/photos.js - 照片 API
import client from './client';

export const photosAPI = {
  upload: (formData) => client.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getList: (params) => client.get('/photos', { params }),
  delete: (id) => client.delete(`/photos/${id}`),
};

// frontend/src/api/sessions.js - 会话 API
import client from './client';

export const sessionsAPI = {
  create: (data) => client.post('/sessions', data),
  getList: () => client.get('/sessions'),
  addParticipant: (sessionId, userId) => client.post(`/sessions/${sessionId}/participants`, { userId }),
};

// frontend/src/store/auth.js - 认证状态管理
import create from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

// frontend/src/store/photos.js - 照片状态管理
import create from 'zustand';

export const usePhotosStore = create((set) => ({
  photos: [],
  loading: false,
  total: 0,

  setPhotos: (photos) => set({ photos }),
  addPhoto: (photo) => set((state) => ({ photos: [photo, ...state.photos] })),
  removePhoto: (id) => set((state) => ({
    photos: state.photos.filter(p => p.id !== id)
  })),
}));

// frontend/src/components/Login.jsx - 登录页面
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await authAPI.login(values);
      setUser(result.user);
      setToken(result.token);
      message.success('登录成功');
      navigate('/');
    } catch (err) {
      message.error(err.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values) => {
    setLoading(true);
    try {
      const result = await authAPI.register(values);
      setUser(result.user);
      setToken(result.token);
      message.success('注册成功');
      navigate('/');
    } catch (err) {
      message.error(err.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card style={{ width: 400 }} title="CloudSnap">
        <Tabs
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={onFinish}>
                  <Form.Item name="email" label="邮箱" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                    <Input.Password />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={onRegister}>
                  <Form.Item name="name" label="昵称" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
                    <Input.Password />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

// frontend/src/components/PhotoGallery.jsx - 照片库
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Upload, Button, Spin, Empty, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { photosAPI } from '../api/photos';
import { usePhotosStore } from '../store/photos';
import { useAuthStore } from '../store/auth';

export default function PhotoGallery() {
  const { photos, setPhotos, removePhoto } = usePhotosStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await photosAPI.getList({ page: 1, limit: 50 });
      setPhotos(data.photos);
    } catch (err) {
      message.error('加载照片失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const photo = await photosAPI.upload(formData);
      usePhotosStore.getState().addPhoto(photo);
      message.success('上传成功');
    } catch (err) {
      message.error('上传失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await photosAPI.delete(id);
      removePhoto(id);
      message.success('删除成功');
    } catch (err) {
      message.error('删除失败');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>我的照片库</h1>

      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
      >
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 20 }}>
          上传照片
        </Button>
      </Upload>

      {loading ? (
        <Spin />
      ) : photos.length === 0 ? (
        <Empty description="暂无照片" />
      ) : (
        <Row gutter={[16, 16]}>
          {photos.map((photo) => (
            <Col key={photo.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                style={{ position: 'relative' }}
                cover={<img alt={photo.originalName} src={photo.url} style={{ height: 200, objectFit: 'cover' }} />}
              >
                <Card.Meta
                  title={photo.originalName}
                  description={`${(photo.size / 1024 / 1024).toFixed(2)} MB`}
                />
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(photo.id)}
                  style={{ position: 'absolute', top: 10, right: 10 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

// frontend/src/components/Sessions.jsx - 会话管理
import React, { useEffect, useState } from 'react';
import { List, Card, Button, Form, Input, InputNumber, Modal, message } from 'antd';
import { sessionsAPI } from '../api/sessions';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await sessionsAPI.getList();
      setSessions(data);
    } catch (err) {
      message.error('加载会话失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      const session = await sessionsAPI.create(values);
      setSessions([session, ...sessions]);
      setIsModalVisible(false);
      form.resetFields();
      message.success('创建成功');
    } catch (err) {
      message.error('创建失败');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>拍摄会话</h1>

      <Button
        type="primary"
        onClick={() => setIsModalVisible(true)}
        style={{ marginBottom: 20 }}
      >
        创建新会话
      </Button>

      <Modal
        title="创建拍摄会话"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreate}>
          <Form.Item name="name" label="会话名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="captureDays" label="拍摄天数" rules={[{ required: true }]}>
            <InputNumber min={1} max={30} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <List
        loading={loading}
        dataSource={sessions}
        renderItem={(session) => (
          <List.Item>
            <Card style={{ width: '100%' }}>
              <h3>{session.name}</h3>
              <p>参与人数: {session.participants?.length || 0}</p>
              <p>照片数: {session.photos?.length || 0}</p>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}

// frontend/src/App.jsx - 主应用
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { useAuthStore } from './store/auth';
import Login from './components/Login';
import PhotoGallery from './components/PhotoGallery';
import Sessions from './components/Sessions';

export default function App() {
  const { user, logout } = useAuthStore();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Header>
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['1']}>
            <Menu.Item key="1">CloudSnap</Menu.Item>
            <Menu.Item key="2" onClick={logout}>
              登出
            </Menu.Item>
          </Menu>
        </Layout.Header>

        <Layout.Content>
          <Routes>
            <Route path="/" element={<PhotoGallery />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </BrowserRouter>
  );
}
