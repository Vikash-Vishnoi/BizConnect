import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {LoginCredentials, LoginResponse, User} from '../types/auth';

// Backend API URL
// Use 'http://10.0.2.2:3000/api' for Android emulator
// Use 'http://localhost:3000/api' for iOS simulator or web
// Use your actual server IP for physical devices (e.g., 'http://192.168.1.100:3000/api')
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000/api' // Development: Android emulator
  : 'https://your-production-api.com/api'; // Production

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.multiRemove(['authToken', 'userData']);
    }
    return Promise.reject(error);
  },
);

// Registration credentials interface
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

// Authentication API calls
export const authAPI = {
  // Register
  register: async (credentials: RegisterCredentials): Promise<LoginResponse> => {
    try {
      const response = await api.post('/auth/register', credentials);
      return {
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Registration failed. Please try again.');
    }
  },

  // Login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await api.post('/auth/login', credentials);
      return {
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  // Get current user
  me: async (): Promise<User> => {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error: any) {
      throw new Error('Failed to fetch user data');
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if API call fails, we still want to clear local storage
      console.warn('Logout API call failed, but clearing local data');
    }
  },
};

export default api;
