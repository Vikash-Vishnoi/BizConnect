const axios = require('axios');

/**
 * WhatsApp Account Service
 * Handles account limits, quality rating, phone health, tier information
 */
class WhatsAppAccountService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Get account limits and tier info
   */
  async getAccountLimits() {
    try {
      console.log('📊 Fetching account limits...');

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'messaging_limit_tier,quality_rating,name_status,code_verification_status'
          }
        }
      );

      console.log('✅ Account limits retrieved successfully');
      console.log('   Tier:', response.data.messaging_limit_tier);
      console.log('   Quality Rating:', response.data.quality_rating);

      const tierLimits = {
        'TIER_NOT_SET': parseInt(process.env.WHATSAPP_TIER_NOT_SET) || 50,
        'TIER_50': parseInt(process.env.WHATSAPP_TIER_50) || 250,
        'TIER_250': parseInt(process.env.WHATSAPP_TIER_250) || 1000,
        'TIER_1K': parseInt(process.env.WHATSAPP_TIER_1K) || 10000,
        'TIER_10K': parseInt(process.env.WHATSAPP_TIER_10K) || 100000,
        'TIER_100K': parseInt(process.env.WHATSAPP_TIER_100K) || 1000000,
        'TIER_UNLIMITED': 1000000000
      };

      const tier = response.data.messaging_limit_tier || 'TIER_1K';
      const messagingLimit = tierLimits[tier] || tierLimits['TIER_1K'];

      return {
        success: true,
        data: {
          tier: tier,
          tierName: tier.replace('TIER_', '').replace('K', ',000'),
          messagingLimit: messagingLimit,
          qualityRating: response.data.quality_rating || 'UNKNOWN',
          nameStatus: response.data.name_status,
          codeVerificationStatus: response.data.code_verification_status,
          rawData: response.data
        }
      };
    } catch (error) {
      console.error('❌ Get Account Limits Error:', error.response?.data || error.message);
      
      return {
        success: true,
        data: {
          tier: 'TIER_1K',
          tierName: '1,000',
          messagingLimit: 1000,
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
      console.log('⭐ Fetching quality rating...');

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

      console.log('✅ Quality rating retrieved:', response.data.quality_rating);

      return {
        success: true,
        rating: response.data.quality_rating || 'UNKNOWN'
      };
    } catch (error) {
      console.error('❌ Get Quality Rating Error:', error.response?.data || error.message);
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
      console.log('📊 Fetching phone number health...');

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

      console.log('✅ Phone number health retrieved successfully');
      console.log('   Quality Rating:', response.data.quality_rating);
      console.log('   Messaging Limit:', response.data.messaging_limit_tier);
      console.log('   Verified Name:', response.data.verified_name);

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
      console.error('❌ Get Phone Number Health Error:', error.response?.data || error.message);
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
      console.log('📈 Fetching messaging limits...');

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
      console.error('❌ Get Messaging Limits Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppAccountService;
