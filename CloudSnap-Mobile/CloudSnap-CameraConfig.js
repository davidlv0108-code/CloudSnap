// ============================================================
// CloudSnap 相机权限管理和配置
// ============================================================

// mobile/src/utils/permissions.js - 权限管理工具
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export const PermissionManager = {
  // 检查并请求相机权限
  async requestCameraPermission() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        return { granted: true };
      } else if (status === 'denied') {
        Alert.alert(
          '相机权限被拒绝',
          '无法访问相机。请在设置中允许 CloudSnap 访问相机。',
          [
            { text: '取消' },
            { text: '前往设置', onPress: () => Linking.openSettings() },
          ]
        );
        return { granted: false, reason: 'denied' };
      }
    } catch (error) {
      console.error('请求相机权限失败:', error);
      return { granted: false, reason: 'error' };
    }
  },

  // 检查并请求相册权限
  async requestPhotoPermission() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        return { granted: true };
      } else {
        Alert.alert(
          '相册权限被拒绝',
          '无法访问您的相册。请在设置中允许 CloudSnap 访问。',
          [
            { text: '取消' },
            { text: '前往设置', onPress: () => Linking.openSettings() },
          ]
        );
        return { granted: false };
      }
    } catch (error) {
      console.error('请求相册权限失败:', error);
      return { granted: false };
    }
  },

  // 检查并请求媒体库权限
  async requestMediaLibraryPermission() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        return { granted: true };
      } else {
        return { granted: false };
      }
    } catch (error) {
      console.error('请求媒体库权限失败:', error);
      return { granted: false };
    }
  },

  // 一次性请求所有权限
  async requestAllPermissions() {
    const cameraPermission = await this.requestCameraPermission();
    const photoPermission = await this.requestPhotoPermission();
    const mediaLibraryPermission = await this.requestMediaLibraryPermission();

    return {
      camera: cameraPermission.granted,
      photos: photoPermission.granted,
      mediaLibrary: mediaLibraryPermission.granted,
    };
  },
};

// frontend/src/utils/cameraPermissions.js - Web 相机权限
export const WebCameraPermissions = {
  // 检查浏览器是否支持相机
  isCameraSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  },

  // 获取相机权限状态
  async getCameraStatus() {
    try {
      if (!this.isCameraSupported()) {
        return { supported: false, message: '浏览器不支持摄像头访问' };
      }

      const permissions = await navigator.permissions.query({ name: 'camera' });
      
      return {
        supported: true,
        status: permissions.state,
        message: this.getStatusMessage(permissions.state),
      };
    } catch (error) {
      return {
        supported: true,
        status: 'unknown',
        message: '无法确定权限状态',
      };
    }
  },

  // 获取摄像头列表
  async enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('获取摄像头列表失败:', error);
      return [];
    }
  },

  // 获取状态消息
  getStatusMessage(state) {
    const messages = {
      'granted': '✅ 摄像头权限已允许',
      'denied': '❌ 摄像头权限被拒绝',
      'prompt': '⚠️ 需要摄像头权限',
      'unknown': '❓ 权限状态未知',
    };
    return messages[state] || '未知状态';
  },
};

// ============================================================
// mobile/app.json - Expo 应用配置（相机权限）
// ============================================================

