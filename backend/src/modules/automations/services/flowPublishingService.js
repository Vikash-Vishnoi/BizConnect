const axios = require('axios');
const Flow = require('../../../core/database/models/Flow');
const Business = require('../../../core/database/models/Business');
const logger = require('../../../common/helpers/logger');
const config = require('../../../config/server.config');
const { getBusinessCredentials } = require('../../../common/helpers/businessContext');
const { ERROR_CODES } = require('../../../common/constants');

/**
 * Flow Publishing Service
 * Handles publishing WhatsApp Flows to Meta's Graph API
 */

/**
 * Flow Publishing Constants
 */
const FLOW_CATEGORIES = ['SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'LEAD_GENERATION', 'CONTACT_US', 'CUSTOMER_SUPPORT', 'SURVEY', 'OTHER'];
const FLOW_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  DEPRECATED: 'DEPRECATED',
  BLOCKED: 'BLOCKED'
};
const ASSET_TYPES = {
  FLOW_JSON: 'FLOW_JSON'
};
const GRAPH_API_TIMEOUT = 30000; // 30 seconds

class FlowPublishingService {
  /**
   * Publish a flow to WhatsApp
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @param {string} businessId - Business ID for context
   * @returns {Promise<Object>} Published flow details
   */
  async publishFlow(flowId, userId, businessId = null) {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      if (!userId) {
        const error = new Error('User ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // 1. Get flow from database
      const query = { _id: flowId, user: userId, isActive: true };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);
      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // 2. Get business credentials
      const credentials = await getBusinessCredentials(flow.businessId);
      const { accessToken, wabaId } = credentials;
      const apiVersion = config.whatsapp?.apiVersion || 'v17.0';

      // 3. Validate flow structure BEFORE publishing
      const validationErrors = flow.validateStructure();
      if (validationErrors.length > 0) {
        flow.validation_errors = validationErrors;
        flow.status = FLOW_STATUS.DRAFT;
        await flow.save();
        
        const error = new Error(`Flow validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // 4. Convert to WhatsApp Flow JSON format
      const flowJSON = flow.toFlowJSON();

      // 5. If flow already published, use UPDATE instead of CREATE
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
            },
            timeout: GRAPH_API_TIMEOUT
          }
        );

        // Update flow JSON
        const updateJsonUrl = `https://graph.facebook.com/${apiVersion}/${flow.flowId}/assets`;
        await axios.post(
          updateJsonUrl,
          {
            name: 'flow.json',
            asset_type: ASSET_TYPES.FLOW_JSON,
            body: JSON.stringify(flowJSON)
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: GRAPH_API_TIMEOUT
          }
        );

        logger.info('Flow updated on WhatsApp', { 
          flowId: flow._id,
          whatsappFlowId: flow.flowId,
          businessId: flow.businessId
        });
      } else {
        // CREATE new flow
        const createUrl = `https://graph.facebook.com/${apiVersion}/${wabaId}/flows`;
        response = await axios.post(
          createUrl,
          {
            name: flow.name,
            categories: flow.categories || ['OTHER']
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: GRAPH_API_TIMEOUT
          }
        );

        const whatsappFlowId = response.data.id;

        // Upload flow JSON
        const uploadUrl = `https://graph.facebook.com/${apiVersion}/${whatsappFlowId}/assets`;
        await axios.post(
          uploadUrl,
          {
            name: 'flow.json',
            asset_type: ASSET_TYPES.FLOW_JSON,
            body: JSON.stringify(flowJSON)
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: GRAPH_API_TIMEOUT
          }
        );

        // Save WhatsApp Flow ID to database
        flow.flowId = whatsappFlowId;

        logger.info('Flow published to WhatsApp', { 
          flowId: flow._id,
          whatsappFlowId,
          businessId: flow.businessId
        });
      }

      // Update flow status
      const isUpdate = !!flow.flowId;
      flow.status = FLOW_STATUS.PUBLISHED;
      flow.businessAccountId = wabaId;
      flow.validation_errors = [];
      await flow.save();

      const processingTime = Date.now() - startTime;
      logger.info('Flow publishing completed', {
        flowId: flow._id,
        whatsappFlowId: flow.flowId,
        businessId: flow.businessId,
        isUpdate,
        processingTime
      });

      return {
        success: true,
        flowId: flow._id,
        whatsappFlowId: flow.flowId,
        status: flow.status,
        message: isUpdate ? 'Flow updated successfully' : 'Flow published successfully',
        businessId: flow.businessId
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Flow publishing failed', {
        flowId,
        userId,
        businessId,
        error: error.message,
        code: error.code,
        response: error.response?.data,
        processingTime
      });

      // Update flow with error (only if validation didn't already set it)
      if (error.code !== ERROR_CODES.VALIDATION_ERROR) {
        try {
          const flow = await Flow.findById(flowId);
          if (flow) {
            flow.status = FLOW_STATUS.DRAFT;
            flow.validation_errors = [{
              error_type: 'PUBLISH_ERROR',
              message: error.response?.data?.error?.message || error.message
            }];
            await flow.save();
          }
        } catch (updateError) {
          logger.error('Failed to update flow with error status', {
            flowId,
            error: updateError.message
          });
        }
      }

      // Set appropriate error code if not already set
      if (!error.code) {
        error.code = error.response?.data?.error?.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR;
      }

      throw error;
    }
  }

