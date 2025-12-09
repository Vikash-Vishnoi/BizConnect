/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * CRITICAL: This is the REAL security layer
 * Frontend RBAC is only for UX - all actual permission checks MUST happen here
 */

// Using your existing userType naming convention
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUSINESS_ADMIN: 'business_admin',
  MANAGER: 'manager',
  USER: 'normal_user'  // Maps to your 'normal_user' in User model
};

const PERMISSIONS = {
  MANAGE_ALL_BUSINESSES: 'manage_all_businesses',
  MANAGE_BUSINESS_SETTINGS: 'manage_business_settings',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_TEAM: 'manage_team',
  CREATE_CAMPAIGNS: 'create_campaigns',
  MANAGE_TEMPLATES: 'manage_templates',
  SEND_MESSAGES: 'send_messages',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CONTACTS: 'manage_contacts',
  MANAGE_AUTOMATIONS: 'manage_automations',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_COMPLIANCE: 'manage_compliance',
  ACCESS_API: 'access_api',
  VIEW_PHONE_HEALTH: 'view_phone_health',
  EXPORT_DATA: 'export_data'
};

// Role-Permission Mapping (Server-side source of truth)
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
  [ROLES.BUSINESS_ADMIN]: [
    PERMISSIONS.MANAGE_BUSINESS_SETTINGS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_COMPLIANCE,
    PERMISSIONS.ACCESS_API,
    PERMISSIONS.VIEW_PHONE_HEALTH,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.MANAGE_COMPLIANCE,
    PERMISSIONS.ACCESS_API,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.USER]: [
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.MANAGE_CONTACTS, // Read-only
    PERMISSIONS.ACCESS_API
  ]
};

/**
 * Check if a userType has a specific permission
 */
const hasPermission = (userType, permission) => {
  if (!userType || !ROLE_PERMISSIONS[userType]) {
    return false;
  }
  return ROLE_PERMISSIONS[userType].includes(permission);
};

/**
 * Middleware: Require specific role(s)
 * Usage: router.post('/campaigns', requireRole(['business_admin', 'manager']), createCampaign)
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    const userType = req.user.userType;
    
    if (!allowedRoles.includes(userType)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        userType: userType 
      });
    }

    next();
  };
};

/**
 * Middleware: Require specific permission(s)
 * Usage: router.post('/campaigns', requirePermission('create_campaigns'), createCampaign)
 */
const requirePermission = (permission) => {
  return (req, res, next) => { 
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    if (!hasPermission(req.user.userType, permission)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Access denied. Required permission: ${permission}`,
        userType: req.user.userType 
      });
    }

    next();
  };
};

/**
 * Middleware: Super Admin only
 */
const requireSuperAdmin = requireRole([ROLES.SUPER_ADMIN]);

/**
 * Middleware: Business Admin or above
 */
const requireBusinessAdmin = requireRole([ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN]);

/**
 * Middleware: Manager or above
 */
const requireManager = requireRole([ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.MANAGER]);

/**
 * Business Ownership Check
 * Ensures user can only access their own business data (except Super Admin)
 */
const requireBusinessOwnership = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Super Admin can access all businesses
  if (req.user.userType === ROLES.SUPER_ADMIN) {
    return next();
  }

  // Get businessId from request (could be in params, body, or query)
  // Check both :businessId and :id params (for routes like /business/:id)
  const requestedBusinessId = req.params.businessId || 
                               req.params.id ||
                               req.body.businessId || 
                               req.query.businessId;

  // Get user's businessId (handle both ObjectId and string)
  const userBusinessId = req.user.businessId?._id || req.user.businessId;

  // Debug logging
  console.log('🔍 Business Ownership Check:', {
    requestedBusinessId,
    userBusinessId: userBusinessId?.toString(),
    userType: req.user.userType,
    userId: req.user._id
  });

  // If no specific business is being requested, allow (e.g., listing all businesses)
  if (!requestedBusinessId) {
    return next();
  }

  // If user has no businessId, they cannot access any business
  if (!userBusinessId) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You are not associated with any business. Please complete business setup first.' 
    });
  }

  // If accessing a specific business, verify ownership
  if (requestedBusinessId.toString() !== userBusinessId.toString()) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You can only access your own business data' 
    });
  }

  next();
};

/**
 * Helper: Get role hierarchy level (1 = highest)
 */
const getRoleLevel = (role) => {
  const levels = {
    [ROLES.SUPER_ADMIN]: 1,
    [ROLES.BUSINESS_ADMIN]: 2,
    [ROLES.MANAGER]: 3,
    [ROLES.USER]: 4
  };
  return levels[role] || 999;
};

/**
 * Check if user can manage another user's role
 * Business admins can only manage roles below them
 */
const canManageRole = (managerRole, targetRole) => {
  const managerLevel = getRoleLevel(managerRole);
  const targetLevel = getRoleLevel(targetRole);
  
  // Super admin can manage anyone
  if (managerRole === ROLES.SUPER_ADMIN) return true;
  
  // Can only manage roles below you
  return managerLevel < targetLevel;
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  requireRole,
  requirePermission,
  rbac: requirePermission, // Alias for backward compatibility
  requireSuperAdmin,
  requireBusinessAdmin,
  requireManager,
  requireBusinessOwnership,
  canManageRole,
  getRoleLevel
};
