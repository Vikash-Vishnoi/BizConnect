const Flow = require('../../../core/database/models/Flow');
const FlowResponse = require('../../../core/database/models/FlowResponse');
const logger = require('../../../common/helpers/logger');

class FlowDataService {
  /**
   * Handle dynamic data request from WhatsApp Flow
   * This endpoint is called by WhatsApp when a flow needs dynamic data
   * @param {String} flowId - Flow ID from WhatsApp
   * @param {Object} requestData - Data sent by WhatsApp
   * @returns {Promise<Object>} Dynamic data response
   */
  async handleFlowDataRequest(flowId, requestData) {
    try {
      const flow = await Flow.findOne({ flowId });

      if (!flow) {
        logger.error('Flow not found for data request:', { flowId });
        return {
          version: '3.0',
          screen: requestData.screen || 'ERROR',
          data: {},
          error_messages: ['Flow not found']
        };
      }

      // Extract data from request
      const { screen, data = {}, flow_token } = requestData;

      logger.info('Flow data request received', {
        flowId,
        screen,
        flow_token,
        dataKeys: Object.keys(data)
      });

      // Get screen configuration
      const screenConfig = flow.screens.find(s => s.id === screen);

      if (!screenConfig) {
        return {
          version: flow.data_api_version || '3.0',
          screen,
          data: {},
          error_messages: [`Screen '${screen}' not found`]
        };
      }

      // Build dynamic data response based on screen components
      const dynamicData = await this.buildDynamicData(flow, screenConfig, data);

      return {
        version: flow.data_api_version || '3.0',
        screen,
        data: dynamicData
      };
    } catch (error) {
      logger.error('Error handling flow data request:', error);
      return {
        version: '3.0',
        screen: requestData.screen || 'ERROR',
        data: {},
        error_messages: ['Internal server error processing flow data']
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

    // Process each form component
    for (const component of screenConfig.form_components || []) {
      // Handle dropdown/radio/checkbox data sources
      if (component.data_source && Array.isArray(component.data_source)) {
        // Data source already defined in component
        dynamicData[component.name] = component.data_source;
      }

      // Handle dynamic data based on component type
      if (component.type === 'Dropdown' && !component.data_source) {
        // If no static data source, can inject dynamic options here
        dynamicData[component.name] = await this.getDynamicOptions(
          flow,
          component,
          currentData
        );
      }
    }

    return dynamicData;
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
   * @returns {Promise<Object>} Updated flow
   */
  async setDataEndpoint(flowId, endpointUrl, userId) {
    try {
      const flow = await Flow.findOne({ _id: flowId, user: userId });

      if (!flow) {
        throw new Error('Flow not found');
      }

      // Validate URL format
      if (endpointUrl && !this.isValidUrl(endpointUrl)) {
        throw new Error('Invalid endpoint URL format');
      }

      if (!flow.settings) {
        flow.settings = {};
      }

      const oldEndpoint = flow.settings.data_endpoint;
      flow.settings.data_endpoint = endpointUrl;
      
      await flow.save();

      logger.info('Flow data endpoint updated', {
        flowId: flow._id,
        oldEndpoint,
        newEndpoint: endpointUrl,
        userId
      });

      return {
        flowId: flow._id,
        flowName: flow.name,
        dataEndpoint: endpointUrl,
        previousEndpoint: oldEndpoint
      };
    } catch (error) {
      logger.error('Error setting data endpoint:', error);
      throw error;
    }
  }

  /**
   * Get flow data endpoint configuration
   * @param {String} flowId - Flow ID (database)
   * @returns {Promise<Object>} Data endpoint config
   */
  async getDataEndpoint(flowId) {
    try {
      const flow = await Flow.findById(flowId).select('name settings.data_endpoint');

      if (!flow) {
        throw new Error('Flow not found');
      }

      return {
        flowId: flow._id,
        flowName: flow.name,
        dataEndpoint: flow.settings?.data_endpoint || null,
        hasDataEndpoint: !!flow.settings?.data_endpoint
      };
    } catch (error) {
      logger.error('Error getting data endpoint:', error);
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
