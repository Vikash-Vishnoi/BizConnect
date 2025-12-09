/**
 * 🔐 Authentication Service
 * Handles all authentication-related API calls
 */

import { get, post, put } from '../api';

/**
 * Register new user
 */
export const register = async (data) => {
  return await post('/auth/register', data);
};

/**
 * Login user
 */
export const login = async (credentials) => {
  return await post('/auth/login', credentials);
};

/**
 * Logout user
 */
export const logout = async () => {
  return await post('/auth/logout');
};

/**
 * Get current user profile
 */
export const getMe = async () => {
  return await get('/auth/me');
};

/**
 * Verify JWT token
 */
export const verifyToken = async () => {
  return await get('/auth/verify');
};

/**
 * Update user profile
 */
export const updateProfile = async (data) => {
  return await put('/auth/profile', data);
};

/**
 * Change password
 */
export const changePassword = async (data) => {
  return await put('/auth/password', data);
};

