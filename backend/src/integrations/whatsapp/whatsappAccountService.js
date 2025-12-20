const axios = require('axios');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');
const config = require('../../config/app.config');

/**
 * WhatsApp Account Service Constants
 */
const GRAPH_API_TIMEOUT = parseInt(config.whatsapp?.timeout || process.env.WHATSAPP_API_TIMEOUT || '30000');

const MESSAGING_TIERS = {
  TIER_NOT_SET: {
    name: 'TIER_NOT_SET',
    limit: parseInt(config.whatsapp?.tierLimits?.notSet || process.env.WHATSAPP_TIER_NOT_SET || '50'),
    displayName: 'Not Set (50)'
  },
  TIER_50: {
    name: 'TIER_50',
    limit: parseInt(config.whatsapp?.tierLimits?.tier50 || process.env.WHATSAPP_TIER_50 || '250'),
    displayName: '50'
  },
  TIER_250: {
    name: 'TIER_250',
    limit: parseInt(config.whatsapp?.tierLimits?.tier250 || process.env.WHATSAPP_TIER_250 || '1000'),
    displayName: '250'
  },
  TIER_1K: {
    name: 'TIER_1K',
    limit: parseInt(config.whatsapp?.tierLimits?.tier1k || process.env.WHATSAPP_TIER_1K || '10000'),
    displayName: '1,000'
  },
  TIER_10K: {
    name: 'TIER_10K',
    limit: parseInt(config.whatsapp?.tierLimits?.tier10k || process.env.WHATSAPP_TIER_10K || '100000'),
    displayName: '10,000'
  },
  TIER_100K: {
    name: 'TIER_100K',
    limit: parseInt(config.whatsapp?.tierLimits?.tier100k || process.env.WHATSAPP_TIER_100K || '1000000'),
    displayName: '100,000'
  },
  TIER_UNLIMITED: {
    name: 'TIER_UNLIMITED',
    limit: 1000000000,
    displayName: 'Unlimited'
  }
};

const ACCOUNT_FIELDS = {
  LIMITS: 'messaging_limit_tier,quality_rating,name_status,code_verification_status',
  QUALITY: 'quality_rating',
  HEALTH: 'quality_rating,messaging_limit_tier,verified_name,display_phone_number,code_verification_status,is_pin_enabled,is_official_business_account'
};

const DEFAULT_TIER = 'TIER_1K';

/**
 * WhatsApp Account Service
 * Handles account limits, quality rating, phone health, tier information
 */
class WhatsAppAccountService {
  constructor(config) {
    if (!config || !config.phoneNumberId || !config.accessToken) {
      throw new Error('WhatsApp config with phoneNumberId and accessToken is required');
    }

    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || 'v22.0';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.timeout = GRAPH_API_TIMEOUT;
  }

