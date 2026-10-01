import React, { useState } from 'react';
import { StyleSheet, View, Button, Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { API_BASE } from './services/api';

export default function App() {
  const [photo, setPhoto] = useState(null);
  const [uploadResult, setUploadResult] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.cancelled) {
      setPhoto(result.uri);
      const response = await api.uploadPhoto(result.uri);
      console.log('上传结果', response);
      setUploadResult(response.ok ? `上传成功: ${response.publicUrl}` : `上传失败: ${response.error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.apiText}>Supabase URL: {API_BASE}</Text>
      <Button title="选择照片" onPress={pickImage} />
      {uploadResult ? <Text style={styles.resultText}>{uploadResult}</Text> : null}
      {photo && <Image source={{ uri: photo }} style={styles.image} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  apiText: { fontSize: 12, color: '#666', marginBottom: 8, textAlign: 'center' },
  resultText: { marginTop: 12, fontSize: 12, color: '#333', textAlign: 'center' },
  image: { width: 300, height: 300, marginTop: 20 },
});
