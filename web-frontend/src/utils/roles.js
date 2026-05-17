/**
 * Role-Based Access Control (RBAC) Configuration
 * 
 * User Hierarchy:
 * 1. SUPER_ADMIN - Platform administrator (full access)
 * 2. BUSINESS_ADMIN - Business owner (business-level control)
 * 3. MANAGER - Team lead (team management)
 * 4. USER - Normal user (basic operations)
 */

/**
 * IMPORTANT: These roles MUST match backend exactly
 * Backend uses: super_admin, business_admin, manager, normal_user
 * 
 * 4-Tier Role System:
 * 1. super_admin - Platform owner (you)
 * 2. business_admin - Business owner (first registration)
 * 3. manager - Team lead (invited by business_admin)
 * 4. normal_user - Basic user (invited by business_admin)
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUSINESS_ADMIN: 'business_admin',
  MANAGER: 'manager',
  USER: 'normal_user' // Match backend User model enum
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Administrator',
  [ROLES.BUSINESS_ADMIN]: 'Business Administrator',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.USER]: 'User'
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Full platform access, manage all businesses',
  [ROLES.BUSINESS_ADMIN]: 'Manage business settings, team, and billing',
  [ROLES.MANAGER]: 'Manage campaigns, templates, and team members',
  [ROLES.USER]: 'Send messages, view analytics, manage contacts'
};

// Permission definitions
export const PERMISSIONS = {
  // Super Admin only
  MANAGE_ALL_BUSINESSES: 'manage_all_businesses',
  VIEW_PLATFORM_ANALYTICS: 'view_platform_analytics',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  
  // Business Admin
  MANAGE_BUSINESS_SETTINGS: 'manage_business_settings',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_TEAM: 'manage_team',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOG: 'view_audit_log',
  MANAGE_API_CREDENTIALS: 'manage_api_credentials',
  
  // Manager
  CREATE_CAMPAIGNS: 'create_campaigns',
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_AUTOMATION: 'manage_automation',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CONTACTS: 'manage_contacts',
  APPROVE_MESSAGES: 'approve_messages',
  
  // User (Basic)
  SEND_MESSAGES: 'send_messages',
  VIEW_INBOX: 'view_inbox',
  VIEW_CONTACTS: 'view_contacts',
  VIEW_OWN_ANALYTICS: 'view_own_analytics',
  USE_SAVED_REPLIES: 'use_saved_replies'
};

// Role-Permission mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    ...Object.values(PERMISSIONS) // All permissions
  ],
  
  [ROLES.BUSINESS_ADMIN]: [
    PERMISSIONS.MANAGE_BUSINESS_SETTINGS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.MANAGE_API_CREDENTIALS,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.MANAGE_AUTOMATION,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.APPROVE_MESSAGES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_OWN_ANALYTICS,
    PERMISSIONS.USE_SAVED_REPLIES
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.MANAGE_AUTOMATION,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.APPROVE_MESSAGES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_OWN_ANALYTICS,
    PERMISSIONS.USE_SAVED_REPLIES
  ],
  
  [ROLES.USER]: [
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_OWN_ANALYTICS,
    PERMISSIONS.USE_SAVED_REPLIES
  ]
};

// Page access by role
export const PAGE_ACCESS = {
  '/dashboard': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER],
  
  // Messaging
  '/inbox': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER],
  '/templates': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/templates/create': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  
  // Marketing
  '/campaigns': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/campaigns/create': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  
  // Analytics
  '/analytics': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/template-analytics': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/conversation-analytics': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  
  // Automation
  '/flows': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/saved-replies': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER],
  '/scheduled': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/welcome-message-settings': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  
  // Contacts
  '/contacts': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER],
  '/contact-history': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  
  // Admin
  '/business-settings': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  '/audit-log': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  '/errors-alerts': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER],
  '/phone-health': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  '/rate-limits': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  
  // Settings
  '/settings': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER, ROLES.USER],
  '/status-composer': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]
};

// Helper functions
export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

export const canAccessPage = (userRole, pagePath) => {
  const allowedRoles = PAGE_ACCESS[pagePath];
  if (!allowedRoles) return true; // Public page
  return allowedRoles.includes(userRole);
};

export const getRoleLevel = (role) => {
  const levels = {
    [ROLES.SUPER_ADMIN]: 4,
    [ROLES.BUSINESS_ADMIN]: 3,
    [ROLES.MANAGER]: 2,
    [ROLES.USER]: 1
  };
  return levels[role] || 0;
};

export const canManageRole = (currentUserRole, targetRole) => {
  return getRoleLevel(currentUserRole) > getRoleLevel(targetRole);
};
