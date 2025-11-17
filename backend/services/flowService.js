const axios = require('axios');

/**
 * WhatsApp Flow Service
 * Handles Flow API operations
 */

class FlowService {
  constructor() {
    this.baseURL = `https://graph.facebook.com/v21.0`;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  /**
   * Create a new flow in WhatsApp
   */
  async createFlow(flowData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.businessAccountId}/flows`,
        {
          name: flowData.name,
          categories: flowData.categories || ['OTHER']
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
        flowId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating flow:', error.response?.data || error.message);
      throw new Error(`Failed to create flow: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Update flow JSON
   */
  async updateFlowJSON(flowId, flowJSON) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${flowId}/assets`,
        {
          name: 'flow.json',
          asset_type: 'FLOW_JSON',
          body: JSON.stringify(flowJSON)
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
        data: response.data,
        validation_errors: response.data.validation_errors || []
      };
    } catch (error) {
      console.error('Error updating flow JSON:', error.response?.data || error.message);
      
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
      const response = await axios.post(
        `${this.baseURL}/${flowId}/publish`,
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
      console.error('Error publishing flow:', error.response?.data || error.message);
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
      console.error('Error deprecating flow:', error.response?.data || error.message);
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
      console.error('Error deleting flow:', error.response?.data || error.message);
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
      console.error('Error getting flow:', error.response?.data || error.message);
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
      console.error('Error listing flows:', error.response?.data || error.message);
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
      console.error('Error sending flow message:', error.response?.data || error.message);
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
      console.error('Error getting flow analytics:', error.response?.data || error.message);
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
