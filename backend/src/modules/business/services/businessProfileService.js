const axios = require('axios');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const multer = require('multer');
const path = require('path');

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
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Upload to WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/whatsapp_business_profile`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
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

      logger.info('Profile picture updated', { businessId });

      return {
        profilePicture: business.profile.profilePicture
      };

    } catch (error) {
      logger.error('Update profile picture error', {
        businessId,
        error: error.message,
        response: error.response?.data
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
    try {
      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Submit to WhatsApp for approval
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/whatsapp_business_profile`;
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          about: displayName
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

      logger.info('Display name update requested', { businessId, displayName });

      return {
        displayName: business.profile.displayName,
        status: 'pending_approval',
        message: 'Display name submitted for Meta approval'
      };

    } catch (error) {
      logger.error('Update display name error', {
        businessId,
        error: error.message,
        response: error.response?.data
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
    try {
      if (about && about.length > 256) {
        throw new Error('About text cannot exceed 256 characters');
      }

      const business = await Business.findById(businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const phoneNumberId = business.whatsappConfig.phoneNumberId;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Update on WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/whatsapp_business_profile`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
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

      logger.info('About text updated', { businessId });

      return {
        about: business.profile.about
      };

    } catch (error) {
      logger.error('Update about error', {
        businessId,
        error: error.message,
        response: error.response?.data
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
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Validate URL
      try {
        new URL(website);
      } catch {
        throw new Error('Invalid website URL');
      }

      // Add to websites array (avoid duplicates)
      if (!business.profile.websites) {
        business.profile.websites = [];
      }

      if (business.profile.websites.includes(website)) {
        throw new Error('Website already exists');
      }

      business.profile.websites.push(website);
      await business.save();

      logger.info('Website added to profile', { businessId, website });

      return {
        websites: business.profile.websites
      };

    } catch (error) {
      logger.error('Add website error', { businessId, error: error.message });
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
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      if (!business.profile.websites || index >= business.profile.websites.length) {
        throw new Error('Invalid website index');
      }

      business.profile.websites.splice(index, 1);
      await business.save();

      logger.info('Website removed from profile', { businessId, index });

      return {
        websites: business.profile.websites
      };

    } catch (error) {
      logger.error('Remove website error', { businessId, error: error.message });
      throw error;
    }
  }

  /**
   * Get current profile
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Current profile
   */
  async getProfile(businessId) {
    try {
      const business = await Business.findById(businessId).select('profile');
      if (!business) {
        throw new Error('Business not found');
      }

      return business.profile;

    } catch (error) {
      logger.error('Get profile error', { businessId, error: error.message });
      throw error;
    }
  }
}

module.exports = new BusinessProfileService();
