const axios = require('axios');
const logger = require('../../../common/helpers/logger');
const { getBusinessCredentials } = require('../../../common/helpers/businessContext');
const { ERROR_CODES } = require('../../../common/constants');

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_API_VERSION = 'v22.0';
const DEFAULT_FLOW_CATEGORY = 'OTHER';
const ASSET_TYPE_FLOW_JSON = 'FLOW_JSON';
const ASSET_NAME_FLOW_JSON = 'flow.json';
const FLOW_MESSAGE_VERSION = '3';
const FLOW_ACTION_NAVIGATE = 'navigate';
const DEFAULT_FLOW_CTA = 'Open Form';
const DEFAULT_INITIAL_SCREEN = 'WELCOME';

// ============================================
// SERVICE CLASS
// ============================================

/**
 * WhatsApp Flow Service
 * Handles Flow API operations
 * ✅ MULTI-BUSINESS: Now accepts businessId for all operations
 */

class FlowService {
  constructor(businessId = null) {
    this.businessId = businessId;
    // Credentials loaded on-demand per method call
  }
  
  async getCredentials() {
    if (!this.businessId) {
      const error = new Error('Business ID required for Flow operations');
      error.code = ERROR_CODES.BUSINESS_CONTEXT_REQUIRED;
      throw error;
    }
    const creds = await getBusinessCredentials(this.businessId);
    return {
      baseURL: `https://graph.facebook.com/${creds.apiVersion || DEFAULT_API_VERSION}`,
      accessToken: creds.accessToken,
      businessAccountId: creds.wabaId
    };
  }

