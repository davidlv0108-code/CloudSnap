// ============================================================
// CloudSnap 移动端 - 相机应用完整实现
// ============================================================

// mobile/App_WithCamera.js - 带相机功能的主应用
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CameraScreen from './src/screens/CameraScreen';
import PhotoLibraryScreen from './src/screens/PhotoLibraryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 主应用导航结构
function CameraTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'CameraTab') iconName = 'camera';
          else if (route.name === 'PhotosTab') iconName = 'picture';
          else if (route.name === 'ProfileTab') iconName = 'user';
          return <AntDesign name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1890ff',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{ title: '相机' }}
      />
      <Tab.Screen
        name="PhotosTab"
        component={PhotoLibraryScreen}
        options={{ title: '相册' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: '个人' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('authUser');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    AsyncStorage.setItem('authToken', authToken);
    AsyncStorage.setItem('authUser', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('authUser');
  };

  if (loading) {
    return null;
  }

  if (!token) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Login"
            component={() => <LoginScreen setUser={handleLogin} />}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="MainApp"
          component={CameraTabNavigator}
          initialParams={{ user, token, onLogout: handleLogout }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============================================================
// mobile/src/screens/CameraScreen.js - 相机屏幕（带手势滑动）
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { photosAPI } from '../api/photos';

export default function CameraScreen({ route }) {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState('back');
  const [zoom, setZoom] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 手势滑动管理
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // 向左滑动 (dx < 0) - 切换到相册
        // 向右滑动 (dx > 0) - 切换到个人资料
        // 这里会通过导航器处理
      },
    })
  ).current;

  // 申请相机权限
  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');

    if (status !== 'granted') {
      Alert.alert(
        '权限被拒绝',
        '需要相机权限才能使用此功能',
        [{ text: '确定' }]
      );
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
      });

      setCapturedPhoto(photo);
      setShowPreview(true);
    } catch (error) {
      Alert.alert('错误', '拍照失败');
      console.error('相机错误:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUpload = async () => {
    if (!capturedPhoto) return;

    setUploading(true);
    try {
      // 压缩图像
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        capturedPhoto.uri,
        [{ resize: { width: 1200, height: 1600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 上传照片
      const formData = new FormData();
      formData.append('photo', {
        uri: manipulatedImage.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      });

      const response = await photosAPI.upload(formData);
      Alert.alert('成功', '照片已上传');

      // 重置状态
      setCapturedPhoto(null);
      setShowPreview(false);
    } catch (error) {
      Alert.alert('错误', '上传失败');
      console.error('上传错误:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDiscard = () => {
    setCapturedPhoto(null);
    setShowPreview(false);
  };

  const toggleFacing = () => {
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>没有相机权限</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>重新授权</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {!showPreview ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={facing}
            zoom={zoom}
            onCameraReady={() => setCameraReady(true)}
          />

          {/* 顶部控制栏 */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleFacing}
            >
              <MaterialCommunityIcons
                name="camera-flip"
                size={24}
                color="white"
              />
            </TouchableOpacity>

            <Text style={styles.topBarText}>CloudSnap 相机</Text>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setZoom(zoom > 0 ? 0 : 0.5)}
            >
              <AntDesign
                name={zoom > 0 ? 'zoomout' : 'zoomin'}
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </View>

          {/* 底部拍照按钮 */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                isCapturing && styles.captureButtonDisabled,
              ]}
              onPress={handleCapture}
              disabled={isCapturing || !cameraReady}
            >
              {isCapturing ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <AntDesign name="camera" size={36} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* 底部提示 */}
          <View style={styles.hint}>
            <Text style={styles.hintText}>向左滑动查看相册</Text>
          </View>
        </>
      ) : (
        // 预览界面
        <View style={styles.container}>
          <Image
            source={{ uri: capturedPhoto.uri }}
            style={styles.preview}
          />

          <View style={styles.previewControls}>
            <TouchableOpacity
              style={[styles.button, styles.discardButton]}
              onPress={handleDiscard}
              disabled={uploading}
            >
              <AntDesign name="close" size={20} color="white" />
              <Text style={styles.buttonText}>重新拍摄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.uploadButton, uploading && { opacity: 0.6 }]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <AntDesign name="check" size={20} color="white" />
                  <Text style={styles.buttonText}>上传</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  preview: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discardButton: {
    backgroundColor: '#ff6b6b',
  },
  uploadButton: {
    backgroundColor: '#51cf66',
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});

// ============================================================
// mobile/src/screens/PhotoLibraryScreen.js - 相册屏幕（手势返回）
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { photosAPI } from '../api/photos';

export default function PhotoLibraryScreen({ route, navigation }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 手势滑动返回
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // 向右滑动返回相机
        if (gestureState.dx > 50) {
          navigation?.navigate('CameraTab');
        }
      },
    })
  ).current;

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await photosAPI.getList({ page: 1, limit: 50 });
      setPhotos(data.photos || []);
    } catch (err) {
      Alert.alert('错误', '加载照片失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert('确认', '确定要删除此照片吗？', [
      { text: '取消' },
      {
        text: '删除',
        onPress: async () => {
          try {
            await photosAPI.delete(id);
            setPhotos(photos.filter(p => p.id !== id));
          } catch (err) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const renderPhoto = ({ item }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.url }} style={styles.photo} />
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <AntDesign name="delete" size={20} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {loading ? (
        <ActivityIndicator size="large" color="#1890ff" style={styles.loader} />
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  photoItem: {
    position: 'relative',
    marginBottom: 10,
    width: '31%',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  deleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
  },
});
