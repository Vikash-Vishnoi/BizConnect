const jwt = require('jsonwebtoken');
const User = require('../../database/models/User');
const Business = require('../../database/models/Business');

// Validate JWT secret is configured
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is not configured in environment variables');
  process.exit(1);
}

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
    
    // Attach user to request with role information
    req.user = user;
    req.userId = user._id;
    req.userType = user.userType;  // Attach userType for RBAC checks
    req.token = token;
    
    // Get businessId from header or use user's businessId
    const businessId = req.header('X-Business-ID') || user.businessId;
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
    if (!req.user || !req.user.canAccessBusiness) {
      return res.status(401).json({ error: 'Invalid user session' });
    }
    
    if (!req.user.canAccessBusiness(business._id)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this business'
      });
    }
    
    // Attach business to request
    req.business = business;
    
    next();
  } catch (error) {
    console.error('Business context error:', error);
    res.status(500).json({ error: 'Failed to load business context' });
  }
};

// Middleware to check business permission
const requireBusinessPermission = (action, module) => {
  return async (req, res, next) => {
    try {
      if (!req.business) {
        return res.status(400).json({ error: 'Business context required' });
      }
      
      if (!req.user.hasPermission(action, module)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `You do not have permission: ${action} ${module}`,
          requiredPermission: { action, module }
        });
      }
      
      next();
    } catch (error) {
      console.error('Business permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user is admin (updated for 4-tier system)
const isAdmin = async (req, res, next) => {
  try {
    if (req.user && (req.user.userType === 'super_admin' || req.user.userType === 'business_admin')) {
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

// Middleware to check if user has a specific permission
const requirePermission = (action, module) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.hasPermission(action, module)) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredPermission: { action, module },
        message: `You do not have permission to ${action} ${module}`
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user has any of the specified user types
const requireAnyUserType = (userTypes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (userTypes.includes(req.user.userType)) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient user type.',
        requiredUserTypes: userTypes,
        currentUserType: req.user.userType
      });
    } catch (error) {
      console.error('User type check error:', error);
      res.status(500).json({ error: 'User type check failed' });
    }
  };
};

// Middleware to check if user has a specific user type
const requireUserType = (userType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (req.user.userType === userType) {
        return next();
      }
      
      res.status(403).json({ 
        error: 'Access denied. Insufficient user type.',
        requiredUserType: userType,
        currentUserType: req.user.userType
      });
    } catch (error) {
      console.error('User type check error:', error);
      res.status(500).json({ error: 'User type check failed' });
    }
  };
};

// Generate JWT access token with user type and business ID
const generateToken = (userId, userType, businessId = null) => {
  return jwt.sign(
    { 
      userId,
      userType,      // Include role for backend validation
      businessId     // Include business context
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE || '15m' // Shorter expiry for access tokens
    }
  );
};

// Generate refresh token (longer expiry)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = { 
  auth, 
  protect: auth, // Alias for consistency
  isAdmin, 
  requirePermission,
  requireAnyUserType,
  requireUserType,
  requireBusiness,
  requireBusinessPermission,
  generateToken,
  generateRefreshToken
};
