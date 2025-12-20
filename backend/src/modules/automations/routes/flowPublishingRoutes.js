const express = require('express');
const router = express.Router();
const flowPublishingService = require('../services/flowPublishingService');
const { auth } = require('../../../core/middlewares/auth');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, MONGODB_PATTERNS } = require('../../../common/constants');

/**
 * Flow Publishing Routes
 * Manages publishing WhatsApp Flows to Meta's Graph API
 */

/**
 * @route   POST /api/flows/:flowId/publish
 * @desc    Publish a flow to WhatsApp
 * @access  Private
 */
router.post('/:flowId/publish', auth, businessContext, async (req, res) => {
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

    logger.info('Publishing flow', { 
      flowId, 
      userId,
      businessId,
      service: 'flow-publishing'
    });

    const result = await flowPublishingService.publishFlow(flowId, userId, businessId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Publish flow error', {
      flowId: req.params.flowId,
      userId: req.user?._id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : error.code === ERROR_CODES.EXTERNAL_SERVICE_ERROR
      ? HTTP_STATUS.SERVICE_UNAVAILABLE
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to publish flow',
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      details: error.response?.data || null
    });
  }
});

/**
 * @route   POST /api/flows/:flowId/validate
 * @desc    Validate flow structure without publishing
 * @access  Private
 */
router.post('/:flowId/validate', auth, businessContext, async (req, res) => {
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

    logger.info('Validating flow', { 
      flowId, 
      userId,
      businessId,
      service: 'flow-publishing'
    });

    const result = await flowPublishingService.validateFlow(flowId, userId, businessId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Validate flow error', {
      flowId: req.params.flowId,
      userId: req.user?._id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to validate flow',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   PUT /api/flows/:flowId/unpublish
 * @desc    Deprecate a published flow
 * @access  Private
 */
router.put('/:flowId/unpublish', auth, businessContext, async (req, res) => {
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

    logger.info('Unpublishing flow', { 
      flowId, 
      userId,
      businessId,
      service: 'flow-publishing'
    });

    const result = await flowPublishingService.unpublishFlow(flowId, userId, businessId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Unpublish flow error', {
      flowId: req.params.flowId,
      userId: req.user?._id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : error.code === ERROR_CODES.EXTERNAL_SERVICE_ERROR
      ? HTTP_STATUS.SERVICE_UNAVAILABLE
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to unpublish flow',
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      details: error.response?.data || null
    });
  }
});

/**
 * @route   GET /api/flows/:flowId/preview
 * @desc    Get flow preview URL for testing
 * @access  Private
 */
router.get('/:flowId/preview', auth, businessContext, async (req, res) => {
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

    logger.info('Getting flow preview', { 
      flowId, 
      userId,
      businessId,
      service: 'flow-publishing'
    });

    const result = await flowPublishingService.getFlowPreview(flowId, userId, businessId);

    res.json({
      success: true,
      message: 'Preview URL generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get flow preview error', {
      flowId: req.params.flowId,
      userId: req.user?._id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.NOT_FOUND
      ? HTTP_STATUS.NOT_FOUND
      : error.code === ERROR_CODES.EXTERNAL_SERVICE_ERROR
      ? HTTP_STATUS.SERVICE_UNAVAILABLE
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get flow preview',
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      details: error.response?.data || null
    });
  }
});

module.exports = router;
