import AsyncStorage from '@react-native-async-storage/async-storage';
import type {User} from '../types/auth';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';
const REMEMBER_ME_KEY = 'rememberMe';

export const storageService = {
  saveToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token:', error);
      throw new Error('Failed to save authentication data');
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  },

  removeToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  },

  saveUser: async (user: User): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
      throw new Error('Failed to save user data');
    }
  },

  getUser: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  },

  removeUser: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  },

  saveRememberMe: async (remember: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, remember.toString());
    } catch (error) {
      console.error('Failed to save remember me:', error);
    }
  },

  getRememberMe: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to get remember me:', error);
      return false;
    }
  },

  clearAuth: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, REMEMBER_ME_KEY]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  },
};
