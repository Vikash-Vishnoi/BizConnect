const express = require('express');
const router = express.Router();
const flowDataService = require('../services/flowDataService');
const { auth } = require('../../../core/middlewares/auth');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, MONGODB_PATTERNS } = require('../../../common/constants');
const { validateUrl } = require('../../../common/helpers/validationHelpers');

/**
 * @route   POST /api/flows/data-endpoint
 * @desc    Handle dynamic data request from WhatsApp Flow
 * @access  Public (called by WhatsApp - verify signature in production)
 * @note    This endpoint is called directly by WhatsApp, not by authenticated users
 */
router.post('/data-endpoint', async (req, res) => {
  try {
    const { flow_id, screen, data, flow_token, version } = req.body;

    // Validate required fields
    if (!flow_id) {
      logger.warn('Flow data endpoint called without flow_id');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        version: version || '3.0',
        screen: screen || 'ERROR',
        data: {},
        error_messages: ['flow_id is required']
      });
    }

    // TODO: In production, verify WhatsApp signature here
    // const signature = req.headers['x-hub-signature-256'];
    // if (!verifyWhatsAppSignature(req.body, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    logger.info('Flow data endpoint called', {
      flow_id,
      screen,
      flow_token,
      version,
      service: 'flow-data',
      source: 'whatsapp'
    });

    const response = await flowDataService.handleFlowDataRequest(flow_id, {
      screen,
      data,
      flow_token,
      version
    });

    res.json(response);
  } catch (error) {
    logger.error('Error in flow data endpoint', { 
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      version: req.body.version || '3.0',
      screen: req.body.screen || 'ERROR',
      data: {},
      error_messages: ['Internal server error']
    });
  }
});

/**
 * @route   GET /api/flows/:flowId/data-endpoint
 * @desc    Get flow data endpoint configuration
 * @access  Private
 */
router.get('/:flowId/data-endpoint', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const config = await flowDataService.getDataEndpoint(flowId, businessId);

    res.json({
      success: true,
      message: 'Data endpoint configuration retrieved successfully',
      data: config
    });
  } catch (error) {
    logger.error('Error getting data endpoint', { 
      error: error.message,
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id
    });
    
    const statusCode = error.code === ERROR_CODES.NOT_FOUND 
      ? HTTP_STATUS.NOT_FOUND 
      : HTTP_STATUS.INTERNAL_ERROR;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve data endpoint configuration',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   PUT /api/flows/:flowId/data-endpoint
 * @desc    Set or update flow data endpoint URL
 * @access  Private
 */
router.put('/:flowId/data-endpoint', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { endpointUrl } = req.body;
    const userId = req.user._id;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Validate endpointUrl
    if (!endpointUrl) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'endpointUrl is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    if (typeof endpointUrl !== 'string' || !validateUrl(endpointUrl)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid URL format. Must be a valid HTTP/HTTPS URL.',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const result = await flowDataService.setDataEndpoint(flowId, endpointUrl, userId, businessId);

    res.json({
      success: true,
      message: 'Data endpoint updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error setting data endpoint', { 
      error: error.message,
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id
    });
    
    const statusCode = error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.INTERNAL_ERROR;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update data endpoint',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   DELETE /api/flows/:flowId/data-endpoint
 * @desc    Remove flow data endpoint
 * @access  Private
 */
router.delete('/:flowId/data-endpoint', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const userId = req.user._id;
    const businessId = req.businessId;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const result = await flowDataService.setDataEndpoint(flowId, null, userId, businessId);

    res.json({
      success: true,
      message: 'Data endpoint removed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error removing data endpoint', { 
      error: error.message,
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id
    });
    
    const statusCode = error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.INTERNAL_ERROR;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to remove data endpoint',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   POST /api/flows/:flowId/data-endpoint/test
 * @desc    Test flow data endpoint
 * @access  Private
 */
router.post('/:flowId/data-endpoint/test', auth, businessContext, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { screen, data, flow_token } = req.body;

    // Validate flowId format
    if (!flowId || !MONGODB_PATTERNS.OBJECT_ID.test(flowId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid flow ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const testPayload = {
      screen: screen || 'SCREEN_1',
      data: data || {},
      flow_token: flow_token || 'test_token'
    };

    logger.info('Testing flow data endpoint', {
      flowId,
      businessId: req.businessId,
      userId: req.user._id,
      testPayload
    });

    const result = await flowDataService.testDataEndpoint(flowId, testPayload);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error testing data endpoint', { 
      error: error.message,
      flowId: req.params.flowId,
      businessId: req.businessId,
      userId: req.user?._id
    });
    
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to test data endpoint',
      code: ERROR_CODES.INTERNAL_ERROR
    });
  }
});

module.exports = router;
