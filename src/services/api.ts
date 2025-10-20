import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {LoginCredentials, LoginResponse, User} from '../types/auth';

// Backend API URL - Update this with your actual backend URL
const API_BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator localhost

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

// Authentication API calls
export const authAPI = {
  // Login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>(
        '/auth/login',
        credentials,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  // Get current user
  me: async (): Promise<User> => {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
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

// Mock login for testing (when backend is not ready)
export const mockLogin = async (
  credentials: LoginCredentials,
): Promise<LoginResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test credentials
  if (
    credentials.email === 'agent@hospital.com' &&
    credentials.password === 'password123'
  ) {
    return {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token',
      user: {
        id: 'user_001',
        name: 'John Agent',
        email: 'agent@hospital.com',
        role: 'agent',
      },
    };
  }

  throw new Error('Invalid email or password');
};

export default api;
