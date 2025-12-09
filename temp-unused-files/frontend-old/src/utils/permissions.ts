/**
 * Permission Helper
 * Utilities for checking user permissions in the frontend
 * Works with the new 4-tier user system
 */

import type { User } from '../types/auth';

/**
 * User type hierarchy (from highest to lowest access)
 */
const USER_TYPE_LEVELS = {
  super_admin: 4,
  business_admin: 3,
  manager: 2,
  normal_user: 1,
};

/**
 * Check if user has a specific capability
 */
export const hasCapability = (user: User | null, capability: keyof NonNullable<User['capabilities']>): boolean => {
  if (!user || !user.capabilities) return false;
  return user.capabilities[capability] === true;
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.userType === 'super_admin';
};

/**
 * Check if user is business admin
 */
export const isBusinessAdmin = (user: User | null): boolean => {
  return user?.userType === 'business_admin';
};

/**
 * Check if user is manager
 */
export const isManager = (user: User | null): boolean => {
  return user?.userType === 'manager';
};

/**
 * Check if user is normal user
 */
export const isNormalUser = (user: User | null): boolean => {
  return user?.userType === 'normal_user';
};

/**
 * Check if user has at least a certain user type level
 * @param user - User object
 * @param minUserType - Minimum required user type
 */
export const hasMinimumUserType = (
  user: User | null,
  minUserType: 'super_admin' | 'business_admin' | 'manager' | 'normal_user'
): boolean => {
  if (!user) return false;
  const userLevel = USER_TYPE_LEVELS[user.userType] || 0;
  const requiredLevel = USER_TYPE_LEVELS[minUserType] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Check if user can access inbox
 */
export const canAccessInbox = (user: User | null): boolean => {
  return hasCapability(user, 'canAccessInbox');
};

/**
 * Check if user can manage settings
 */
export const canManageSettings = (user: User | null): boolean => {
  return hasCapability(user, 'canManageSettings');
};

/**
 * Check if user can manage team
 */
export const canManageTeam = (user: User | null): boolean => {
  return hasCapability(user, 'canManageTeam');
};

/**
 * Check if user can manage campaigns
 */
export const canManageCampaigns = (user: User | null): boolean => {
  return hasCapability(user, 'canManageCampaigns');
};

/**
 * Check if user can manage templates
 */
export const canManageTemplates = (user: User | null): boolean => {
  return hasCapability(user, 'canManageTemplates');
};

/**
 * Check if user can view analytics
 */
export const canViewAnalytics = (user: User | null): boolean => {
  return hasCapability(user, 'canViewAnalytics');
};

/**
 * Check if user can manage automations
 */
export const canManageAutomations = (user: User | null): boolean => {
  return hasCapability(user, 'canManageAutomations');
};

/**
 * Check if user can manage flows
 */
export const canManageFlows = (user: User | null): boolean => {
  return hasCapability(user, 'canManageFlows');
};

/**
 * Check if user can switch businesses (only super_admin)
 */
export const canSwitchBusinesses = (user: User | null): boolean => {
  return isSuperAdmin(user);
};

/**
 * Get user type display name
 */
export const getUserTypeDisplayName = (userType: User['userType']): string => {
  const displayNames = {
    super_admin: 'Super Admin',
    business_admin: 'Business Admin',
    manager: 'Manager',
    normal_user: 'User',
  };
  return displayNames[userType] || 'Unknown';
};

/**
 * Get user type badge color
 */
export const getUserTypeBadgeColor = (userType: User['userType']): string => {
  const colors = {
    super_admin: '#9c27b0', // Purple
    business_admin: '#f44336', // Red
    manager: '#ff9800', // Orange
    normal_user: '#4caf50', // Green
  };
  return colors[userType] || '#757575';
};

/**
 * Check if feature is enabled for user
 * This can be expanded to include feature flags
 */
export const isFeatureEnabled = (user: User | null, feature: string): boolean => {
  if (!user) return false;
  
  // Feature flag logic can be added here
  // For now, return based on capabilities
  
  switch (feature) {
    case 'inbox':
      return canAccessInbox(user);
    case 'campaigns':
      return canManageCampaigns(user);
    case 'templates':
      return canManageTemplates(user);
    case 'analytics':
      return canViewAnalytics(user);
    case 'automations':
      return canManageAutomations(user);
    case 'flows':
      return canManageFlows(user);
    case 'settings':
      return canManageSettings(user);
    case 'team':
      return canManageTeam(user);
    case 'business_switch':
      return canSwitchBusinesses(user);
    default:
      return false;
  }
};

/**
 * Get list of accessible features for user
 */
export const getAccessibleFeatures = (user: User | null): string[] => {
  if (!user) return [];
  
  const features = [
    'inbox',
    'campaigns',
    'templates',
    'analytics',
    'automations',
    'flows',
    'settings',
    'team',
    'business_switch',
  ];
  
  return features.filter(feature => isFeatureEnabled(user, feature));
};

export default {
  hasCapability,
  isSuperAdmin,
  isBusinessAdmin,
  isManager,
  isNormalUser,
  hasMinimumUserType,
  canAccessInbox,
  canManageSettings,
  canManageTeam,
  canManageCampaigns,
  canManageTemplates,
  canViewAnalytics,
  canManageAutomations,
  canManageFlows,
  canSwitchBusinesses,
  getUserTypeDisplayName,
  getUserTypeBadgeColor,
  isFeatureEnabled,
  getAccessibleFeatures,
};
