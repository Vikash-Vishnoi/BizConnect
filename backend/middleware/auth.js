const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Middleware to check if user is admin (supports both legacy and RBAC)
const isAdmin = async (req, res, next) => {
  try {
    // Legacy admin check
    if (req.user && req.user.role === 'admin' && !req.user.roleId) {
      return next();
    }
    
    // RBAC admin check
    if (req.user && req.user.roleId) {
      const role = await req.user.getEffectiveRole();
      if (role && (role.code === 'super_admin' || role.code === 'admin')) {
        return next();
      }
    }
    
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  } catch (error) {
    res.status(500).json({ error: 'Permission check failed' });
  }
};

// Middleware to check if user has a specific permission
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check permission
      const hasPermission = await req.user.hasPermission(permissionCode);
      
      if (hasPermission) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredPermission: permissionCode
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
  isAdmin, 
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  generateToken 
};
