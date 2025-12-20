const Business = require('../../core/database/models/Business');
const WhatsAppService = require('../../integrations/whatsapp/whatsappService');
const logger = require('./logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../constants');

/**
 * Business Context Constants
 */
const BUSINESS_CACHE_TTL = parseInt(process.env.BUSINESS_CACHE_TTL) || (5 * TIME_CONSTANTS.MINUTE_MS); // 5 minutes
const BUSINESS_STATUS_ACTIVE = 'active';
const USER_TYPE_SUPER_ADMIN = 'super_admin';
const NODE_ENV_DEVELOPMENT = 'development';

/**
 * Business Context Utilities
 * 
 * PURPOSE:
 * Multi-tenant business context management for WhatsApp operations
 * Ensures proper business isolation and credential security
 * 
 * USAGE PATTERNS:
 * 
 * 1. GET WHATSAPP SERVICE:
 *    const service = await getWhatsAppService(businessId);
 *    await service.sendMessage(...);
 * 
 * 2. GET BUSINESS BY PHONE:
 *    const business = await getBusinessByPhoneNumber(phoneNumberId);
 *    // Used in webhook routing
 * 
 * 3. GET CREDENTIALS ONLY:
 *    const creds = await getBusinessCredentials(businessId);
 *    // For direct API calls
 * 
 * 4. VALIDATE BUSINESS ACCESS:
 *    const hasAccess = await validateBusinessAccess(userId, businessId);
 * 
 * SECURITY:
 * - All credentials accessed through secure methods
 * - Business status validated before operations
 * - Deleted businesses blocked from access
 * - Team member access validated
 * 
 * PERFORMANCE:
 * - Business data cached where appropriate
 * - Credentials retrieved securely without exposure
 * - Minimal database queries per operation
 * 
 * Helper functions for multi-business WhatsApp operations
 * Ensures proper business context and credentials are used
 */
 
/**
 * Get WhatsApp service instance for a specific business
 * Loads business credentials and returns configured service
 * 
 * @param {string|ObjectId} businessId - Business ID
 * @returns {Promise<WhatsAppService>} Configured WhatsApp service
 * @throws {Error} If business not found or inactive
 */
async function getWhatsAppService(businessId) {
  const startTime = Date.now();
  
  if (!businessId) {
    const error = new Error('Business ID is required');
    error.code = ERROR_CODES.VALIDATION_ERROR;
    throw error;
  }

  const business = await Business.findById(businessId);
  
  if (!business) {
    logger.error('Business not found', {
      businessId: businessId.toString(),
      code: ERROR_CODES.NOT_FOUND
    });
    const error = new Error(`Business not found: ${businessId}`);
    error.code = ERROR_CODES.NOT_FOUND;
    throw error;
  }
  
  if (business.status !== BUSINESS_STATUS_ACTIVE) {
    logger.warn('Business is not active', {
      businessId: businessId.toString(),
      status: business.status,
      code: ERROR_CODES.BUSINESS_ACCESS_DENIED
    });
    const error = new Error(`Business is not active: ${business.name}`);
    error.code = ERROR_CODES.BUSINESS_ACCESS_DENIED;
    throw error;
  }
  
  if (business.isDeleted) {
    logger.warn('Business has been deleted', {
      businessId: businessId.toString(),
      code: ERROR_CODES.BUSINESS_ACCESS_DENIED
    });
    const error = new Error(`Business has been deleted: ${business.name}`);
    error.code = ERROR_CODES.BUSINESS_ACCESS_DENIED;
    throw error;
  }
  
  // Get credentials securely
  const credentials = await business.getWhatsAppCredentials();
  
  logger.info('WhatsApp service created for business', {
    businessId: businessId.toString(),
    businessName: business.name,
    processingTime: `${Date.now() - startTime}ms`
  });
  
  // Return configured service instance
  return new WhatsAppService(credentials);
}

/**
 * Get business by WhatsApp phone number ID
 * Used primarily for webhook routing
 * 
 * @param {string} phoneNumberId - WhatsApp Phone Number ID
 * @returns {Promise<Business>} Business document
 * @throws {Error} If business not found
 */
async function getBusinessByPhoneNumber(phoneNumberId) {
  if (!phoneNumberId) {
    throw new Error('Phone Number ID is required');
  }

  const business = await Business.findByPhoneNumberId(phoneNumberId);
  
  if (!business) {
    throw new Error(`No business found for phone number ID: ${phoneNumberId}`);
  }
  
  return business;
}

/**
 * Get business credentials directly (without service instance)
 * Useful when you need credentials for API calls
 * 
 * @param {string|ObjectId} businessId - Business ID
 * @returns {Promise<Object>} Credentials object { phoneNumberId, accessToken, wabaId, apiVersion }
 * @throws {Error} If business not found
 */
