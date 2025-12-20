/**
 * Centralized Validation Utilities
 * Consolidates repeated validation logic across the codebase
 * 
 * Phase 2: Logging & Validation Consolidation
 * Eliminates 95+ duplicate business validation checks
 * Consolidates 3 phone validation implementations
 */

const Business = require('../../core/database/models/Business');
const logger = require('../helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../constants');

// ============================================
// CONSTANTS
// ============================================

// Error Messages
const ERROR_MESSAGES = {
  BUSINESS_ID_REQUIRED: 'Business ID is required',
  BUSINESS_NOT_FOUND: 'Business not found',
  BUSINESS_DELETED: 'Business has been deleted',
  BUSINESS_NOT_ACTIVE: 'Business is not active (status: {status})',
  BUSINESS_ACCESS_DENIED: 'You do not have access to this business',
  BUSINESS_VALIDATION_FAILED: 'Failed to validate business',
  PHONE_REQUIRED: 'Phone number is required',
  PHONE_INVALID_FORMAT: 'Invalid phone number format. Must be in E.164 format (e.g., +14155552671)',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID_FORMAT: 'Invalid email format',
  URL_REQUIRED: 'URL is required',
  URL_INVALID_FORMAT: 'Invalid URL format',
  URL_PROTOCOL_INVALID: 'URL protocol must be one of: {protocols}',
  FIELD_REQUIRED: '{field} is required',
  FIELD_EMPTY: '{field} cannot be empty',
  FIELD_TOO_SHORT: '{field} must be at least {minLength} characters',
  FIELD_TOO_LONG: '{field} must not exceed {maxLength} characters',
  FIELD_INVALID_FORMAT: '{field} format is invalid',
  ID_REQUIRED: '{field} is required',
  ID_INVALID_FORMAT: 'Invalid {field} format',
};

// Log Messages
const LOG_MESSAGES = {
  BUSINESS_NOT_FOUND: 'Business not found',
  BUSINESS_DELETED_ACCESS: 'Attempted access to deleted business',
  BUSINESS_INACTIVE_ACCESS: 'Attempted access to inactive business',
  BUSINESS_UNAUTHORIZED_ACCESS: 'User attempted unauthorized business access',
  BUSINESS_VALIDATED: 'Business validated successfully',
  BUSINESS_VALIDATION_ERROR: 'Business validation error',
  BUSINESS_EXISTS_CHECK_FAILED: 'Business existence check failed',
  BUSINESS_ACCESS_CHECK_FAILED: 'Business access check failed',
};

// Business Status
const BUSINESS_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

// Team Member Status
const TEAM_MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
};

// Team Member Roles
const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

// Validation Defaults
const VALIDATION_DEFAULTS = {
  MIN_STRING_LENGTH: 1,
  MAX_STRING_LENGTH: 255,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
};

// Regex Patterns
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
};

// URL Protocols
const URL_PROTOCOLS = {
  ALLOWED: ['http', 'https'],
};

// Helper Functions
const formatMessage = (template, params) => {
  let message = template;
  Object.keys(params).forEach(key => {
    message = message.replace(`{${key}}`, params[key]);
  });
  return message;
};

// ============================================
// BUSINESS VALIDATION
// ============================================

/**
 * Validate and fetch business by ID
 * Replaces 95+ duplicate business validation checks
 * 
 * @param {string} businessId - Business ID to validate
 * @param {object} options - Validation options
 * @param {boolean} options.checkActive - Check if business is active (default: true)
 * @param {boolean} options.populateOwner - Populate owner field (default: false)
 * @param {string} options.userId - User ID to check access (optional)
 * @returns {Promise<{valid: boolean, business?: object, error?: string}>}
 * 
 * @example
 * const { valid, business, error } = await validateBusiness(req.params.businessId, {
 *   checkActive: true,
 *   userId: req.userId
 * });
 * if (!valid) return res.badRequest(error);
 */
