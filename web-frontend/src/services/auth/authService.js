/**
 * Authentication Service
 * 
 * @module services/auth/authService
 * @description Service for user authentication, registration, profile management,
 * and token operations. Handles all auth-related API interactions with JWT-based security.
 * 
 * @features
 * - User registration with email/password
 * - User login with credential validation
 * - Secure logout with token invalidation
 * - JWT token verification
 * - User profile retrieval and updates
 * - Password change with validation
 * 
 * @api-endpoints
 * Authentication:
 * - POST /auth/register - Register new user
 * - POST /auth/login - Login user
 * - POST /auth/logout - Logout user
 * - GET /auth/verify - Verify JWT token
 * 
 * Profile:
 * - GET /auth/me - Get current user profile
 * - PUT /auth/profile - Update user profile
 * - PUT /auth/password - Change password
 * 
 * @security
 * - JWT tokens stored in localStorage
 * - Bearer token authentication
 * - Secure password hashing (backend)
 * - Token expiration handling
 * 
 * @example
 * import * as authService from './authService';
 * 
 * // Register new user
 * const result = await authService.register({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 *   name: 'John Doe'
 * });
 * 
 * // Login
 * const { user, token } = await authService.login({
 *   email: 'user@example.com',
 *   password: 'SecurePass123'
 * });
 * 
 * // Change password
 * await authService.changePassword({
 *   currentPassword: 'OldPass123',
 *   newPassword: 'NewPass456'
 * });
 */

import { get, post, put } from '../api';

/**
 * @constant {Object} AUTH_ENDPOINTS - API endpoint paths for auth service
 */
const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  VERIFY: '/auth/verify',
  PROFILE: '/auth/profile',
  PASSWORD: '/auth/password'
};

/**
 * @typedef {Object} RegisterData
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {string} [businessName]
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {Object} data.user
 * @property {string} data.token
 * @property {string} [data.refreshToken]
 * @property {Object} [data.setupStatus]
 * @property {string} message
 */

/**
 * Register new user account
 * @param {RegisterData} data - Registration data
 * @returns {Promise<AuthResponse>} Created user and token
 */
export const register = async (data) => {
  return await post(AUTH_ENDPOINTS.REGISTER, data);
};

/**
 * Login user with credentials
 * @param {LoginCredentials} credentials - Login credentials
 * @returns {Promise<AuthResponse>} User data and JWT token
 */
export const login = async (credentials) => {
  return await post(AUTH_ENDPOINTS.LOGIN, credentials);
};

/**
 * Logout current user and invalidate token
 * @returns {Promise<Object>} Logout confirmation
 */
export const logout = async () => {
  return await post(AUTH_ENDPOINTS.LOGOUT);
};

/**
 * Get current authenticated user profile
 * @returns {Promise<Object>} User profile data (id, name, email, role, businessId)
 */
export const getMe = async () => {
  return await get(AUTH_ENDPOINTS.ME);
};

/**
 * Verify JWT token validity
 * @returns {Promise<Object>} Verification result ({ valid, user })
 */
export const verifyToken = async () => {
  return await get(AUTH_ENDPOINTS.VERIFY);
};

/**
 * Update user profile information
 * @param {Object} data - Profile updates (name, phone, avatar, preferences)
 * @returns {Promise<Object>} Updated user profile
 */
export const updateProfile = async (data) => {
  return await put(AUTH_ENDPOINTS.PROFILE, data);
};

/**
 * Change user password
 * @param {Object} data - Password data (currentPassword, newPassword)
 * @returns {Promise<Object>} Password change confirmation
 */
export const changePassword = async (data) => {
  return await put(AUTH_ENDPOINTS.PASSWORD, data);
};

export default {
  register,
  login,
  logout,
  getMe,
  verifyToken,
  updateProfile,
  changePassword
};


