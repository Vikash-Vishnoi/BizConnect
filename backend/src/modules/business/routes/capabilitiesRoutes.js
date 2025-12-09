const express = require('express');
const router = express.Router();
const capabilitiesService = require('../services/capabilitiesService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * Business Capabilities Routes
 * Manage WhatsApp Business Account capabilities
 * 
 * P0 CRITICAL FIX: Cannot manage payment and advanced features
 */

/**
 * GET /api/business/:businessId/capabilities
 * Get current capabilities
 */
router.get('/:businessId/capabilities', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;

    logger.info(`Getting capabilities for business: ${businessId}`);

    const capabilities = await capabilitiesService.getCapabilities(businessId);

    res.json({
      success: true,
      data: capabilities
    });

  } catch (error) {
    logger.error('Get capabilities error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/business/:businessId/capabilities/sync
 * Sync capabilities from WhatsApp API
 */
router.post('/:businessId/capabilities/sync', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;

    logger.info(`Syncing capabilities for business: ${businessId}`);

    const capabilities = await capabilitiesService.syncCapabilities(businessId);

    res.json({
      success: true,
      data: capabilities,
      message: 'Capabilities synced successfully from WhatsApp'
    });

  } catch (error) {
    logger.error('Sync capabilities error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
      error: error.response?.data || error.message
    });
  }
});

/**
 * PUT /api/business/:businessId/capabilities/payment
 * Enable/disable payment capability
 */
router.put('/:businessId/capabilities/payment', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { enable } = req.body;

    if (typeof enable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enable field is required and must be a boolean'
      });
    }

    logger.info(`${enable ? 'Enabling' : 'Disabling'} payment for business: ${businessId}`);

    const capabilities = await capabilitiesService.updatePaymentCapability(businessId, enable);

    res.json({
      success: true,
      data: capabilities,
      message: `Payment capability ${enable ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    logger.error('Update payment capability error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/business/:businessId/capabilities/payment/config
 * Get payment configuration (requires payment to be enabled)
 */
router.get('/:businessId/capabilities/payment/config', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;

    logger.info(`Getting payment config for business: ${businessId}`);

    const config = await capabilitiesService.getPaymentConfiguration(businessId);

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Get payment config error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : error.message.includes('not enabled') ? 403 : 500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