async function validateBusiness(businessId, options = {}) {
  const startTime = Date.now();
  const {
    checkActive = true,
    populateOwner = false,
    userId = null
  } = options;

  try {
    // Check if businessId is provided
    if (!businessId) {
      return {
        valid: false,
        error: ERROR_MESSAGES.BUSINESS_ID_REQUIRED
      };
    }

    // Build query
    let query = Business.findById(businessId);
    if (populateOwner) {
      query = query.populate('owner', 'name email userType');
    }

    // Fetch business
    const business = await query;

    if (!business) {
      const duration = Date.now() - startTime;
      logger.warn(LOG_MESSAGES.BUSINESS_NOT_FOUND, { 
        businessId: businessId.toString(),
        duration,
      });
      return {
        valid: false,
        error: ERROR_MESSAGES.BUSINESS_NOT_FOUND
      };
    }

    // Check if deleted
    if (business.isDeleted) {
      const duration = Date.now() - startTime;
      logger.warn(LOG_MESSAGES.BUSINESS_DELETED_ACCESS, { 
        businessId: businessId.toString(),
        duration,
      });
      return {
        valid: false,
        error: ERROR_MESSAGES.BUSINESS_DELETED
      };
    }

    // Check if active
    if (checkActive && business.status !== BUSINESS_STATUS.ACTIVE) {
      const duration = Date.now() - startTime;
      logger.warn(LOG_MESSAGES.BUSINESS_INACTIVE_ACCESS, {
        businessId: businessId.toString(),
        status: business.status,
        duration,
      });
      return {
        valid: false,
        error: formatMessage(ERROR_MESSAGES.BUSINESS_NOT_ACTIVE, { status: business.status })
      };
    }

    // Check user access if userId provided
    if (userId && business.owner) {
      // Handle populated owner (owner is a User object with _id)
      const ownerId = business.owner._id || business.owner;
      if (!ownerId.equals(userId)) {
        // Check if user is a team member
        const isMember = business.team?.some(member => 
          member.userId && member.userId.equals(userId) && member.status === TEAM_MEMBER_STATUS.ACTIVE
        );

        if (!isMember) {
          const duration = Date.now() - startTime;
          logger.warn(LOG_MESSAGES.BUSINESS_UNAUTHORIZED_ACCESS, {
            userId: userId.toString(),
            businessId: businessId.toString(),
            duration,
          });
          return {
            valid: false,
            error: ERROR_MESSAGES.BUSINESS_ACCESS_DENIED
          };
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.debug(LOG_MESSAGES.BUSINESS_VALIDATED, {
      businessId: businessId.toString(),
      businessName: business.name,
      duration,
    });

    return {
      valid: true,
      business
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(LOG_MESSAGES.BUSINESS_VALIDATION_ERROR, {
      businessId: businessId?.toString(),
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
    });
    return {
      valid: false,
      error: ERROR_MESSAGES.BUSINESS_VALIDATION_FAILED
    };
  }
}

/**
 * Quick business existence check
 * @param {string} businessId - Business ID
 * @returns {Promise<boolean>}
 */
async function businessExists(businessId) {
  const startTime = Date.now();
  
  if (!businessId) return false;
  
  try {
    const count = await Business.countDocuments({
      _id: businessId,
      isDeleted: false
    });
    
    const duration = Date.now() - startTime;
    logger.debug('Business existence check completed', {
      businessId: businessId.toString(),
      exists: count > 0,
      duration,
    });
    
    return count > 0;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(LOG_MESSAGES.BUSINESS_EXISTS_CHECK_FAILED, { 
      businessId: businessId?.toString(),
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    return false;
  }
}

/**
 * Check if user has access to business
 * @param {string} businessId - Business ID
 * @param {string} userId - User ID
 * @param {string} requiredRole - Required role ('owner', 'admin', 'member')
 * @returns {Promise<boolean>}
 */
async function hasBusinessAccess(businessId, userId, requiredRole = TEAM_ROLES.MEMBER) {
  const startTime = Date.now();
  
  if (!businessId || !userId) return false;

  try {
    const business = await Business.findById(businessId);
    if (!business || business.isDeleted) {
      const duration = Date.now() - startTime;
      logger.debug('Business access check: business not found or deleted', {
        businessId: businessId?.toString(),
        userId: userId?.toString(),
        duration,
      });
      return false;
    }

    // Check if owner
    const isOwner = business.owner && business.owner.equals(userId);
    if (requiredRole === TEAM_ROLES.OWNER) {
      const duration = Date.now() - startTime;
      logger.debug('Business access check: owner validation', {
        businessId: businessId.toString(),
        userId: userId.toString(),
        isOwner,
        duration,
      });
      return isOwner;
    }
    
    if (isOwner) {
      const duration = Date.now() - startTime;
      logger.debug('Business access check: granted (owner)', {
        businessId: businessId.toString(),
        userId: userId.toString(),
        duration,
      });
      return true; // Owner has all access
    }

    // Check team membership
    const member = business.team?.find(m => 
      m.userId && m.userId.equals(userId) && m.status === TEAM_MEMBER_STATUS.ACTIVE
    );

    if (!member) {
      const duration = Date.now() - startTime;
      logger.debug('Business access check: no team membership', {
        businessId: businessId.toString(),
        userId: userId.toString(),
        duration,
      });
      return false;
    }

    // Check role requirements
    if (requiredRole === TEAM_ROLES.ADMIN) {
      const hasAccess = member.role === TEAM_ROLES.ADMIN || member.role === TEAM_ROLES.OWNER;
      const duration = Date.now() - startTime;
      logger.debug('Business access check: admin role validation', {
        businessId: businessId.toString(),
        userId: userId.toString(),
        memberRole: member.role,
        hasAccess,
        duration,
      });
      return hasAccess;
    }

    const duration = Date.now() - startTime;
    logger.debug('Business access check: granted (team member)', {
      businessId: businessId.toString(),
      userId: userId.toString(),
      memberRole: member.role,
      duration,
    });
    
    return true; // Any active member
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(LOG_MESSAGES.BUSINESS_ACCESS_CHECK_FAILED, {
      businessId: businessId?.toString(),
      userId: userId?.toString(),
      duration,
      error: error.message,
      stack: error.stack,
      errorCode: ERROR_CODES.DATABASE_ERROR,
    });
    return false;
  }
}

// ============================================
// PHONE NUMBER VALIDATION
// ============================================

/**
 * Phone validation - delegates to phoneValidator.js (single source of truth)
 * This section imports and re-exports phone validation functions
 * to maintain backwards compatibility while centralizing implementation.
 */

const phoneValidator = require('../helpers/phoneValidator');

/**
 * Sanitize phone number to E.164 format
 * @param {string} phone - Phone number to sanitize
 * @returns {string|null} - Sanitized phone number or null if invalid
 */
function sanitizePhoneNumber(phone) {
  return phoneValidator.sanitizePhoneNumber(phone);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @param {object} options - Validation options
 * @returns {object} - {valid: boolean, sanitized?: string, error?: string}
 */
function validatePhoneNumber(phone, options = {}) {
  if (!phone) {
    return { valid: false, error: ERROR_MESSAGES.PHONE_REQUIRED };
  }

  const isValid = phoneValidator.isValidPhoneNumber(phone);
  
  if (!isValid) {
    return { valid: false, error: ERROR_MESSAGES.PHONE_INVALID_FORMAT };
  }

  return { valid: true, sanitized: sanitizePhoneNumber(phone) };
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @param {string} format - Format type ('E164', 'NATIONAL', 'INTERNATIONAL')
 * @returns {string}
 */
function formatPhoneNumber(phone, format = 'E164') {
  const sanitized = sanitizePhoneNumber(phone);
  if (!sanitized) return phone;

  switch (format) {
    case 'E164':
      return `+${sanitized}`;
    
    case 'NATIONAL':
      // Simple US format: (555) 123-4567
      if (sanitized.length === 10) {
        return `(${sanitized.slice(0, 3)}) ${sanitized.slice(3, 6)}-${sanitized.slice(6)}`;
      }
      return sanitized;
    
    case 'INTERNATIONAL':
      // Format: +1 (555) 123-4567
      if (sanitized.length === 11 && sanitized.startsWith('1')) {
        return `+1 (${sanitized.slice(1, 4)}) ${sanitized.slice(4, 7)}-${sanitized.slice(7)}`;
      }
      return `+${sanitized}`;
    
    default:
      return sanitized;
  }
}

// ============================================
// EMAIL VALIDATION
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - {valid: boolean, email?: string, error?: string}
 */
function validateEmail(email) {
  if (!email) {
    return { valid: false, error: ERROR_MESSAGES.EMAIL_REQUIRED };
  }

  const trimmed = email.trim().toLowerCase();
  
  if (!REGEX_PATTERNS.EMAIL.test(trimmed)) {
    return { valid: false, error: ERROR_MESSAGES.EMAIL_INVALID_FORMAT };
  }

  return { valid: true, email: trimmed };
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {object} options - Validation options
 * @param {boolean} options.requireProtocol - Require http/https protocol (default: true)
 * @param {string[]} options.allowedProtocols - Allowed protocols (default: ['http', 'https'])
 * @returns {object} - {valid: boolean, url?: string, error?: string}
 */
function validateUrl(url, options = {}) {
  const {
    requireProtocol = true,
    allowedProtocols = URL_PROTOCOLS.ALLOWED
  } = options;

  if (!url) {
    return { valid: false, error: ERROR_MESSAGES.URL_REQUIRED };
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    
    if (requireProtocol && !allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
      return {
        valid: false,
        error: formatMessage(ERROR_MESSAGES.URL_PROTOCOL_INVALID, { protocols: allowedProtocols.join(', ') })
      };
    }

    return { valid: true, url: trimmed };
  } catch (error) {
    return { valid: false, error: ERROR_MESSAGES.URL_INVALID_FORMAT };
  }
}

// ============================================
// STRING VALIDATION
// ============================================

/**
 * Validate required string field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @param {object} options - Validation options
 * @param {number} options.minLength - Minimum length
 * @param {number} options.maxLength - Maximum length
 * @param {RegExp} options.pattern - Pattern to match
 * @returns {object} - {valid: boolean, value?: string, error?: string}
 */
function validateString(value, fieldName, options = {}) {
  const { 
    minLength = VALIDATION_DEFAULTS.MIN_STRING_LENGTH,
    maxLength = VALIDATION_DEFAULTS.MAX_STRING_LENGTH,
    pattern = null 
  } = options;

  if (value === undefined || value === null) {
    return { valid: false, error: formatMessage(ERROR_MESSAGES.FIELD_REQUIRED, { field: fieldName }) };
  }

  const trimmed = value.toString().trim();

  if (trimmed.length === 0) {
    return { valid: false, error: formatMessage(ERROR_MESSAGES.FIELD_EMPTY, { field: fieldName }) };
  }

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: formatMessage(ERROR_MESSAGES.FIELD_TOO_SHORT, { field: fieldName, minLength })
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: formatMessage(ERROR_MESSAGES.FIELD_TOO_LONG, { field: fieldName, maxLength })
    };
  }

  if (pattern && !pattern.test(trimmed)) {
    return {
      valid: false,
      error: formatMessage(ERROR_MESSAGES.FIELD_INVALID_FORMAT, { field: fieldName })
    };
  }

  return { valid: true, value: trimmed };
}

// ============================================
// ID VALIDATION
// ============================================

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {object} - {valid: boolean, error?: string}
 */
function validateObjectId(id, fieldName = 'ID') {
  if (!id) {
    return { valid: false, error: formatMessage(ERROR_MESSAGES.ID_REQUIRED, { field: fieldName }) };
  }

  if (!REGEX_PATTERNS.OBJECT_ID.test(id)) {
    return { valid: false, error: formatMessage(ERROR_MESSAGES.ID_INVALID_FORMAT, { field: fieldName }) };
  }

  return { valid: true };
}

// ============================================
// PAGINATION VALIDATION
// ============================================

/**
 * Validate and sanitize pagination parameters
 * @param {object} query - Request query parameters
 * @param {object} options - Validation options
 * @param {number} options.defaultLimit - Default page limit (default: 20)
 * @param {number} options.maxLimit - Maximum page limit (default: 100)
 * @returns {object} - {page, limit, skip}
 */
function validatePagination(query = {}, options = {}) {
  const {
    defaultLimit = VALIDATION_DEFAULTS.DEFAULT_LIMIT,
    maxLimit = VALIDATION_DEFAULTS.MAX_LIMIT
  } = options;

  let page = parseInt(query.page) || VALIDATION_DEFAULTS.DEFAULT_PAGE;
  let limit = parseInt(query.limit) || defaultLimit;

  // Ensure positive values
  page = Math.max(VALIDATION_DEFAULTS.MIN_PAGE, page);
  limit = Math.max(VALIDATION_DEFAULTS.MIN_LIMIT, Math.min(limit, maxLimit));

  const skip = (page - VALIDATION_DEFAULTS.MIN_PAGE) * limit;

  return { page, limit, skip };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Business validation
  validateBusiness,
  businessExists,
  hasBusinessAccess,
  
  // Phone validation
  sanitizePhoneNumber,
  validatePhoneNumber,
  formatPhoneNumber,
  
  // Email validation
  validateEmail,
  
  // URL validation
  validateUrl,
  
  // String validation
  validateString,
  
  // ID validation
  validateObjectId,
  
  // Pagination validation
  validatePagination
};