  /**
   * Create a new flow in WhatsApp
   */
  async createFlow(flowData) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken, businessAccountId } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${businessAccountId}/flows`,
        {
          name: flowData.name,
          categories: flowData.categories || [DEFAULT_FLOW_CATEGORY]
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow created successfully', {
        businessId: this.businessId.toString(),
        flowId: response.data.id,
        flowName: flowData.name,
        processingTime
      });

      return {
        success: true,
        flowId: response.data.id,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to create flow', {
        businessId: this.businessId.toString(),
        flowName: flowData.name,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to create flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Update flow JSON
   */
  async updateFlowJSON(flowId, flowJSON) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${flowId}/assets`,
        {
          name: ASSET_NAME_FLOW_JSON,
          asset_type: ASSET_TYPE_FLOW_JSON,
          body: JSON.stringify(flowJSON)
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow JSON updated successfully', {
        businessId: this.businessId.toString(),
        flowId,
        validationErrors: response.data.validation_errors?.length || 0,
        processingTime
      });

      return {
        success: true,
        data: response.data,
        validation_errors: response.data.validation_errors || []
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to update flow JSON', {
        businessId: this.businessId.toString(),
        flowId,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      
      // Return validation errors if available
      if (error.response?.data?.error?.error_user_msg) {
        return {
          success: false,
          validation_errors: [{
            message: error.response.data.error.error_user_msg
          }]
        };
      }

      throw new Error(`Failed to update flow JSON: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Publish a flow
   */
  async publishFlow(flowId) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${flowId}/publish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow published successfully', {
        businessId: this.businessId.toString(),
        flowId,
        processingTime
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to publish flow', {
        businessId: this.businessId.toString(),
        flowId,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to publish flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Deprecate a flow
   */
  async deprecateFlow(flowId) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${flowId}/deprecate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow deprecated successfully', {
        businessId: this.businessId.toString(),
        flowId,
        processingTime
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to deprecate flow', {
        businessId: this.businessId.toString(),
        flowId,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to deprecate flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Delete a flow
   */
  async deleteFlow(flowId) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.delete(
        `${baseURL}/${flowId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow deleted successfully', {
        businessId: this.businessId.toString(),
        flowId,
        processingTime
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to delete flow', {
        businessId: this.businessId.toString(),
        flowId,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to delete flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get flow details
   */
  async getFlow(flowId) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.get(
        `${baseURL}/${flowId}`,
        {
          params: {
            fields: 'id,name,status,categories,validation_errors,json_version,data_api_version,endpoint_uri'
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow details retrieved', {
        businessId: this.businessId.toString(),
        flowId,
        flowName: response.data.name,
        processingTime
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get flow details', {
        businessId: this.businessId.toString(),
        flowId,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to get flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * List all flows
   */
  async listFlows() {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken, businessAccountId } = await this.getCredentials();
      
      const response = await axios.get(
        `${baseURL}/${businessAccountId}/flows`,
        {
          params: {
            fields: 'id,name,status,categories,validation_errors'
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flows listed successfully', {
        businessId: this.businessId.toString(),
        flowCount: response.data.data?.length || 0,
        processingTime
      });

      return {
        success: true,
        flows: response.data.data || [],
        paging: response.data.paging
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to list flows', {
        businessId: this.businessId.toString(),
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to list flows: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send a flow message
   */
  async sendFlowMessage(phoneNumberId, recipientPhone, flowData) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'interactive',
          interactive: {
            type: 'flow',
            header: flowData.header ? {
              type: 'text',
              text: flowData.header
            } : undefined,
            body: {
              text: flowData.body
            },
            footer: flowData.footer ? {
              text: flowData.footer
            } : undefined,
            action: {
              name: 'flow',
              parameters: {
                flow_message_version: FLOW_MESSAGE_VERSION,
                flow_token: flowData.flow_token,
                flow_id: flowData.flow_id,
                flow_cta: flowData.flow_cta || DEFAULT_FLOW_CTA,
                flow_action: flowData.flow_action || FLOW_ACTION_NAVIGATE,
                flow_action_payload: flowData.flow_action_payload || {
                  screen: flowData.initial_screen || DEFAULT_INITIAL_SCREEN
                }
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow message sent successfully', {
        businessId: this.businessId.toString(),
        recipientPhone,
        flowId: flowData.flow_id,
        messageId: response.data.messages[0].id,
        processingTime
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to send flow message', {
        businessId: this.businessId.toString(),
        recipientPhone,
        flowId: flowData.flow_id,
        error: error.response?.data || error.message,
        errorCode: error.code || ERROR_CODES.WHATSAPP_API_ERROR,
        processingTime
      });
      throw new Error(`Failed to send flow message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get flow analytics
   */
  async getFlowAnalytics(flowId) {
    const startTime = Date.now();
    
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.get(
        `${baseURL}/${flowId}/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Flow analytics retrieved', {
        businessId: this.businessId.toString(),
        flowId,
        processingTime
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.warn('Flow analytics not available', {
        businessId: this.businessId.toString(),
        flowId,
        error: error.response?.data || error.message,
        processingTime
      });
      // Analytics endpoint might not be available for all flows
      return {
        success: false,
        message: 'Analytics not available for this flow'
      };
    }
  }

  /**
   * Validate flow JSON structure
   */
  validateFlowJSON(flowJSON) {
    const errors = [];

    // Check required fields
    if (!flowJSON.version) {
      errors.push({ message: 'Flow JSON must have a version' });
    }

    if (!flowJSON.screens || flowJSON.screens.length === 0) {
      errors.push({ message: 'Flow must have at least one screen' });
    }

    // Check for terminal screen
    if (flowJSON.screens) {
      const hasTerminal = flowJSON.screens.some(screen => screen.terminal === true);
      if (!hasTerminal) {
        errors.push({ message: 'Flow must have at least one terminal screen' });
      }
    }

    // Validate screen structure
    if (flowJSON.screens) {
      flowJSON.screens.forEach((screen, index) => {
        if (!screen.id) {
          errors.push({ message: `Screen ${index} must have an id` });
        }
        if (!screen.layout) {
          errors.push({ message: `Screen ${screen.id || index} must have a layout` });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new FlowService();
