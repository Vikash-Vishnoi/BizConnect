const axios = require('axios');
const logger = require('../../../common/helpers/logger');
const { getBusinessCredentials } = require('../../../common/helpers/businessContext');

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
      throw new Error('Business ID required for Flow operations');
    }
    const creds = await getBusinessCredentials(this.businessId);
    return {
      baseURL: `https://graph.facebook.com/${creds.apiVersion || 'v22.0'}`,
      accessToken: creds.accessToken,
      businessAccountId: creds.wabaId
    };
  }

  /**
   * Create a new flow in WhatsApp
   */
  async createFlow(flowData) {
    try {
      const { baseURL, accessToken, businessAccountId } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${businessAccountId}/flows`,
        {
          name: flowData.name,
          categories: flowData.categories || ['OTHER']
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        flowId: response.data.id,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to create flow', {
        businessId: this.businessId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to create flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Update flow JSON
   */
  async updateFlowJSON(flowId, flowJSON) {
    try {
      const { baseURL, accessToken } = await this.getCredentials();
      
      const response = await axios.post(
        `${baseURL}/${flowId}/assets`,
        {
          name: 'flow.json',
          asset_type: 'FLOW_JSON',
          body: JSON.stringify(flowJSON)
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data,
        validation_errors: response.data.validation_errors || []
      };
    } catch (error) {
      logger.error('Failed to update flow JSON', {
        businessId: this.businessId,
        flowId,
        error: error.response?.data || error.message
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

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to publish flow', {
        businessId: this.businessId,
        flowId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to publish flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Deprecate a flow
   */
  async deprecateFlow(flowId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${flowId}/deprecate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to deprecate flow', {
        businessId: this.businessId,
        flowId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to deprecate flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Delete a flow
   */
  async deleteFlow(flowId) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/${flowId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to delete flow', {
        businessId: this.businessId,
        flowId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to delete flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get flow details
   */
  async getFlow(flowId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${flowId}`,
        {
          params: {
            fields: 'id,name,status,categories,validation_errors,json_version,data_api_version,endpoint_uri'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to get flow details', {
        businessId: this.businessId,
        flowId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to get flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * List all flows
   */
  async listFlows() {
    try {
      const response = await axios.get(
        `${this.baseURL}/${this.businessAccountId}/flows`,
        {
          params: {
            fields: 'id,name,status,categories,validation_errors'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        flows: response.data.data || [],
        paging: response.data.paging
      };
    } catch (error) {
      logger.error('Failed to list flows', {
        businessId: this.businessId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to list flows: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send a flow message
   */
  async sendFlowMessage(phoneNumberId, recipientPhone, flowData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${phoneNumberId}/messages`,
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
                flow_message_version: '3',
                flow_token: flowData.flow_token,
                flow_id: flowData.flow_id,
                flow_cta: flowData.flow_cta || 'Open Form',
                flow_action: flowData.flow_action || 'navigate',
                flow_action_payload: flowData.flow_action_payload || {
                  screen: flowData.initial_screen || 'WELCOME'
                }
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to send flow message', {
        businessId: this.businessId,
        recipientPhone,
        flowId: flowData.flow_id,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to send flow message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get flow analytics
   */
  async getFlowAnalytics(flowId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${flowId}/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.warn('Flow analytics not available', {
        businessId: this.businessId,
        flowId,
        error: error.response?.data || error.message
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
