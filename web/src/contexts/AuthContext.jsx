/**
 * 🔐 Enhanced Auth Context
 * Manages authentication state, user profile, business context, and permissions
 * 
 * Features:
 * - JWT token management with refresh
 * - User profile state
 * - Business switching
 * - RBAC integration
 * - Persistent session
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ROLES, canAccessPage, hasPermission } from '../utils/roles';
import * as authService from '../services/auth/authService';
import * as businessService from '../services/business/businessService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  console.log('🔐 AuthProvider initializing...');
  console.log('🌍 Current URL:', window.location.href);
  console.log('📍 Current pathname:', window.location.pathname);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState(null);

  // Initialize auth state from storage
  useEffect(() => {
    console.log('🔄 AuthProvider useEffect triggered');
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    console.log('🔍 Initializing auth...');
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      console.log('📦 Stored token:', token ? 'exists' : 'none');
      console.log('📦 Stored user:', savedUser ? 'exists' : 'none');

      if (token && savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Verify token is still valid
        try {
          const verifyResponse = await authService.verifyToken();
          if (verifyResponse.valid) {
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
      console.log('✅ Auth initialization complete, loading set to false');
      setLoading(false);
    }
  };

  const loadBusinessContext = async (businessId) => {
    if (!businessId) {
      console.log('⚠️ No business ID provided, skipping business context load');
      return;
    }
    
    try {
      const response = await businessService.getBusinessById(businessId);
      const business = response.data || response; // Handle wrapped response
      setCurrentBusiness(business);
      console.log('✅ Business context loaded successfully:', { businessId: business?._id, name: business?.name });
    } catch (error) {
      // Silently handle 403 - user may not have business access yet
      if (error.response?.status === 403) {
        console.log('ℹ️ Business access not available - user may need to complete setup');
        setCurrentBusiness(null);
      } else {
        console.error('Failed to load business context:', error);
      }
    }
  };

  const login = useCallback(async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { user: userData, token } = response;

      // Set default role if not provided (userType comes from backend)
      const userWithRole = {
        ...userData,
        role: userData.userType || userData.role || 'normal_user'
      };

      // Save to state and storage
      setUser(userWithRole);
      localStorage.setItem('user', JSON.stringify(userWithRole));
      localStorage.setItem('token', token);

      // Load business context if available
      if (userWithRole.businessId) {
        await loadBusinessContext(userWithRole.businessId);
      }

      return { success: true, user: userWithRole };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      // Redirect to login
      window.location.href = '/login';
    }
  }, []);

  const clearAuth = () => {
    setUser(null);
    setCurrentBusiness(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUser = useCallback((updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, [user]);

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
  }, [user]);

  const refreshUserProfile = useCallback(async () => {
    try {
      const response = await authService.getMe();
      const userData = response.user;
      
      const userWithRole = {
        ...userData,
        role: userData.userType || userData.role || 'normal_user'
      };

      setUser(userWithRole);
      localStorage.setItem('user', JSON.stringify(userWithRole));

      if (userWithRole.businessId) {
        await loadBusinessContext(userWithRole.businessId);
      }

      return { success: true, user: userWithRole };
    } catch (error) {
      console.error('Profile refresh failed:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const canAccess = useCallback((pagePath) => {
    if (!user) return false;
    return canAccessPage(user.role, pagePath);
  }, [user]);

  const hasPermissionTo = useCallback((permission) => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  }, [user]);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const isBusinessAdmin = user?.role === ROLES.BUSINESS_ADMIN || isSuperAdmin;
  const isManager = user?.role === ROLES.MANAGER || isBusinessAdmin;

  const value = {
    user,
    loading,
    currentBusiness,
    login,
    logout,
    updateUser,
    switchBusiness,
    refreshUserProfile,
    canAccess,
    hasPermissionTo,
    isAuthenticated: !!user && !!localStorage.getItem('token'),
    role: user?.role || null,
    isSuperAdmin,
    isBusinessAdmin,
    isManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};


