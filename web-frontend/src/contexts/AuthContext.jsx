/**
 * Authentication Context
 * 
 * @module contexts/AuthContext
 * @description Centralized authentication state management for the application.
 * Provides authentication state, user profile, business context, role-based access control (RBAC),
 * and session persistence. Handles JWT token management with refresh capabilities.
 * 
 * @features
 * - JWT token management with localStorage persistence
 * - User authentication (login/logout)
 * - User profile state management
 * - Business account switching
 * - Role-based access control (RBAC)
 * - Permission checking utilities
 * - Token verification and refresh
 * - Persistent session across page reloads
 * - Graceful offline handling
 * 
 * @context-values
 * State:
 * - user: Current authenticated user object
 * - loading: Auth initialization loading state
 * - currentBusiness: Currently selected business account
 * - isAuthenticated: Boolean auth status
 * - role: Current user role
 * 
 * Methods:
 * - login(credentials): Authenticate user
 * - logout(): Clear auth and redirect
 * - updateUser(updates): Update user profile
 * - switchBusiness(businessId): Switch active business
 * - refreshUserProfile(): Reload user data from server
 * - canAccess(pagePath): Check page access permission
 * - hasPermissionTo(permission): Check specific permission
 * 
 * Role Flags:
 * - isSuperAdmin: true if SUPER_ADMIN role
 * - isBusinessAdmin: true if BUSINESS_ADMIN or SUPER_ADMIN
 * - isManager: true if MANAGER, BUSINESS_ADMIN, or SUPER_ADMIN
 * 
 * @roles
 * - SUPER_ADMIN: Full system access
 * - BUSINESS_ADMIN: Business account management
 * - MANAGER: Team and campaign management
 * - AGENT: Message handling and support
 * - VIEWER: Read-only access
 * 
 * @storage
 * - localStorage.user: User profile JSON
 * - localStorage.token: JWT auth token
 * 
 * @example
 * // Wrap app with provider
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * 
 * @example
 * // Use in components
 * import { useAuth } from '../contexts/AuthContext';
 * 
 * function Dashboard() {
 *   const { user, isAuthenticated, logout, canAccess } = useAuth();
 *   
 *   if (!isAuthenticated) return <Navigate to="/login" />;
 *   if (!canAccess('/admin')) return <AccessDenied />;
 *   
 *   return <div>Welcome {user.name}</div>;
 * }
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ROLES, canAccessPage, hasPermission } from '../utils/roles';
import * as authService from '../services/auth/authService';
import * as businessService from '../services/business/businessService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState(null);

  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication state from localStorage
   * Verifies token validity and loads business context
   * @returns {Promise<void>}
   */
  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Verify token is still valid
        try {
          const verifyResponse = await authService.verifyToken();
          if (verifyResponse.data?.valid) {
            setUser(userData);
            
            // Load business context if available
            if (userData.businessId) {
              await loadBusinessContext(userData.businessId);
            }
          } else {
            // Token invalid, clear auth
            clearAuth();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          // If backend is unreachable, still set user from localStorage
          // They'll be redirected to login if any API call fails
          if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
            console.warn('Backend unreachable - using cached auth state');
            setUser(userData);
          } else {
            clearAuth();
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth:', error);
      // Don't clear auth on initialization errors
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load business context for current user
   * @param {string} businessId - Business ID to load
   * @returns {Promise<void>}
   */
  const loadBusinessContext = useCallback(async (businessId) => {
    if (!businessId) return;
    
    try {
      const response = await businessService.getBusinessById(businessId);
      const business = response.data || response; // Handle wrapped response
      setCurrentBusiness(business);
    } catch (error) {
      // Silently handle 403 - user may not have business access yet
      if (error.response?.status === 403) {
        setCurrentBusiness(null);
      } else {
        console.error('Failed to load business context:', error);
      }
    }
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const response = await authService.login(credentials);
      // The backend wraps the response in a 'data' object inside the main response
      const payload = response.data || response;
      const { user: userData, token, setupStatus } = payload;

      if (!userData || !token) {
        throw new Error('Invalid response from server');
      }

      // Set default role if not provided (userType comes from backend)
      const userWithRole = {
        ...userData,
        role: userData.userType || userData.role || 'normal_user'
      };

      // Save to state and storage
      setUser(userWithRole);
      localStorage.setItem('user', JSON.stringify(userWithRole));
      localStorage.setItem('token', token);
      if (payload.refreshToken) {
        localStorage.setItem('refreshToken', payload.refreshToken);
      }

      // Load business context if available
      if (userWithRole.businessId) {
        await loadBusinessContext(userWithRole.businessId);
      }

      return { success: true, user: userWithRole, setupStatus };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Login failed. Please try again.' 
      };
    }
  }, [loadBusinessContext]);

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Result object ({ success, user?, error? })
   */
  const register = useCallback(async (userData) => {
    try {
      const response = await authService.register(userData);
      const payload = response.data || response;
      const { user: newUserData, token, setupStatus } = payload;

      if (!newUserData || !token) {
        throw new Error('Invalid response from server');
      }

      const userWithRole = {
        ...newUserData,
        role: newUserData.userType || newUserData.role || 'normal_user'
      };

      setUser(userWithRole);
      localStorage.setItem('user', JSON.stringify(userWithRole));
      localStorage.setItem('token', token);
      if (payload.refreshToken) {
        localStorage.setItem('refreshToken', payload.refreshToken);
      }

      if (userWithRole.businessId) {
        await loadBusinessContext(userWithRole.businessId);
      }

      return { success: true, user: userWithRole, setupStatus };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Registration failed. Please try again.' 
      };
    }
  }, [loadBusinessContext]);

  /**
   * Logout user and clear authentication state
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      // Redirect to login (but only if not already there)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, []);

  /**
   * Clear authentication state and localStorage
   * @returns {void}
   */
  const clearAuth = () => {
    setUser(null);
    setCurrentBusiness(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  /**
   * Update user profile data
   * @param {Object} updates - Partial user object with updates
   * @returns {void}
   */
  const updateUser = useCallback((updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, [user]);

  /**
   * Switch to different business account
   * @param {string} businessId - Business ID to switch to
   * @returns {Promise<Object>} Result object ({ success, error? })
   */
  const switchBusiness = useCallback(async (businessId) => {
    try {
      await businessService.switchBusiness(businessId);
      await loadBusinessContext(businessId);
      
      // Update user with new business ID
      const updatedUser = { ...user, businessId };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true };
    } catch (error) {
      console.error('Business switch failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to switch business' 
      };
    }
  }, [user, loadBusinessContext]);

  const refreshUserProfile = useCallback(async () => {
    try {
      const response = await authService.getMe();
      const payload = response.data || response;
      const userData = payload.user;
      
      if (!userData) {
        throw new Error('Invalid response from server');
      }
      
      const userWithRole = {
        ...userData,
        role: userData.userType || userData.role || 'normal_user'
      };

      setUser(userWithRole);
      localStorage.setItem('user', JSON.stringify(userWithRole));

      if (userWithRole.businessId) {
        await loadBusinessContext(userWithRole.businessId);
      }

      return { success: true, user: userWithRole, setupStatus: payload.setupStatus };
    } catch (error) {
      console.error('Profile refresh failed:', error);
      return { success: false, error: error.message };
    }
  }, [loadBusinessContext]);

  /**
   * Check if user can access a page
   * @param {string} pagePath - Page path to check (e.g., '/admin', '/analytics')
   * @returns {boolean} true if user has access
   */
  const canAccess = useCallback((pagePath) => {
    if (!user) return false;
    return canAccessPage(user.role, pagePath);
  }, [user]);

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check (e.g., 'manage_team', 'send_messages')
   * @returns {boolean} true if user has permission
   */
  const hasPermissionTo = useCallback((permission) => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  }, [user]);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.userType === 'super_admin';
  const isBusinessAdmin = user?.role === ROLES.BUSINESS_ADMIN || user?.userType === 'business_admin' || isSuperAdmin;
  const isManager = user?.role === ROLES.MANAGER || user?.userType === 'manager' || isBusinessAdmin;
  const isAuthenticated = !!user;

  const value = useMemo(() => ({
    user,
    loading,
    currentBusiness,
    login,
    register,
    logout,
    updateUser,
    switchBusiness,
    refreshUserProfile,
    canAccess,
    hasPermissionTo,
    isAuthenticated,
    role: user?.role || user?.userType || null,
    capabilities: user?.capabilities || {},
    roleInfo: user?.roleInfo || {},
    isSuperAdmin,
    isBusinessAdmin,
    isManager,
  }), [
    user,
    loading,
    currentBusiness,
    login,
    register,
    logout,
    updateUser,
    switchBusiness,
    refreshUserProfile,
    canAccess,
    hasPermissionTo,
    isAuthenticated,
    isSuperAdmin,
    isBusinessAdmin,
    isManager,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};


