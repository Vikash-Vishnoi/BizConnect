const axios = require('axios');
const Flow = require('../../../core/database/models/Flow');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');

/**
 * Flow Publishing Service
 * Handles publishing WhatsApp Flows to Meta's Graph API
 * 
 * P0 CRITICAL FIX: Flows cannot be used without publishing to WhatsApp
 */

class FlowPublishingService {
  /**
   * Publish a flow to WhatsApp
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Published flow details
   */
  async publishFlow(flowId, userId) {
    try {
      // 1. Get flow from database
      const flow = await Flow.findOne({ _id: flowId, user: userId, isActive: true });
      if (!flow) {
        throw new Error('Flow not found');
      }

      // 2. Get business credentials
      const business = await Business.findById(flow.businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      // 3. Validate flow structure BEFORE publishing
      const validationErrors = flow.validateStructure();
      if (validationErrors.length > 0) {
        flow.validation_errors = validationErrors;
        flow.status = 'DRAFT';
        await flow.save();
        
        throw new Error(`Flow validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // 4. Convert to WhatsApp Flow JSON format
      const flowJSON = flow.toFlowJSON();

      // 5. Prepare WhatsApp API request
      const wabaId = business.whatsappConfig.wabaId;
      const accessToken = business.whatsappConfig.accessToken;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/flows`;

      const payload = {
        name: flow.name,
        categories: flow.categories || ['OTHER'],
        ...(flow.flowId ? { flow_id: flow.flowId } : {}), // Update if already published
      };

      // 6. If flow already published, use UPDATE instead of CREATE
      let response;
      if (flow.flowId) {
        // UPDATE existing flow
        const updateUrl = `https://graph.facebook.com/${apiVersion}/${flow.flowId}`;
        response = await axios.post(
          updateUrl,
          {
            name: flow.name,
            categories: flow.categories || ['OTHER']
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Update flow JSON
        const updateJsonUrl = `https://graph.facebook.com/${apiVersion}/${flow.flowId}/assets`;
        await axios.post(
          updateJsonUrl,
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

        logger.info(`Flow updated on WhatsApp: ${flow.flowId}`, { flowId: flow._id });
      } else {
        // CREATE new flow
        response = await axios.post(
          url,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const whatsappFlowId = response.data.id;

        // Upload flow JSON
        const uploadUrl = `https://graph.facebook.com/${apiVersion}/${whatsappFlowId}/assets`;
        await axios.post(
          uploadUrl,
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

        // 7. Save WhatsApp Flow ID to database
        flow.flowId = whatsappFlowId;

        logger.info(`Flow published to WhatsApp: ${whatsappFlowId}`, { flowId: flow._id });
      }

      // 8. Update flow status
      flow.status = 'PUBLISHED';
      flow.businessAccountId = wabaId;
      flow.validation_errors = [];
      await flow.save();

      return {
        success: true,
        flowId: flow.flowId,
        whatsappFlowId: flow.flowId,
        status: flow.status,
        message: flow.flowId ? 'Flow updated successfully' : 'Flow published successfully'
      };

    } catch (error) {
      logger.error('Flow publishing failed', {
        flowId,
        error: error.message,
        response: error.response?.data
      });

      // Update flow with error
      const flow = await Flow.findById(flowId);
      if (flow) {
        flow.status = 'DRAFT';
        flow.validation_errors = [{
          error_type: 'PUBLISH_ERROR',
          message: error.response?.data?.error?.message || error.message
        }];
        await flow.save();
      }

      throw error;
    }
  }

  /**
   * Validate flow without publishing
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Validation result
   */
  async validateFlow(flowId, userId) {
    try {
      const flow = await Flow.findOne({ _id: flowId, user: userId, isActive: true });
      if (!flow) {
        throw new Error('Flow not found');
      }

      const errors = flow.validateStructure();
      
      flow.validation_errors = errors;
      await flow.save();

      return {
        valid: errors.length === 0,
        errors,
        message: errors.length === 0 ? 'Flow is valid' : `Found ${errors.length} validation error(s)`
      };

    } catch (error) {
      logger.error('Flow validation failed', { flowId, error: error.message });
      throw error;
    }
  }

  /**
   * Unpublish (deprecate) a flow on WhatsApp
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Result
   */
  async unpublishFlow(flowId, userId) {
    try {
      const flow = await Flow.findOne({ _id: flowId, user: userId, isActive: true });
      if (!flow) {
        throw new Error('Flow not found');
      }

      if (!flow.flowId) {
        throw new Error('Flow is not published');
      }

      const business = await Business.findById(flow.businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Deprecate flow on WhatsApp (cannot delete, only deprecate)
      const url = `https://graph.facebook.com/${apiVersion}/${flow.flowId}`;
      await axios.post(
        url,
        { status: 'DEPRECATED' },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update database
      flow.status = 'DEPRECATED';
      await flow.save();

      logger.info(`Flow deprecated: ${flow.flowId}`, { flowId: flow._id });

      return {
        success: true,
        message: 'Flow deprecated successfully'
      };

    } catch (error) {
      logger.error('Flow unpublish failed', {
        flowId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get flow preview URL for testing
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Preview URL
   */
  async getFlowPreview(flowId, userId) {
    try {
      const flow = await Flow.findOne({ _id: flowId, user: userId, isActive: true });
      if (!flow) {
        throw new Error('Flow not found');
      }

      if (!flow.flowId) {
        throw new Error('Flow is not published. Please publish the flow first.');
      }

      const business = await Business.findById(flow.businessId).select('+whatsappConfig.accessToken');
      if (!business) {
        throw new Error('Business not found');
      }

      const accessToken = business.whatsappConfig.accessToken;
      const apiVersion = business.whatsappConfig.apiVersion || 'v17.0';

      // Get preview from WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${flow.flowId}?fields=preview.invalidate(true)`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        previewUrl: response.data.preview?.preview_url,
        expiresAt: response.data.preview?.expires_at
      };

    } catch (error) {
      logger.error('Flow preview failed', {
        flowId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
}

module.exports = new FlowPublishingService();
