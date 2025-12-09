const express = require('express');
const router = express.Router();
const templateNamespaceService = require('../services/templateNamespaceService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * @route   GET /api/templates/namespaces/business/:businessId
 * @desc    Get all namespaces for a business
 * @access  Private
 */
router.get('/namespaces/business/:businessId', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;

    const namespaces = await templateNamespaceService.getBusinessNamespaces(businessId);

    res.json({
      success: true,
      data: {
        namespaces,
        count: namespaces.length
      }
    });
  } catch (error) {
    logger.error('Error fetching business namespaces:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve namespaces'
    });
  }
});

/**
 * @route   GET /api/templates/namespaces/:namespace/business/:businessId
 * @desc    Get templates by namespace
 * @access  Private
 */
router.get('/namespaces/:namespace/business/:businessId', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { namespace, businessId } = req.params;
    const { page, limit, status } = req.query;

    const result = await templateNamespaceService.getTemplatesByNamespace(
      businessId,
      namespace,
      { page, limit, status }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching templates by namespace:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve templates'
    });
  }
});

/**
 * @route   PUT /api/templates/:templateId/namespace
 * @desc    Set or update template namespace
 * @access  Private
 */
router.put('/:templateId/namespace', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { namespace } = req.body;
    const userId = req.user._id;

    if (!namespace) {
      return res.status(400).json({
        success: false,
        error: 'Namespace is required'
      });
    }

    const result = await templateNamespaceService.setTemplateNamespace(
      templateId,
      namespace,
      userId
    );

    res.json({
      success: true,
      data: result,
      message: 'Template namespace updated successfully'
    });
  } catch (error) {
    logger.error('Error setting template namespace:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error.message || 'Failed to update namespace'
    });
  }
});

/**
 * @route   DELETE /api/templates/:templateId/namespace
 * @desc    Remove template namespace
 * @access  Private
 */
router.delete('/:templateId/namespace', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user._id;

    const result = await templateNamespaceService.setTemplateNamespace(
      templateId,
      null,
      userId
    );

    res.json({
      success: true,
      data: result,
      message: 'Template namespace removed successfully'
    });
  } catch (error) {
    logger.error('Error removing template namespace:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to remove namespace'
    });
  }
});

/**
 * @route   POST /api/templates/namespaces/bulk-update
 * @desc    Bulk update namespaces for multiple templates
 * @access  Private
 */
router.post('/namespaces/bulk-update', auth, async (req, res) => {
  try {
    const { templateIds, namespace } = req.body;
    const userId = req.user._id;

    if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'templateIds array is required'
      });
    }

    if (!namespace) {
      return res.status(400).json({
        success: false,
        error: 'Namespace is required'
      });
    }

    const result = await templateNamespaceService.bulkSetNamespace(
      templateIds,
      namespace,
      userId
    );

    res.json({
      success: true,
      data: result,
      message: `Updated namespace for ${result.modifiedCount} templates`
    });
  } catch (error) {
    logger.error('Error bulk updating namespaces:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to bulk update namespaces'
    });
  }
});

/**
 * @route   POST /api/templates/namespaces/sync/:businessId
 * @desc    Sync namespaces from WhatsApp Business Account
 * @access  Private
 */
router.post('/namespaces/sync/:businessId', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await templateNamespaceService.syncNamespacesFromWhatsApp(businessId);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Error syncing namespaces from WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync namespaces'
    });
  }
});

/**
 * @route   GET /api/templates/namespaces/stats/:businessId
 * @desc    Get namespace statistics for a business
 * @access  Private
 */
router.get('/namespaces/stats/:businessId', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;

    const stats = await templateNamespaceService.getNamespaceStats(businessId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching namespace stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve namespace statistics'
    });
  }
});

module.exports = router;
