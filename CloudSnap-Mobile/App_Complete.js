// ============================================================
// CloudSnap Mobile App - React Native 完整实现
// ============================================================

// mobile/app.json
{
  "expo": {
    "name": "CloudSnap",
    "slug": "cloudsnap",
    "version": "1.0.0",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.cloudsnap.app"
    },
    "android": {
      "package": "com.cloudsnap.app",
      "versionCode": 1
    },
    "plugins": [
      ["expo-image-picker", { "photosPermission": "选择您要上传的照片" }],
      ["expo-camera", { "cameraPermission": "CloudSnap 需要访问您的相机" }]
    ]
  }
}

// mobile/src/api/client.js - API 客户端
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('authToken');
    }
    throw error.response?.data || error;
  }
);

export default client;

// mobile/src/api/auth.js - 认证 API
import client from './client';

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  getProfile: () => client.get('/user/profile'),
  updateProfile: (data) => client.put('/user/profile', data),
};

// mobile/src/api/photos.js - 照片 API
import client from './client';

export const photosAPI = {
  upload: (formData) => client.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getList: (params) => client.get('/photos', { params }),
  delete: (id) => client.delete(`/photos/${id}`),
};

// mobile/src/screens/LoginScreen.js - 登录屏幕
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/auth';

export default function LoginScreen({ setUser, setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('错误', '请填写所有字段');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await authAPI.login({ email, password });
      } else {
        result = await authAPI.register({ email, password, name });
      }

      await AsyncStorage.setItem('authToken', result.token);
      setToken(result.token);
      setUser(result.user);
    } catch (err) {
      Alert.alert('错误', err.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CloudSnap</Text>

      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="昵称"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="邮箱"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? '登录' : '注册'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsLogin(!isLogin)}
        disabled={loading}
      >
        <Text style={styles.switchText}>
          {isLogin ? '没有账户？注册' : '已有账户？登录'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#1890ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#1890ff',
    textAlign: 'center',
    marginTop: 15,
  },
});

// mobile/src/screens/PhotoScreen.js - 照片屏幕
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AntDesign } from '@expo/vector-icons';
import { photosAPI } from '../api/photos';

export default function PhotoScreen() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.cancelled && result.uri) {
      try {
        const formData = new FormData();
        formData.append('photo', {
          uri: result.uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        });

        const photo = await photosAPI.upload(formData);
        setPhotos([photo, ...photos]);
      } catch (err) {
        Alert.alert('错误', '上传失败');
      }
    }
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
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#1890ff" style={styles.loader} />
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
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
  uploadBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  photoItem: {
    position: 'relative',
    marginBottom: 10,
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

// mobile/src/screens/ProfileScreen.js - 个人资料屏幕
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/auth';

export default function ProfileScreen({ user, setUser, setToken }) {
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const updated = await authAPI.updateProfile({ name });
      setUser(updated);
      Alert.alert('成功', '个人资料已更新');
    } catch (err) {
      Alert.alert('错误', '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>昵称</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        editable={!loading}
      />

      <Text style={styles.label}>邮箱</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={user?.email}
        editable={false}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? '更新中...' : '更新'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>登出</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#1890ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 20,
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: 'red',
    fontSize: 16,
    fontWeight: '600',
  },
});

// mobile/App.js - 主应用入口
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import PhotoScreen from './src/screens/PhotoScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

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
      if (storedToken) {
        setToken(storedToken);
        // 这里可以调用 API 获取用户信息
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!token) {
    return (
      <LoginScreen
        setUser={setUser}
        setToken={setToken}
      />
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Photos') iconName = 'picture';
            else if (route.name === 'Profile') iconName = 'user';
            return <AntDesign name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#1890ff',
          tabBarInactiveTintColor: '#999',
        })}
      >
        <Tab.Screen
          name="Photos"
          component={PhotoScreen}
          options={{ title: '我的照片' }}
        />
        <Tab.Screen
          name="Profile"
          component={() => (
            <ProfileScreen user={user} setUser={setUser} setToken={setToken} />
          )}
          options={{ title: '个人资料' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
