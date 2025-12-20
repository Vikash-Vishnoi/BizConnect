const Flow = require('../../../core/database/models/Flow');
const FlowResponse = require('../../../core/database/models/FlowResponse');
const logger = require('../../../common/helpers/logger');
const config = require('../../../config/server.config');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

/**
 * Flow Data Service Constants
 */
const FLOW_API_VERSION = '3.0';
const DEFAULT_SCREEN = 'ERROR';
const MAX_DYNAMIC_OPTIONS = 100;

class FlowDataService {
  /**
   * Handle dynamic data request from WhatsApp Flow
   * This endpoint is called by WhatsApp when a flow needs dynamic data
   * @param {String} flowId - Flow ID from WhatsApp
   * @param {Object} requestData - Data sent by WhatsApp
   * @param {String} businessId - Business ID for context
   * @returns {Promise<Object>} Dynamic data response
   */
  async handleFlowDataRequest(flowId, requestData, businessId = null) {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Find flow with business context
      const query = { flowId };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);

      if (!flow) {
        logger.error('Flow not found for data request', { 
          flowId, 
          businessId,
          requestScreen: requestData?.screen 
        });
        return {
          version: FLOW_API_VERSION,
          screen: requestData?.screen || DEFAULT_SCREEN,
          data: {},
          error_messages: ['Flow not found or access denied']
        };
      }

      // Extract data from request
      const { screen, data = {}, flow_token } = requestData || {};

      logger.info('Flow data request received', {
        flowId: flow._id,
        flowName: flow.name,
        businessId: flow.businessId,
        screen,
        flow_token,
        dataKeys: Object.keys(data),
        service: 'flow-data'
      });

      // Get screen configuration
      const screenConfig = flow.screens?.find(s => s.id === screen);

      if (!screenConfig) {
        logger.warn('Screen not found in flow', { flowId, screen, businessId });
        return {
          version: flow.data_api_version || FLOW_API_VERSION,
          screen: screen || DEFAULT_SCREEN,
          data: {},
          error_messages: [`Screen '${screen}' not found in flow configuration`]
        };
      }

      // Build dynamic data response based on screen components
      const dynamicData = await this.buildDynamicData(flow, screenConfig, data);

      const responseTime = Date.now() - startTime;
      logger.info('Flow data request completed', {
        flowId: flow._id,
        screen,
        businessId: flow.businessId,
        responseTime,
        service: 'flow-data'
      });

