const express = require('express');
const router = express.Router();
const flowPublishingService = require('../services/flowPublishingService');
const { auth } = require('../../../core/middlewares/auth');
const logger = require('../../../common/helpers/logger');

/**
 * Flow Publishing Routes
 * Manages publishing WhatsApp Flows to Meta's Graph API
 * 
 * P0 CRITICAL FIX: Flows cannot be used without publishing
 */

/**
 * POST /api/flows/:flowId/publish
 * Publish a flow to WhatsApp
 */
router.post('/:flowId/publish', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const userId = req.user._id;

    logger.info(`Publishing flow: ${flowId}`, { userId });

    const result = await flowPublishingService.publishFlow(flowId, userId);

    res.json({
      success: true,
      data: result,
      message: result.message
    });

  } catch (error) {
    logger.error('Publish flow error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message,
      error: error.response?.data || error.message
    });
  }
});

/**
 * POST /api/flows/:flowId/validate
 * Validate flow structure without publishing
 */
router.post('/:flowId/validate', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const userId = req.user._id;

    logger.info(`Validating flow: ${flowId}`, { userId });

    const result = await flowPublishingService.validateFlow(flowId, userId);

    res.json({
      success: true,
      data: result,
      message: result.message
    });

  } catch (error) {
    logger.error('Validate flow error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/flows/:flowId/unpublish
 * Deprecate a published flow
 */
router.put('/:flowId/unpublish', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const userId = req.user._id;

    logger.info(`Unpublishing flow: ${flowId}`, { userId });

    const result = await flowPublishingService.unpublishFlow(flowId, userId);

    res.json({
      success: true,
      data: result,
      message: result.message
    });

  } catch (error) {
    logger.error('Unpublish flow error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/flows/:flowId/preview
 * Get flow preview URL for testing
 */
router.get('/:flowId/preview', auth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const userId = req.user._id;

    logger.info(`Getting flow preview: ${flowId}`, { userId });

    const result = await flowPublishingService.getFlowPreview(flowId, userId);

    res.json({
      success: true,
      data: result,
      message: 'Preview URL generated successfully'
    });

  } catch (error) {
    logger.error('Get flow preview error', {
      flowId: req.params.flowId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
