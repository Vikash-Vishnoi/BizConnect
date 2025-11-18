const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.token = token;
    
    // Get businessId from header or use currentBusiness
    const businessId = req.header('X-Business-ID') || user.currentBusiness;
    if (businessId) {
      req.businessId = businessId;
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Middleware to require business context
const requireBusiness = async (req, res, next) => {
  try {
    if (!req.businessId) {
      return res.status(400).json({ 
        error: 'Business context required',
        message: 'Please select a business or provide X-Business-ID header'
      });
    }
    
    // Load business
    const business = await Business.findById(req.businessId);
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    if (business.status !== 'active' || business.isDeleted) {
      return res.status(403).json({ error: 'Business is not active' });
    }
    
    // Check if user has access to this business
    if (!business.hasUser(req.user._id)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this business'
      });
    }
    
    // Attach business and role to request
    req.business = business;
    req.businessRole = business.getUserRole(req.user._id);
    
    next();
  } catch (error) {
    console.error('Business context error:', error);
    res.status(500).json({ error: 'Failed to load business context' });
  }
};

// Middleware to check business permission
const requireBusinessPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.business) {
        return res.status(400).json({ error: 'Business context required' });
      }
      
      if (!req.business.hasPermission(req.user._id, permission)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `You do not have permission: ${permission}`,
          requiredPermission: permission
        });
      }
      
      next();
    } catch (error) {
      console.error('Business permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user is admin (simplified 2-role system)
const isAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    res.status(403).json({ 
      error: 'Access denied. Admin privileges required.',
      message: 'Only admin users can access this resource'
    });
  } catch (error) {
    res.status(500).json({ error: 'Permission check failed' });
  }
};

// Middleware to check if user has a specific permission (simplified for 2-role system)
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }
      
      // User role only has inbox permissions
      const inboxPermissions = ['VIEW_CONVERSATIONS', 'SEND_MESSAGES', 'VIEW_MESSAGES'];
      if (req.user.role === 'user' && inboxPermissions.includes(permissionCode)) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredPermission: permissionCode,
        message: 'User role only has access to inbox module'
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user has any of the specified permissions
const requireAnyPermission = (permissionCodes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check permissions
      const hasPermission = await req.user.hasAnyPermission(permissionCodes);
      
      if (hasPermission) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredPermissions: permissionCodes,
        requirementType: 'any'
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user has all of the specified permissions
const requireAllPermissions = (permissionCodes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check permissions
      const hasPermissions = await req.user.hasAllPermissions(permissionCodes);
      
      if (hasPermissions) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredPermissions: permissionCodes,
        requirementType: 'all'
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user has a specific role
const requireRole = (roleCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user's effective role
      const role = await req.user.getEffectiveRole();
      
      if (role && role.code === roleCode) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient role.',
        requiredRole: roleCode
      });
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

module.exports = { 
  auth, 
  protect: auth, // Alias for consistency
  isAdmin, 
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireBusiness,
  requireBusinessPermission,
  generateToken 
};
