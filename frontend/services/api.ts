import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

import { Platform } from 'react-native';
import * as Device from 'expo-device';

// 🔧 Physical machine's IP for testing on same WiFi network
const DEV_MACHINE_IP = '192.168.0.112';

export const API_URL = 'https://api.hotelpro.aksayah.com/api';
// export const API_URL = 'http://192.168.0.112:5000/api';

const getBaseUrl = () => {
  // Use live hosted production URL as active base
  return API_URL;

  /* Dev toggle options (if needed for local development):
  if (__DEV__) {
    if (Device.isDevice) {
      console.log(`[API Config] Running on Physical Device. Connecting to: http://${DEV_MACHINE_IP}:5000/api`);
      return `http://${DEV_MACHINE_IP}:5000/api`;
    }
    
    const emulatorUrl = Platform.select({
      android: 'http://10.0.2.2:5000/api',
      ios: 'http://localhost:5000/api',
      default: 'http://localhost:5000/api',
    });
    console.log(`[API Config] Running on Emulator/Simulator. Connecting to: ${emulatorUrl}`);
    return emulatorUrl;
  }
  return `http://${DEV_MACHINE_IP}:5000/api`;
  */
};

export const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Adjusted timeout as per Android network fix requirements
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
