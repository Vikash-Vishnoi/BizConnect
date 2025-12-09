const Business = require('../../core/database/models/Business');
const WhatsAppService = require('../../integrations/whatsapp/whatsappService');

/**
 * Business Context Utilities
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
  if (!businessId) {
    throw new Error('Business ID is required');
  }

  const business = await Business.findById(businessId);
  
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }
  
  if (business.status !== 'active') {
    throw new Error(`Business is not active: ${business.name}`);
  }
  
  if (business.isDeleted) {
    throw new Error(`Business has been deleted: ${business.name}`);
  }
  
  // Get credentials securely
  const credentials = await business.getWhatsAppCredentials();
  
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
      console.error('Failed to get business credentials:', error.message);
    }
  }
  
  // Fallback to environment (development only)
  if (process.env.NODE_ENV === 'development' && process.env.WHATSAPP_ACCESS_TOKEN) {
    console.warn('⚠️ Using fallback environment credentials (development only)');
    return new WhatsAppService(); // Uses env credentials
  }
  
  throw new Error('No valid WhatsApp credentials available');
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
const CACHE_TTL = parseInt(process.env.BUSINESS_CACHE_TTL) || (5 * 60 * 1000); // Default 5 minutes

async function getBusinessByPhoneNumberCached(phoneNumberId) {
  const cached = phoneNumberCache.get(phoneNumberId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.business;
  }
  
  const business = await getBusinessByPhoneNumber(phoneNumberId);
  
  phoneNumberCache.set(phoneNumberId, {
    business,
    timestamp: Date.now()
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