      return {
        version: flow.data_api_version || FLOW_API_VERSION,
        screen,
        data: dynamicData
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error handling flow data request', { 
        error: error.message,
        stack: error.stack,
        flowId,
        businessId,
        requestData: requestData?.screen,
        responseTime
      });
      
      return {
        version: FLOW_API_VERSION,
        screen: requestData?.screen || DEFAULT_SCREEN,
        data: {},
        error_messages: [
          config.isProduction() 
            ? 'Internal server error processing flow data'
            : error.message
        ]
      };
    }
  }

  /**
   * Build dynamic data for a screen
   * @param {Object} flow - Flow document
   * @param {Object} screenConfig - Screen configuration
   * @param {Object} currentData - Current form data
   * @returns {Promise<Object>} Dynamic data object
   */
  async buildDynamicData(flow, screenConfig, currentData) {
    const dynamicData = {};

    // Validate inputs
    if (!screenConfig?.form_components) {
      return dynamicData;
    }

    try {
      // Process each form component
      for (const component of screenConfig.form_components) {
        if (!component?.name) continue;

        // Handle static data source
        if (component.data_source && Array.isArray(component.data_source)) {
          // Limit options to prevent response size issues
          dynamicData[component.name] = component.data_source.slice(0, MAX_DYNAMIC_OPTIONS);
          continue;
        }

        // Handle dynamic data based on component type
        if (component.type === 'Dropdown' && !component.data_source) {
          const options = await this.getDynamicOptions(flow, component, currentData);
          if (options && Array.isArray(options)) {
            dynamicData[component.name] = options.slice(0, MAX_DYNAMIC_OPTIONS);
          }
        }
      }

      return dynamicData;
    } catch (error) {
      logger.error('Error building dynamic data', {
        error: error.message,
        flowId: flow._id,
        screenId: screenConfig.id,
        businessId: flow.businessId
      });
      return dynamicData;
    }
  }

  /**
   * Get dynamic options for a component
   * Override this method to inject custom business logic
   * @param {Object} flow - Flow document
   * @param {Object} component - Component configuration
   * @param {Object} currentData - Current form data
   * @returns {Promise<Array>} Dynamic options
   */
  async getDynamicOptions(flow, component, currentData) {
    // Example: Return time slots, product lists, etc.
    // This is a placeholder - implement custom logic per flow/component

    // Example logic for appointment booking
    if (component.name === 'time_slot') {
      return this.getAvailableTimeSlots(currentData.date);
    }

    // Example logic for product selection
    if (component.name === 'product_variant') {
      return this.getProductVariants(currentData.product_id);
    }

    return [];
  }

  /**
   * Set or update flow data endpoint URL
   * @param {String} flowId - Flow ID (database)
   * @param {String} endpointUrl - Data endpoint URL
   * @param {String} userId - User ID making the change
   * @param {String} businessId - Business ID for context
   * @returns {Promise<Object>} Updated flow
   */
  async setDataEndpoint(flowId, endpointUrl, userId, businessId = null) {
    try {
      // Validate inputs
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      // Find flow with business context
      const query = { _id: flowId, user: userId };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query);

      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      // Validate URL format if provided
      if (endpointUrl) {
        if (!this.isValidUrl(endpointUrl)) {
          const error = new Error('Invalid endpoint URL format. Must be a valid HTTP/HTTPS URL.');
          error.code = ERROR_CODES.VALIDATION_ERROR;
          throw error;
        }

        // Security: Only allow HTTPS in production
        if (config.isProduction() && !endpointUrl.startsWith('https://')) {
          const error = new Error('Only HTTPS URLs are allowed in production');
          error.code = ERROR_CODES.VALIDATION_ERROR;
          throw error;
        }
      }

      // Update endpoint
      if (!flow.settings) {
        flow.settings = {};
      }

      const oldEndpoint = flow.settings.data_endpoint;
      flow.settings.data_endpoint = endpointUrl;
      
      await flow.save();

      logger.info('Flow data endpoint updated', {
        flowId: flow._id,
        flowName: flow.name,
        businessId: flow.businessId,
        oldEndpoint,
        newEndpoint: endpointUrl,
        userId,
        service: 'flow-data'
      });

      return {
        flowId: flow._id,
        flowName: flow.name,
        businessId: flow.businessId,
        dataEndpoint: endpointUrl,
        previousEndpoint: oldEndpoint
      };
    } catch (error) {
      logger.error('Error setting data endpoint', { 
        error: error.message,
        flowId,
        businessId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get flow data endpoint configuration
   * @param {String} flowId - Flow ID (database)
   * @param {String} businessId - Business ID for context
   * @returns {Promise<Object>} Data endpoint config
   */
  async getDataEndpoint(flowId, businessId = null) {
    try {
      if (!flowId) {
        const error = new Error('Flow ID is required');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }

      const query = { _id: flowId };
      if (businessId) {
        query.businessId = businessId;
      }

      const flow = await Flow.findOne(query).select('name businessId settings.data_endpoint');

      if (!flow) {
        const error = new Error('Flow not found or access denied');
        error.code = ERROR_CODES.NOT_FOUND;
        throw error;
      }

      return {
        flowId: flow._id,
        flowName: flow.name,
        businessId: flow.businessId,
        dataEndpoint: flow.settings?.data_endpoint || null,
        hasDataEndpoint: !!flow.settings?.data_endpoint
      };
    } catch (error) {
      logger.error('Error getting data endpoint', { 
        error: error.message,
        flowId,
        businessId
      });
      throw error;
    }
  }

  /**
   * Test flow data endpoint
   * Sends a test request to verify endpoint is working
   * @param {String} flowId - Flow ID
   * @param {Object} testPayload - Test data payload
   * @returns {Promise<Object>} Test result
   */
  async testDataEndpoint(flowId, testPayload = {}) {
    try {
      const flow = await Flow.findById(flowId);

      if (!flow) {
        throw new Error('Flow not found');
      }

      const endpoint = flow.settings?.data_endpoint;
      if (!endpoint) {
        throw new Error('No data endpoint configured for this flow');
      }

      // Build test request
      const testRequest = {
        version: flow.data_api_version || '3.0',
        screen: testPayload.screen || 'SCREEN_1',
        data: testPayload.data || {},
        flow_token: testPayload.flow_token || 'test_token'
      };

      // Call the endpoint (internal call)
      const response = await this.handleFlowDataRequest(flow.flowId, testRequest);

      return {
        success: !response.error_messages || response.error_messages.length === 0,
        endpoint,
        testRequest,
        response,
        message: response.error_messages ? 'Endpoint returned errors' : 'Endpoint test successful'
      };
    } catch (error) {
      logger.error('Error testing data endpoint:', error);
      return {
        success: false,
        error: error.message,
        message: 'Endpoint test failed'
      };
    }
  }

  /**
   * Helper: Validate URL format
   * @private
   */
  isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Example helper: Get available time slots
   * @private
   */
  async getAvailableTimeSlots(date) {
    // Example implementation - replace with actual business logic
    const slots = [
      { id: '09:00', title: '9:00 AM', enabled: true },
      { id: '10:00', title: '10:00 AM', enabled: true },
      { id: '11:00', title: '11:00 AM', enabled: true },
      { id: '14:00', title: '2:00 PM', enabled: true },
      { id: '15:00', title: '3:00 PM', enabled: true },
      { id: '16:00', title: '4:00 PM', enabled: true }
    ];

    return slots;
  }

  /**
   * Example helper: Get product variants
   * @private
   */
  async getProductVariants(productId) {
    // Example implementation - replace with actual product database query
    return [
      { id: 'small', title: 'Small', enabled: true },
      { id: 'medium', title: 'Medium', enabled: true },
      { id: 'large', title: 'Large', enabled: true }
    ];
  }
}

module.exports = new FlowDataService();
