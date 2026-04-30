import axios from 'axios';
import { message } from 'antd';
import { API_URL } from './config';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // BUG-006: Send cookies with requests
});

// Add a request interceptor to attach the token (Fallback for non-cookie auth)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // BUG-014: Show error toast
    const errorMsg = error.response?.data?.message || "Something went wrong";
    message.error(errorMsg);

    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      // window.location.href = '/'; // Avoid forced reload if possible
    }
    return Promise.reject(error);
  }
);

export default api;
