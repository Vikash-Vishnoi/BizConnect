const express = require('express');
const router = express.Router();
const flowDataService = require('../services/flowDataService');
const { auth } = require('../../../core/middlewares/auth');
const logger = require('../../../common/helpers/logger');

/**
 * @route   POST /api/flows/data-endpoint
 * @desc    Handle dynamic data request from WhatsApp Flow
 * @access  Public (called by WhatsApp - verify signature in production)
 */
router.post('/data-endpoint', async (req, res) => {
  try {
    const { flow_id, screen, data, flow_token, version } = req.body;

    // In production, verify WhatsApp signature here

    logger.info('Flow data endpoint called', {
      flow_id,
      screen,
      flow_token
    });

    const response = await flowDataService.handleFlowDataRequest(flow_id, {
      screen,
      data,
      flow_token,
      version
    });

    res.json(response);
  } catch (error) {
    logger.error('Error in flow data endpoint:', error);
    res.status(500).json({
      version: '3.0',
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
router.get('/:flowId/data-endpoint', auth, async (req, res) => {
  try {
    const { flowId } = req.params;

    const config = await flowDataService.getDataEndpoint(flowId);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting data endpoint:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to retrieve data endpoint configuration'
    });
  }
});

/**
 * @route   PUT /api/flows/:flowId/data-endpoint
 * @desc    Set or update flow data endpoint URL
 * @access  Private
 */
router.put('/:flowId/data-endpoint', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { endpointUrl } = req.body;
    const userId = req.user._id;

    if (!endpointUrl) {
      return res.status(400).json({
        success: false,
        error: 'endpointUrl is required'
      });
    }

    const result = await flowDataService.setDataEndpoint(flowId, endpointUrl, userId);

    res.json({
      success: true,
      data: result,
      message: 'Data endpoint updated successfully'
    });
  } catch (error) {
    logger.error('Error setting data endpoint:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error.message || 'Failed to update data endpoint'
    });
  }
});

/**
 * @route   DELETE /api/flows/:flowId/data-endpoint
 * @desc    Remove flow data endpoint
 * @access  Private
 */
router.delete('/:flowId/data-endpoint', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const userId = req.user._id;

    const result = await flowDataService.setDataEndpoint(flowId, null, userId);

    res.json({
      success: true,
      data: result,
      message: 'Data endpoint removed successfully'
    });
  } catch (error) {
    logger.error('Error removing data endpoint:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to remove data endpoint'
    });
  }
});

/**
 * @route   POST /api/flows/:flowId/data-endpoint/test
 * @desc    Test flow data endpoint
 * @access  Private
 */
router.post('/:flowId/data-endpoint/test', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const { screen, data, flow_token } = req.body;

    const testPayload = {
      screen: screen || 'SCREEN_1',
      data: data || {},
      flow_token: flow_token || 'test_token'
    };

    const result = await flowDataService.testDataEndpoint(flowId, testPayload);

    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Error testing data endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test data endpoint'
    });
  }
});

module.exports = router;
