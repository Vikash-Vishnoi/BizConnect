/**
 * User Type Authorization Middleware
 * 
 * Enforces the 4-tier user system:
 * - Super Admin: Full access
 * - Business Admin: Full access to their business
 * - Manager: Complete inbox access, view-only others
 * - Normal User: View-only access
 */

/**
 * Require specific user type(s)
 * @param {string|string[]} allowedTypes - User type(s) that can access the route
 */ 
const requireUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
    
    if (!types.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: types,
        current: req.user.userType
      });
    }

    next();
  };
};

/**
 * Require Super Admin only
 */
const requireSuperAdmin = requireUserType('super_admin');

/**
 * Require Business Admin or Super Admin
 */
const requireBusinessAdmin = requireUserType(['super_admin', 'business_admin']);

/**
 * Require Manager or higher (Manager, Business Admin, Super Admin)
 */
const requireManager = requireUserType(['super_admin', 'business_admin', 'manager']);

/**
 * Check if user can modify data
 * - Super Admin: Yes
 * - Business Admin: Yes (their business)
 * - Manager: Only inbox
 * - Normal User: No
 */
const canModify = (module = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { userType } = req.user;

    // Super Admin can modify everything
    if (userType === 'super_admin') {
      return next();
    }

    // Business Admin can modify everything in their business
    if (userType === 'business_admin') {
      return next();
    }

    // Manager can only modify inbox
    if (userType === 'manager') {
      if (module === 'inbox' || module === 'conversations') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Managers can only modify inbox data'
      });
    }

    // Normal User cannot modify anything
    return res.status(403).json({
      success: false,
      message: 'Normal users have view-only access'
    });
  };
};

/**
 * Ensure user can only access their business data
 * (except Super Admin who can access all businesses)
 */
const requireBusinessAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Super Admin can access all businesses
  if (req.user.userType === 'super_admin') {
    return next();
  }

  // Get businessId from request (params, query, or body)
  const businessId = req.params.businessId || req.query.businessId || req.body.businessId;

  // If no businessId in request, use user's businessId
  if (!businessId) {
    if (!req.user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'No business access'
      });
    }
    return next();
  }

  // Check if user can access this business
  if (!req.user.canAccessBusiness(businessId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this business'
    });
  }

  next();
};

/**
 * Check permission for specific action and module
 * @param {string} action - Action to check (create, read, update, delete, manage)
 * @param {string} module - Module name (optional)
 */
const checkPermission = (action, module = null) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.hasPermission(action, module)) {
      const roleInfo = req.user.getRoleInfo();
      return res.status(403).json({
        success: false,
        message: `Your role (${roleInfo.name}) does not have permission to ${action} ${module || 'this resource'}`,
        userType: req.user.userType,
        requiredPermission: { action, module }
      });
    }

    next();
  };
};

/**
 * Log user action for audit
 */
const logUserAction = (action, module) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    try {
      const AuditLog = require('../database/models/AuditLog');
      await AuditLog.logAction({
        user: req.user,
        action: action || 'SYSTEM_INFO',
        resourceType: module || 'SYSTEM',
        description: `${action} on ${module} by ${req.user.name || req.user.email}`,
        status: 'SUCCESS',
        requestData: {
          method: req.method,
          endpoint: req.path,
          params: req.params
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't fail the request if audit logging fails
    }

    next();
  };
};

module.exports = {
  requireUserType,
  requireSuperAdmin,
  requireBusinessAdmin,
  requireManager,
  canModify,
  requireBusinessAccess,
  checkPermission,
  logUserAction
};
