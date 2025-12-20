/**
 * Authentication Middleware
 * Handles JWT token verification only
 * 
 * For authorization (permissions, roles, business access), use:
 * const { requireBusiness, requireAdmin, etc. } = require('./authorization');
 */

const jwt = require('jsonwebtoken');
const User = require('../database/models/User');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../common/constants');

// ============================================
// CONSTANTS
// ============================================

// Error Messages
const ERROR_MESSAGES = {
  JWT_SECRET_MISSING: 'CRITICAL: JWT_SECRET is not configured in environment variables',
  NO_TOKEN: 'No authentication token provided',
  USER_NOT_FOUND: 'User not found',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  AUTH_FAILED: 'Authentication failed',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  INVALID_TOKEN_TYPE: 'Invalid token type',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  REFRESH_TOKEN_EXPIRED: 'Refresh token expired',
  TOKEN_REFRESH_FAILED: 'Token refresh failed',
  TOKEN_REFRESHED: 'Token refreshed successfully',
};

// Log Messages
const LOG_MESSAGES = {
  USER_AUTHENTICATED: 'User authenticated',
  AUTH_FAILED: 'Authentication failed',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  TOKEN_REFRESH_FAILED: 'Token refresh failed',
};

// Token Types
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

// JWT Error Names
const JWT_ERROR_NAMES = {
  JSON_WEB_TOKEN_ERROR: 'JsonWebTokenError',
  TOKEN_EXPIRED_ERROR: 'TokenExpiredError',
};

// Environment Defaults
const ENV_DEFAULTS = {
  JWT_EXPIRE: '30d',
  REFRESH_TOKEN_EXPIRE: '7d',
};

// Header Names
const HEADERS = {
  AUTHORIZATION: 'Authorization',
  BUSINESS_ID: 'X-Business-ID',
  BEARER_PREFIX: 'Bearer ',
};

// Validate JWT secret is configured
if (!process.env.JWT_SECRET) {
  logger.error(ERROR_MESSAGES.JWT_SECRET_MISSING);
  process.exit(1);
}

/**
 * Main authentication middleware - verifies JWT token
 * Attaches user, userId, userType, businessId to request
 * 
 * Usage: router.get('/protected', authenticate, handler)
 */
const authenticate = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    // Get token from header
    const token = req.header(HEADERS.AUTHORIZATION)?.replace(HEADERS.BEARER_PREFIX, '');
     
    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.NO_TOKEN,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }
    
    // Attach user information to request
    req.user = user;
    req.userId = user._id;
    req.userType = user.userType;
    req.token = token;
    
    // Get businessId from header or use user's businessId
    const businessId = req.header(HEADERS.BUSINESS_ID) || user.businessId;
    if (businessId) {
      req.businessId = businessId;
    }
    
    const duration = Date.now() - startTime;
    logger.debug(LOG_MESSAGES.USER_AUTHENTICATED, {
      userId: user._id.toString(),
      userType: user.userType,
      businessId: businessId?.toString(),
      duration,
    });
    
    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === JWT_ERROR_NAMES.JSON_WEB_TOKEN_ERROR) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN,
        errorCode: ERROR_CODES.TOKEN_INVALID,
      });
    }
    
    if (error.name === JWT_ERROR_NAMES.TOKEN_EXPIRED_ERROR) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_EXPIRED,
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
      });
    }
    
    logger.error(LOG_MESSAGES.AUTH_FAILED, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      duration,
      errorCode: ERROR_CODES.AUTH_FAILED,
    });
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.AUTH_FAILED,
      errorCode: ERROR_CODES.AUTH_FAILED,
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 * 
 * Usage: router.get('/public-but-personalized', optionalAuth, handler)
 */
const optionalAuth = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const token = req.header(HEADERS.AUTHORIZATION)?.replace(HEADERS.BEARER_PREFIX, '');
     
    if (!token) {
      return next(); // Continue without user
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user) {
      req.user = user;
      req.userId = user._id;
      req.userType = user.userType;
      req.token = token;
      
      const businessId = req.header(HEADERS.BUSINESS_ID) || user.businessId;
      if (businessId) {
        req.businessId = businessId;
      }
      
      const duration = Date.now() - startTime;
      logger.debug('Optional auth: user authenticated', {
        userId: user._id.toString(),
        userType: user.userType,
        businessId: businessId?.toString(),
        duration,
      });
    }
    
    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    // Silently continue without user if token is invalid
    logger.debug('Optional auth: continuing without authentication', {
      error: error.message,
      duration,
    });
    next();
  }
};

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @param {string} userType - User type/role
 * @param {string} businessId - Business ID (optional)
 * @returns {string} JWT token
 */
const generateToken = (userId, userType, businessId = null) => {
  return jwt.sign(
    { 
      userId,
      userType,
      businessId
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE || ENV_DEFAULTS.JWT_EXPIRE
    }
  );
};

/**
 * Generate refresh token (longer expiry)
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: TOKEN_TYPES.REFRESH },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || ENV_DEFAULTS.REFRESH_TOKEN_EXPIRE }
  );
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {object} Decoded token data
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  );
};

/**
 * Refresh token middleware
 * Accepts refresh token and generates new access token
 * 
 * Usage: router.post('/auth/refresh', refreshToken)
 * Body: { refreshToken: 'token_string' }
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const refreshToken = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded.type !== TOKEN_TYPES.REFRESH) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN_TYPE,
        errorCode: ERROR_CODES.TOKEN_INVALID,
      });
    }
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }
    
    // Verify refresh token matches stored token
    if (user.refreshToken !== refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
        errorCode: ERROR_CODES.TOKEN_INVALID,
      });
    }
    
    // Check if refresh token expired
    if (user.refreshTokenExpiry && new Date() > user.refreshTokenExpiry) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
      });
    }
    
    // Generate new access token
    const newAccessToken = generateToken(user._id, user.userType, user.businessId);
    
    const duration = Date.now() - startTime;
    logger.info(LOG_MESSAGES.TOKEN_REFRESHED, {
      userId: user._id.toString(),
      userType: user.userType,
      duration,
    });
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: ERROR_MESSAGES.TOKEN_REFRESHED,
      data: {
        token: newAccessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          businessId: user.businessId
        }
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === JWT_ERROR_NAMES.JSON_WEB_TOKEN_ERROR) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
        errorCode: ERROR_CODES.TOKEN_INVALID,
      });
    }
    
    if (error.name === JWT_ERROR_NAMES.TOKEN_EXPIRED_ERROR) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
      });
    }
    
    logger.error(LOG_MESSAGES.TOKEN_REFRESH_FAILED, {
      error: error.message,
      stack: error.stack,
      duration,
      errorCode: ERROR_CODES.AUTH_FAILED,
    });
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.TOKEN_REFRESH_FAILED,
      errorCode: ERROR_CODES.AUTH_FAILED,
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = { 
  authenticate,
  optionalAuth,
  refreshToken,
  auth: authenticate,          // Alias for backward compatibility
  protect: authenticate,       // Alias for consistency with other projects
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};

