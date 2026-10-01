// ============================================================
// CloudSnap Web 前端 - 相机功能完整实现
// ============================================================

// frontend/src/components/CameraView.jsx - Web 相机组件
import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Card, Spin, Space, Tooltip } from 'antd';
import { CameraOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { photosAPI } from '../api/photos';
import './CameraView.css';

export default function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isFacingUser, setIsFacingUser] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [constraints, setConstraints] = useState({
    video: { facingMode: 'user' },
    audio: false,
  });

  // 启动相机
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setHasPermission(true);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        message.error('请允许访问相机');
      } else {
        message.error('无法访问相机: ' + err.message);
      }
    }
  };

  // 停止相机
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  // 拍照
  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    const video = videoRef.current;

    // 设置 canvas 尺寸与视频相同
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    // 绘制视频帧到 canvas
    if (isFacingUser) {
      // 翻转前置摄像头图像
      context.scale(-1, 1);
      context.drawImage(video, -video.videoWidth, 0);
    } else {
      context.drawImage(video, 0, 0);
    }

    // 获取 base64 图像
    const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
  };

  // 重新拍摄
  const retake = () => {
    setCapturedPhoto(null);
  };

  // 上传照片
  const uploadPhoto = async () => {
    if (!capturedPhoto) return;

    setUploading(true);
    try {
      // 将 base64 转换为 Blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();

      // 创建 FormData
      const formData = new FormData();
      formData.append('photo', blob, 'photo.jpg');

      // 上传
      await photosAPI.upload(formData);
      message.success('照片已上传');
      setCapturedPhoto(null);
    } catch (err) {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 切换摄像头
  const switchCamera = () => {
    stopCamera();
    const newFacingMode = isFacingUser ? 'environment' : 'user';
    setConstraints({
      video: { facingMode: newFacingMode },
      audio: false,
    });
    setIsFacingUser(!isFacingUser);
    setTimeout(startCamera, 100);
  };

  // 初始化
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [constraints]);

  return (
    <div className="camera-view">
      <Card title="📷 CloudSnap 相机" style={{ maxWidth: 600, margin: '0 auto' }}>
        {!capturedPhoto ? (
          <div className="camera-container">
            {/* 视频预览 */}
            <div className="video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  borderRadius: 8,
                  backgroundColor: '#000',
                  transform: isFacingUser ? 'scaleX(-1)' : 'none',
                }}
              />
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
            </div>

            {/* 控制按钮 */}
            <Space style={{ marginTop: 20, justifyContent: 'center', width: '100%' }} direction="vertical">
              <Space>
                <Tooltip title="拍照">
                  <Button
                    type="primary"
                    size="large"
                    icon={<CameraOutlined />}
                    onClick={takePicture}
                    disabled={!cameraActive}
                  >
                    拍照
                  </Button>
                </Tooltip>

                <Tooltip title="切换摄像头">
                  <Button
                    size="large"
                    onClick={switchCamera}
                  >
                    切换
                  </Button>
                </Tooltip>
              </Space>
            </Space>
          </div>
        ) : (
          // 预览和上传
          <div className="preview-container">
            <img
              src={capturedPhoto}
              alt="captured"
              style={{
                width: '100%',
                borderRadius: 8,
                maxHeight: 400,
                objectFit: 'cover',
              }}
            />

            <Space style={{ marginTop: 20, justifyContent: 'center', width: '100%' }}>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={retake}
              >
                重新拍摄
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={uploadPhoto}
                loading={uploading}
              >
                {uploading ? '上传中...' : '上传'}
              </Button>
            </Space>
          </div>
        )}

        {/* 使用说明 */}
        <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f2f5', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 12 }}>
            💡 提示: 允许浏览器访问您的摄像头，然后点击"拍照"按钮
          </p>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// frontend/src/components/CameraView.css - 样式
// ============================================================

export default `
.camera-view {
  padding: 20px;
}

.camera-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-wrapper {
  position: relative;
  width: 100%;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-wrapper video {
  display: block;
  width: 100%;
  height: auto;
}

.preview-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-container img {
  max-height: 500px;
  object-fit: cover;
}

@media (max-width: 600px) {
  .camera-view {
    padding: 10px;
  }

  .video-wrapper video {
    max-height: 60vh;
  }
}
`;

// ============================================================
// frontend/src/components/SwiperView.jsx - 滑动页面组件
// ============================================================

import React, { useRef, useState } from 'react';
import { Layout, Tabs } from 'antd';
import CameraView from './CameraView';
import PhotoGallery from './PhotoGallery';
import Sessions from './Sessions';
import './SwiperView.css';

export default function SwiperView() {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('0');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    const currentTab = parseInt(activeTab);

    if (isLeftSwipe && currentTab < 2) {
      setActiveTab(String(currentTab + 1));
    }

    if (isRightSwipe && currentTab > 0) {
      setActiveTab(String(currentTab - 1));
    }
  };

  return (
    <div
      ref={containerRef}
      className="swiper-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: '0',
            label: '📷 相机',
            children: <CameraView />,
          },
          {
            key: '1',
            label: '📸 相册',
            children: <PhotoGallery />,
          },
          {
            key: '2',
            label: '👥 会话',
            children: <Sessions />,
          },
        ]}
      />

      {/* 滑动提示 */}
      <div className="swipe-hint">
        <span>👈 向左/右滑动切换 →</span>
      </div>
    </div>
  );
}

// ============================================================
// frontend/src/components/SwiperView.css
// ============================================================

export default `
.swiper-container {
  position: relative;
  width: 100%;
  overflow-x: hidden;
  touch-action: pan-y;
}

.swipe-hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  animation: fadeInOut 2s ease-in-out;
  pointer-events: none;
}

@keyframes fadeInOut {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .swiper-container {
    flex: 1;
  }
}
`;

// ============================================================
// frontend/src/App.jsx - 更新主应用
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuthStore } from './store/auth';
import Login from './components/Login';
import SwiperView from './components/SwiperView';

export default function App() {
  const { user, logout } = useAuthStore();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ color: 'white', margin: 0 }}>CloudSnap</h1>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              登出
            </button>
          </div>
        </Layout.Header>

        <Layout.Content>
          <Routes>
            <Route path="/" element={<SwiperView />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </BrowserRouter>
  );
}
`;