  /**
   * Get account limits and tier info
   */
  async getAccountLimits() {
    const startTime = Date.now();
    
    try {
      logger.info('Fetching account limits', {
        phoneNumberId: this.phoneNumberId
      });

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: ACCOUNT_FIELDS.LIMITS
          },
          timeout: this.timeout
        }
      );

      logger.info('Account limits retrieved successfully', {
        phoneNumberId: this.phoneNumberId,
        tier: response.data.messaging_limit_tier,
        qualityRating: response.data.quality_rating,
        processingTime: `${Date.now() - startTime}ms`
      });

      const tier = response.data.messaging_limit_tier || DEFAULT_TIER;
      const tierConfig = MESSAGING_TIERS[tier] || MESSAGING_TIERS[DEFAULT_TIER];
      const messagingLimit = tierConfig.limit;

      return {
        success: true,
        data: {
          tier: tier,
          tierName: tierConfig.displayName,
          messagingLimit: messagingLimit,
          qualityRating: response.data.quality_rating || 'UNKNOWN',
          nameStatus: response.data.name_status,
          codeVerificationStatus: response.data.code_verification_status,
          rawData: response.data
        }
      };
    } catch (error) {
      logger.error('Get Account Limits Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId,
        code: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      const defaultTier = MESSAGING_TIERS[DEFAULT_TIER];
      return {
        success: true,
        data: {
          tier: DEFAULT_TIER,
          tierName: defaultTier.displayName,
          messagingLimit: defaultTier.limit,
          qualityRating: 'UNKNOWN',
          nameStatus: 'UNKNOWN',
          codeVerificationStatus: 'UNKNOWN',
          note: 'Using default values - API call failed'
        }
      };
    }
  }

  /**
   * Get quality rating
   */
  async getQualityRating() {
    try {
      logger.info('Fetching quality rating', {
        phoneNumberId: this.phoneNumberId
      });

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'quality_rating'
          }
        }
      );

      logger.info('Quality rating retrieved', {
        phoneNumberId: this.phoneNumberId,
        rating: response.data.quality_rating
      });

      return {
        success: true,
        rating: response.data.quality_rating || 'UNKNOWN'
      };
    } catch (error) {
      logger.error('Get Quality Rating Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get phone number health
   */
  async getPhoneNumberHealth() {
    try {
      logger.info('Fetching phone number health', {
        phoneNumberId: this.phoneNumberId
      });

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          params: {
            fields: 'quality_rating,messaging_limit_tier,verified_name,display_phone_number,code_verification_status,is_pin_enabled,is_official_business_account'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Phone number health retrieved successfully', {
        phoneNumberId: this.phoneNumberId,
        qualityRating: response.data.quality_rating,
        messagingLimitTier: response.data.messaging_limit_tier,
        verifiedName: response.data.verified_name
      });

      return {
        success: true,
        data: {
          phoneNumberId: this.phoneNumberId,
          quality_rating: response.data.quality_rating || 'UNKNOWN',
          messaging_limit_tier: response.data.messaging_limit_tier || 'UNKNOWN',
          verified_name: response.data.verified_name || '',
          display_phone_number: response.data.display_phone_number || '',
          code_verification_status: response.data.code_verification_status || 'UNKNOWN',
          is_pin_enabled: response.data.is_pin_enabled || false,
          is_official_business_account: response.data.is_official_business_account || false
        }
      };
    } catch (error) {
      logger.error('Get Phone Number Health Error', {
        error: error.response?.data || error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get Account Messaging Limits
   */
  async getMessagingLimits() {
    try {
      logger.info('Fetching messaging limits', {
        phoneNumberId: this.phoneNumberId
      });

      const healthResult = await this.getPhoneNumberHealth();
      
      if (!healthResult.success) {
        return healthResult;
      }

      const tier = healthResult.data.messaging_limit_tier;
      const limits = {
        'TIER_NOT_SET': { limit: parseInt(process.env.WHATSAPP_TIER_NOT_SET) || 50, description: 'Starter tier - 50 messages per day' },
        'TIER_50': { limit: parseInt(process.env.WHATSAPP_TIER_50) || 250, description: 'Growing tier - 250 messages per day' },
        'TIER_250': { limit: parseInt(process.env.WHATSAPP_TIER_250) || 1000, description: 'Standard tier - 1,000 messages per day' },
        'TIER_1K': { limit: parseInt(process.env.WHATSAPP_TIER_1K) || 10000, description: 'Advanced tier - 10,000 messages per day' },
        'TIER_10K': { limit: parseInt(process.env.WHATSAPP_TIER_10K) || 100000, description: 'Elite tier - 100,000 messages per day' },
        'TIER_100K': { limit: parseInt(process.env.WHATSAPP_TIER_100K) || 1000000, description: 'Premium tier - 1,000,000 messages per day' },
        'TIER_UNLIMITED': { limit: Infinity, description: 'Unlimited tier' },
        'UNKNOWN': { limit: 0, description: 'Unknown tier' }
      };

      return {
        success: true,
        data: {
          current_tier: tier,
          daily_limit: limits[tier]?.limit || 0,
          description: limits[tier]?.description || 'Unknown',
          quality_rating: healthResult.data.quality_rating
        }
      };
    } catch (error) {
      logger.error('Get Messaging Limits Error', {
        error: error.message,
        phoneNumberId: this.phoneNumberId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppAccountService;
