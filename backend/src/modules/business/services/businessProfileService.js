const axios = require('axios');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const multer = require('multer');
const path = require('path');

/**
 * Constants
 */
const DEFAULT_API_VERSION = 'v17.0';
const GRAPH_API_BASE_URL = 'https://graph.facebook.com';
const MESSAGING_PRODUCT = 'whatsapp';

const PROFILE_LIMITS = {
  ABOUT_MAX_LENGTH: 256
};

const ERROR_MESSAGES = {
  BUSINESS_NOT_FOUND: 'Business not found',
  ABOUT_TOO_LONG: 'About text cannot exceed 256 characters',
  INVALID_URL: 'Invalid website URL',
  WEBSITE_EXISTS: 'Website already exists',
  INVALID_WEBSITE_INDEX: 'Invalid website index'
};

const APPROVAL_STATUS = {
  PENDING: 'pending_approval'
};

const API_PATHS = {
  PROFILE: 'whatsapp_business_profile',
  PAYMENT_SETTINGS: 'payment_settings'
};

/**
 * Business Profile Service
 * Manages WhatsApp Business Profile (picture, name, about, etc.)
 * 
 * P1 FIX: Complete profile management
 */

class BusinessProfileService {
  /**
   * Update profile picture
   * @param {string} businessId - Business ID
   * @param {string} imageUrl - URL of uploaded image
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfilePicture(businessId, imageUrl) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Upload to WhatsApp
      const url = `${GRAPH_API_BASE_URL}/${apiVersion}/${phoneNumberId}/${API_PATHS.PROFILE}`;
      await axios.post(
        url,
        {
          messaging_product: MESSAGING_PRODUCT,
          profile_picture_handle: imageUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update database
      business.profile.profilePicture = imageUrl;
      await business.save();

      logger.info('Profile picture updated', {
        businessId: businessId.toString(),
        imageUrl,
        processingTime: Date.now() - startTime
      });

      return {
        profilePicture: business.profile.profilePicture
      };

    } catch (error) {
      logger.error('Update profile picture error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Update display name (requires Meta approval)
   * @param {string} businessId - Business ID
   * @param {string} displayName - New display name
   * @returns {Promise<Object>} Update status
   */
  async updateDisplayName(businessId, displayName) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Submit to WhatsApp for approval
      const url = `${GRAPH_API_BASE_URL}/${apiVersion}/${phoneNumberId}/${API_PATHS.PROFILE}`;
      const response = await axios.post(
        url,
        {
          messaging_product: MESSAGING_PRODUCT,
          address: displayName  // WhatsApp uses 'address' field for business display name
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update database (pending approval)
      business.profile.displayName = displayName;
      await business.save();

      logger.info('Display name update requested', {
        businessId: businessId.toString(),
        displayName,
        processingTime: Date.now() - startTime
      });

      return {
        displayName: business.profile.displayName,
        status: APPROVAL_STATUS.PENDING,
        message: 'Display name submitted for Meta approval'
      };

    } catch (error) {
      logger.error('Update display name error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Update about text
   * @param {string} businessId - Business ID
   * @param {string} about - About text (max 256 chars)
   * @returns {Promise<Object>} Updated profile
   */
  async updateAbout(businessId, about) {
    const startTime = Date.now();
    try {
      if (about && about.length > PROFILE_LIMITS.ABOUT_MAX_LENGTH) {
        throw new Error(ERROR_MESSAGES.ABOUT_TOO_LONG);
      }

      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || DEFAULT_API_VERSION;

      // Update on WhatsApp
      const url = `${GRAPH_API_BASE_URL}/${apiVersion}/${phoneNumberId}/${API_PATHS.PROFILE}`;
      await axios.post(
        url,
        {
          messaging_product: MESSAGING_PRODUCT,
          about: about
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update database
      business.profile.about = about;
      await business.save();

      logger.info('About text updated', {
        businessId: businessId.toString(),
        aboutLength: about?.length || 0,
        processingTime: Date.now() - startTime
      });

      return {
        about: business.profile.about
      };

    } catch (error) {
      logger.error('Update about error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Add website to profile
   * @param {string} businessId - Business ID
   * @param {string} website - Website URL
   * @returns {Promise<Object>} Updated profile
   */
  async addWebsite(businessId, website) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      // Validate URL
      try {
        new URL(website);
      } catch {
        throw new Error(ERROR_MESSAGES.INVALID_URL);
      }

      // Add to websites array (avoid duplicates)
      if (!business.profile.websites) {
        business.profile.websites = [];
      }

      if (business.profile.websites.includes(website)) {
        throw new Error(ERROR_MESSAGES.WEBSITE_EXISTS);
      }

      business.profile.websites.push(website);
      await business.save();

      logger.info('Website added to profile', {
        businessId: businessId.toString(),
        website,
        totalWebsites: business.profile.websites.length,
        processingTime: Date.now() - startTime
      });

      return {
        websites: business.profile.websites
      };

    } catch (error) {
      logger.error('Add website error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Remove website from profile
   * @param {string} businessId - Business ID
   * @param {number} index - Website index to remove
   * @returns {Promise<Object>} Updated profile
   */
  async removeWebsite(businessId, index) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      if (!business.profile.websites || index >= business.profile.websites.length) {
        throw new Error(ERROR_MESSAGES.INVALID_WEBSITE_INDEX);
      }

      const removedWebsite = business.profile.websites[index];
      business.profile.websites.splice(index, 1);
      await business.save();

      logger.info('Website removed from profile', {
        businessId: businessId.toString(),
        index,
        removedWebsite,
        remainingWebsites: business.profile.websites.length,
        processingTime: Date.now() - startTime
      });

      return {
        websites: business.profile.websites
      };

    } catch (error) {
      logger.error('Remove website error', {
        businessId: businessId.toString(),
        index,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Get current profile
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Current profile
   */
  async getProfile(businessId) {
    const startTime = Date.now();
    try {
      const business = await Business.findById(businessId).select('profile');
      if (!business) {
        throw new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
      }

      logger.info('Retrieved profile', {
        businessId: businessId.toString(),
        hasProfilePicture: !!business.profile?.profilePicture,
        websiteCount: business.profile?.websites?.length || 0,
        processingTime: Date.now() - startTime
      });

      return business.profile;

    } catch (error) {
      logger.error('Get profile error', {
        businessId: businessId.toString(),
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }
}

module.exports = new BusinessProfileService();