export const appConfig = {
  expo: {
    name: 'CloudSnap',
    slug: 'cloudsnap',
    version: '1.0.0',
    assetBundlePatterns: ['**/*'],
    
    // 权限配置
    plugins: [
      // 相机权限
      [
        'expo-camera',
        {
          cameraPermission: 'CloudSnap 需要访问您的相机来拍摄照片。',
          microphonePermission: '(可选) CloudSnap 需要访问您的麦克风。',
        },
      ],
      // 相册权限
      [
        'expo-image-picker',
        {
          photosPermission: 'CloudSnap 需要访问您的相册来上传照片。',
          cameraPermission: 'CloudSnap 需要访问您的相机。',
        },
      ],
      // 媒体库权限
      [
        'expo-media-library',
        {
          photosPermission: 'CloudSnap 需要访问您的照片库。',
          savePhotosPermission: 'CloudSnap 需要保存照片到您的库。',
        },
      ],
    ],

    ios: {
      supportsTabletMode: true,
      bundleIdentifier: 'com.cloudsnap.app',
      infoPlist: {
        NSCameraUsageDescription: 'CloudSnap 需要访问您的相机来拍摄照片。',
        NSPhotoLibraryUsageDescription: 'CloudSnap 需要访问您的相册来上传照片。',
        NSPhotoLibraryAddOnlyUsageDescription: 'CloudSnap 需要保存照片到您的库。',
        NSLocationWhenInUseUsageDescription: '(可选) CloudSnap 可以记录照片的位置信息。',
      },
    },

    android: {
      package: 'com.cloudsnap.app',
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ],
    },
  },
};

// ============================================================
// mobile/src/hooks/useCamera.js - 相机自定义 Hook
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { PermissionManager } from '../utils/permissions';
import { Camera } from 'expo-camera';

export const useCamera = () => {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState('back');
  const [zoom, setZoom] = useState(0);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);

  // 初始化相机权限
  useEffect(() => {
    initializeCamera();
  }, []);

  const initializeCamera = async () => {
    const permission = await PermissionManager.requestCameraPermission();
    setHasPermission(permission.granted);
  };

  // 拍照
  const takePicture = async (options = {}) => {
    if (!cameraRef.current) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: options.quality || 0.8,
        base64: options.base64 || false,
        exif: true,
        ...options,
      });
      return photo;
    } catch (error) {
      console.error('拍照失败:', error);
      return null;
    }
  };

  // 切换摄像头
  const toggleFacing = () => {
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  // 切换闪光灯
  const toggleFlash = () => {
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.on
        : Camera.Constants.FlashMode.off
    );
  };

  // 设置缩放
  const setZoomLevel = (level) => {
    setZoom(Math.max(0, Math.min(1, level)));
  };

  return {
    cameraRef,
    hasPermission,
    cameraReady,
    setCameraReady,
    facing,
    toggleFacing,
    zoom,
    setZoomLevel,
    flashMode,
    toggleFlash,
    takePicture,
  };
};

// ============================================================
// frontend/src/hooks/useWebCamera.js - Web 相机自定义 Hook
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { WebCameraPermissions } from '../utils/cameraPermissions';

export const useWebCamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isFacingUser, setIsFacingUser] = useState(true);

  // 初始化
  useEffect(() => {
    initializeCamera();
  }, []);

  const initializeCamera = async () => {
    if (!WebCameraPermissions.isCameraSupported()) {
      setHasPermission(false);
      return;
    }

    const devices = await WebCameraPermissions.enumerateDevices();
    setDevices(devices);
    setHasPermission(true);

    if (devices.length > 0) {
      setSelectedDeviceId(devices[0].deviceId);
    }
  };

  // 启动相机
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: isFacingUser ? 'user' : 'environment',
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } }),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error('启动相机失败:', error);
      setIsActive(false);
    }
  };

  // 停止相机
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setIsActive(false);
    }
  };

  // 拍照
  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const context = canvasRef.current.getContext('2d');
    const video = videoRef.current;

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    if (isFacingUser) {
      context.scale(-1, 1);
      context.drawImage(video, -video.videoWidth, 0);
    } else {
      context.drawImage(video, 0, 0);
    }

    return canvasRef.current.toDataURL('image/jpeg', 0.8);
  };

  // 切换摄像头
  const switchCamera = () => {
    stopCamera();
    setIsFacingUser(!isFacingUser);
    setTimeout(startCamera, 100);
  };

  return {
    videoRef,
    canvasRef,
    hasPermission,
    isActive,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isFacingUser,
    startCamera,
    stopCamera,
    takePicture,
    switchCamera,
  };
};
