const express = require('express');
const router = express.Router();
const templateNamespaceService = require('../services/templateNamespaceService');
const { auth } = require('../../../core/middlewares/auth');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, MONGODB_PATTERNS } = require('../../../common/constants');

/**
 * Template Namespace Routes
 * Manages template namespace organization and categorization
 */

/**
 * @route   GET /api/templates/namespaces/business/:businessId
 * @desc    Get all namespaces for a business
 * @access  Private
 */
router.get('/namespaces/business/:businessId', auth, businessContext, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Validate businessId format
    if (!businessId || !MONGODB_PATTERNS.OBJECT_ID.test(businessId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid business ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Verify user has access to this business
    if (req.businessId && req.businessId !== businessId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied to this business',
        code: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }

    const namespaces = await templateNamespaceService.getBusinessNamespaces(businessId);

    res.json({
      success: true,
      message: 'Business namespaces retrieved successfully',
      data: {
        namespaces,
        count: namespaces.length
      }
    });
  } catch (error) {
    logger.error('Error getting business namespaces', {
      businessId: req.params.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.FORBIDDEN
      ? HTTP_STATUS.FORBIDDEN
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve namespaces',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/templates/namespaces/:namespace/business/:businessId
 * @desc    Get templates by namespace
 * @access  Private
 */
router.get('/namespaces/:namespace/business/:businessId', auth, businessContext, async (req, res) => {
  try {
    const { namespace, businessId } = req.params;
    const { page, limit, status } = req.query;

    // Validate businessId format
    if (!businessId || !MONGODB_PATTERNS.OBJECT_ID.test(businessId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid business ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Verify access
    if (req.businessId && req.businessId !== businessId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied to this business',
        code: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }

    const result = await templateNamespaceService.getTemplatesByNamespace(
      businessId,
      namespace,
      { page, limit, status }
    );

    res.json({
      success: true,
      message: 'Templates by namespace retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error getting templates by namespace', {
      namespace: req.params.namespace,
      businessId: req.params.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve templates',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   PUT /api/templates/:templateId/namespace
 * @desc    Set or update template namespace
 * @access  Private
 */
router.put('/:templateId/namespace', auth, businessContext, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { namespace } = req.body;
    const userId = req.user._id;
    const businessId = req.businessId;

    // Validate templateId format
    if (!templateId || !MONGODB_PATTERNS.OBJECT_ID.test(templateId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    if (!namespace) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Namespace is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const result = await templateNamespaceService.setTemplateNamespace(
      templateId,
      namespace,
      userId,
      businessId
    );

    res.json({
      success: true,
      message: 'Template namespace updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error updating template namespace', {
      templateId: req.params.templateId,
      namespace: req.body.namespace,
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
      error: error.message || 'Failed to update namespace',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   DELETE /api/templates/:templateId/namespace
 * @desc    Remove template namespace
 * @access  Private
 */
router.delete('/:templateId/namespace', auth, businessContext, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user._id;
    const businessId = req.businessId;

    // Validate templateId format
    if (!templateId || !MONGODB_PATTERNS.OBJECT_ID.test(templateId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const result = await templateNamespaceService.setTemplateNamespace(
      templateId,
      null,
      userId,
      businessId
    );

    res.json({
      success: true,
      message: 'Template namespace removed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error removing template namespace', {
      templateId: req.params.templateId,
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
      error: error.message || 'Failed to remove namespace',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   POST /api/templates/namespaces/bulk-update
 * @desc    Bulk update namespaces for multiple templates
 * @access  Private
 */
router.post('/namespaces/bulk-update', auth, businessContext, async (req, res) => {
  try {
    const { templateIds, namespace } = req.body;
    const userId = req.user._id;
    const businessId = req.businessId;

    if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'templateIds array is required and cannot be empty',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    if (!namespace) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Namespace is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const result = await templateNamespaceService.bulkSetNamespace(
      templateIds,
      namespace,
      userId,
      businessId
    );

    res.json({
      success: true,
      message: `Updated namespace for ${result.modifiedCount} templates`,
      data: result
    });
  } catch (error) {
    logger.error('Error bulk updating namespaces', {
      templateCount: req.body.templateIds?.length,
      namespace: req.body.namespace,
      userId: req.user?._id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to bulk update namespaces',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   POST /api/templates/namespaces/sync/:businessId
 * @desc    Sync namespaces from WhatsApp Business Account
 * @access  Private
 */
router.post('/namespaces/sync/:businessId', auth, businessContext, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Validate businessId format
    if (!businessId || !MONGODB_PATTERNS.OBJECT_ID.test(businessId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid business ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Verify access
    if (req.businessId && req.businessId !== businessId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied to this business',
        code: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }

    const result = await templateNamespaceService.syncNamespacesFromWhatsApp(businessId);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error syncing namespaces from WhatsApp', {
      businessId: req.params.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : error.code === ERROR_CODES.EXTERNAL_SERVICE_ERROR
      ? HTTP_STATUS.SERVICE_UNAVAILABLE
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to sync namespaces',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/templates/namespaces/stats/:businessId
 * @desc    Get namespace statistics for a business
 * @access  Private
 */
router.get('/namespaces/stats/:businessId', auth, businessContext, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Validate businessId format
    if (!businessId || !MONGODB_PATTERNS.OBJECT_ID.test(businessId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid business ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Verify access
    if (req.businessId && req.businessId !== businessId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied to this business',
        code: ERROR_CODES.BUSINESS_ACCESS_DENIED
      });
    }

    const stats = await templateNamespaceService.getNamespaceStats(businessId);

    res.json({
      success: true,
      message: 'Namespace statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Error getting namespace stats', {
      businessId: req.params.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    const statusCode = error.code === ERROR_CODES.VALIDATION_ERROR
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to retrieve statistics',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

module.exports = router;