async function getBusinessCredentials(businessId) {
  if (!businessId) {
    throw new Error('Business ID is required');
  }

  const business = await Business.findById(businessId);
  
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }
  
  return await business.getWhatsAppCredentials();
}

/**
 * Validate business ownership/access for user
 * Checks if user can access the specified business
 * 
 * @param {Object} user - User document
 * @param {string|ObjectId} businessId - Business ID
 * @returns {Promise<boolean>} True if user has access
 */
async function validateBusinessAccess(user, businessId) {
  if (!user || !businessId) {
    return false;
  }
  
  // Super admin can access all businesses
  if (user.userType === 'super_admin') {
    return true;
  }
  
  // Check if user's businessId matches
  if (user.businessId && user.businessId.toString() === businessId.toString()) {
    return true;
  }
  
  // Check if user is part of business team
  const business = await Business.findById(businessId);
  if (!business) {
    return false;
  }
  
  return business.hasUser(user._id);
}

/**
 * Get all businesses for a user
 * Returns list of businesses user has access to
 * 
 * @param {string|ObjectId} userId - User ID
 * @returns {Promise<Array<Business>>} Array of business documents
 */
async function getUserBusinesses(userId) {
  if (!userId) {
    return [];
  }
  
  return await Business.findByUser(userId);
}

/**
 * Create WhatsApp service with fallback
 * Tries to use business credentials, falls back to env if needed (dev only)
 * 
 * @param {string|ObjectId} businessId - Business ID (optional)
 * @returns {Promise<WhatsAppService>} WhatsApp service instance
 */
async function getWhatsAppServiceWithFallback(businessId = null) {
  // Try business credentials first
  if (businessId) {
    try {
      return await getWhatsAppService(businessId);
    } catch (error) {
      logger.error('Failed to get business credentials', {
        businessId: businessId.toString(),
        error: error.message,
        code: error.code || ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
  
  // Fallback to environment (development only)
  if (process.env.NODE_ENV === NODE_ENV_DEVELOPMENT && process.env.WHATSAPP_ACCESS_TOKEN) {
    logger.warn('Using fallback environment credentials (development only)', {
      businessId: businessId?.toString() || 'none'
    });
    return new WhatsAppService(); // Uses env credentials
  }
  
  const error = new Error('No valid WhatsApp credentials available');
  error.code = ERROR_CODES.CONFIGURATION_ERROR;
  logger.error('No WhatsApp credentials available', {
    businessId: businessId?.toString() || 'none',
    code: ERROR_CODES.CONFIGURATION_ERROR
  });
  throw error;
}

/**
 * Get business by phone number with caching
 * Cached version of getBusinessByPhoneNumber for high-frequency webhook calls
 * Cache expires after 5 minutes
 * 
 * @param {string} phoneNumberId - WhatsApp Phone Number ID
 * @returns {Promise<Business>} Business document
 */
const phoneNumberCache = new Map();

async function getBusinessByPhoneNumberCached(phoneNumberId) {
  if (!phoneNumberId) {
    const error = new Error('Phone Number ID is required');
    error.code = ERROR_CODES.VALIDATION_ERROR;
    throw error;
  }

  const cached = phoneNumberCache.get(phoneNumberId);
  if (cached && Date.now() - cached.timestamp < BUSINESS_CACHE_TTL) {
    logger.debug('Using cached business', {
      phoneNumberId,
      age: `${Date.now() - cached.timestamp}ms`
    });
    return cached.business;
  }
  
  const business = await getBusinessByPhoneNumber(phoneNumberId);
  
  phoneNumberCache.set(phoneNumberId, {
    business,
    timestamp: Date.now()
  });
  
  logger.info('Business cached', {
    phoneNumberId,
    businessId: business._id.toString(),
    cacheTTL: BUSINESS_CACHE_TTL
  });
  
  return business;
}

/**
 * Clear phone number cache (call after business updates)
 * 
 * @param {string} phoneNumberId - Optional: Clear specific phone number
 */
function clearPhoneNumberCache(phoneNumberId = null) {
  if (phoneNumberId) {
    phoneNumberCache.delete(phoneNumberId);
  } else {
    phoneNumberCache.clear();
  }
}

module.exports = {
  getWhatsAppService,
  getBusinessByPhoneNumber,
  getBusinessCredentials,
  validateBusinessAccess,
  getUserBusinesses,
  getWhatsAppServiceWithFallback,
  getBusinessByPhoneNumberCached,
  clearPhoneNumberCache
};