  /**
   * Validate flow without publishing
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @param {string} businessId - Business ID for context
   * @returns {Promise<Object>} Validation result
   */
  async validateFlow(flowId, userId, businessId = null) {
    try {
      // Validate inputs
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: flowId, user: userId, isActive: true };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);
      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      const errors = flow.validateStructure();
      
      flow.validation_errors = errors;
      await flow.save();

      logger.info('Flow validation completed', {
        flowId: flow._id,
        businessId: flow.businessId,
        valid: errors.length === 0,
        errorCount: errors.length
      });

      return {
        valid: errors.length === 0,
        errors,
        flowId: flow._id,
        businessId: flow.businessId,
        message: errors.length === 0 ? 'Flow is valid' : `Found ${errors.length} validation error(s)`
      };
    } catch (error) {
      logger.error('Flow validation failed', { 
        flowId, 
        userId,
        businessId,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Unpublish (deprecate) a flow on WhatsApp
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @param {string} businessId - Business ID for context
   * @returns {Promise<Object>} Result
   */
  async unpublishFlow(flowId, userId, businessId = null) {
    try {
      // Validate inputs
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: flowId, user: userId, isActive: true };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);
      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      if (!flow.flowId) {
        const error = new Error('Flow is not published');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const credentials = await getBusinessCredentials(flow.businessId);
      const { accessToken } = credentials;
      const apiVersion = config.whatsapp?.apiVersion || 'v17.0';

      // Deprecate flow on WhatsApp (cannot delete, only deprecate)
      const url = `https://graph.facebook.com/${apiVersion}/${flow.flowId}`;
      await axios.post(
        url,
        { status: FLOW_STATUS.DEPRECATED },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: GRAPH_API_TIMEOUT
        }
      );

      // Update database
      flow.status = FLOW_STATUS.DEPRECATED;
      await flow.save();

      logger.info('Flow deprecated', { 
        flowId: flow._id,
        whatsappFlowId: flow.flowId,
        businessId: flow.businessId
      });

      return {
        success: true,
        flowId: flow._id,
        whatsappFlowId: flow.flowId,
        businessId: flow.businessId,
        message: 'Flow deprecated successfully'
      };
    } catch (error) {
      logger.error('Flow unpublish failed', {
        flowId,
        userId,
        businessId,
        error: error.message,
        code: error.code,
        response: error.response?.data
      });

      if (!error.code) {
        error.code = error.response?.data?.error?.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR;
      }

      throw error;
    }
  }

  /**
   * Get flow preview URL for testing
   * @param {string} flowId - Database flow ID
   * @param {string} userId - User ID for authorization
   * @param {string} businessId - Business ID for context
   * @returns {Promise<Object>} Preview URL
   */
  async getFlowPreview(flowId, userId, businessId = null) {
    try {
      // Validate inputs
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: flowId, user: userId, isActive: true };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);
      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      if (!flow.flowId) {
        const error = new Error('Flow is not published. Please publish the flow first.');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const credentials = await getBusinessCredentials(flow.businessId);
      const { accessToken } = credentials;
      const apiVersion = config.whatsapp?.apiVersion || 'v17.0';

      // Get preview from WhatsApp
      const url = `https://graph.facebook.com/${apiVersion}/${flow.flowId}?fields=preview.invalidate(true)`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: GRAPH_API_TIMEOUT
      });

      logger.info('Flow preview URL generated', {
        flowId: flow._id,
        whatsappFlowId: flow.flowId,
        businessId: flow.businessId
      });

      return {
        success: true,
        flowId: flow._id,
        whatsappFlowId: flow.flowId,
        businessId: flow.businessId,
        previewUrl: response.data.preview?.preview_url,
        expiresAt: response.data.preview?.expires_at
      };
    } catch (error) {
      logger.error('Flow preview failed', {
        flowId,
        userId,
        businessId,
        error: error.message,
        code: error.code,
        response: error.response?.data
      });

      if (!error.code) {
        error.code = error.response?.data?.error?.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR;
      }

      throw error;
    }
  }
}

module.exports = new FlowPublishingService();
module.exports.FLOW_CATEGORIES = FLOW_CATEGORIES;
module.exports.FLOW_STATUS = FLOW_STATUS;
