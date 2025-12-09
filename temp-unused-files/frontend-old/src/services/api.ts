import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {LoginCredentials, LoginResponse, User} from '../types/auth';
import { config } from '../config/environment';

const API_BASE_URL = config.apiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add business context header for multi-business support
    const currentBusinessId = await AsyncStorage.getItem('currentBusinessId');
    if (currentBusinessId) {
      config.headers['X-Business-ID'] = currentBusinessId;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
    }
    return Promise.reject(error);
  },
);

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export const authAPI = {
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

  me: async (): Promise<User> => {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error: any) {
      throw new Error('Failed to fetch user data');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed, but clearing local data');
    }
  },

  updateProfile: async (data: { name: string }): Promise<User> => {
    try {
      const response = await api.put('/auth/profile', data);
      return response.data.user;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to update profile');
    }
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    try {
      await api.put('/auth/password', data);
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to change password');
    }
  },
};

export default api;
