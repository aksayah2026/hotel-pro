import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

// 🔧 UPDATE THIS to your machine's IP when testing on device
export const BASE_URL = 'http://192.168.0.102:5000/api';

// Live hosted
// export const BASE_URL = 'https://api.hotelpro.aksayah.com/api';


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      await AsyncStorage.removeItem('auth_tenant');
      await AsyncStorage.removeItem('auth_subscription');
      await AsyncStorage.removeItem('auth_expiry');
      await AsyncStorage.removeItem('auth_plan');
      DeviceEventEmitter.emit('auth_error');
    }
    return Promise.reject(error);
  }
);

export default api;
