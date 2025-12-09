const axios = require('axios');

/**
 * WhatsApp Business Service
 * Handles business profile, hours, and location management
 */
class WhatsAppBusinessService {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Get Business Profile information
   */
  async getBusinessProfile() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: 'about,address,description,email,profile_picture_url,websites,vertical'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📊 Business profile retrieved successfully');
      
      return {
        success: true,
        data: response.data.data[0] || {}
      };
    } catch (error) {
      console.error('Get Business Profile Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Update Business Profile information
   */
  async updateBusinessProfile(profileData) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          ...profileData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Business profile updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update Business Profile Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Upload and set business profile photo
   */
  async updateProfilePhoto(mediaId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          profile_picture_handle: mediaId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Profile photo updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update Profile Photo Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Update Business Hours
   */
  async updateBusinessHours(businessHours) {
    try {
      console.log('⏰ Updating business hours...');

      const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

      for (const day of validDays) {
        if (businessHours[day]) {
          const { open_time, close_time, is_open } = businessHours[day];
          
          if (is_open) {
            if (!timeRegex.test(open_time)) {
              throw new Error(`Invalid open_time format for ${day}. Use HH:MM (24-hour format)`);
            }
            if (!timeRegex.test(close_time)) {
              throw new Error(`Invalid close_time format for ${day}. Use HH:MM (24-hour format)`);
            }
          }
        }
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          business_hours: businessHours
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Business hours updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update Business Hours Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get Business Hours
   */
  async getBusinessHours() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: 'business_hours'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const businessHours = response.data.data[0]?.business_hours || {};
      console.log('⏰ Business hours retrieved successfully');
      
      return {
        success: true,
        data: businessHours
      };
    } catch (error) {
      console.error('Get Business Hours Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Update Business Location
   */
  async updateBusinessLocation(address) {
    try {
      console.log('📍 Updating business location...');

      if (!address || typeof address !== 'string' || address.trim() === '') {
        throw new Error('Valid address is required');
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          address: address.trim()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Business location updated successfully');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Update Business Location Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get Business Location
   */
  async getBusinessLocation() {
    try {
      console.log('📍 Fetching business location...');

      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          params: {
            fields: 'address'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const address = response.data.data[0]?.address || '';
      console.log('✅ Business location retrieved');
      
      return {
        success: true,
        address: address
      };
    } catch (error) {
      console.error('❌ Get Business Location Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = WhatsAppBusinessService;
