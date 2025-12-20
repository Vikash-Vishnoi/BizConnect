const express = require('express');
const router = express.Router();
const capabilitiesService = require('../services/capabilitiesService');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
const { ValidationError, NotFoundError } = require('../../../core/middlewares/errorHandler');

// ============================================================================
// CONSTANTS
// ============================================================================

// Messages
const MSG_CAPABILITIES_SYNCED = 'Capabilities synced successfully from WhatsApp';
const MSG_PAYMENT_ENABLED = 'Payment capability enabled successfully';
const MSG_PAYMENT_DISABLED = 'Payment capability disabled successfully';

// Error Messages
const ERROR_ENABLE_FIELD_REQUIRED = 'enable field is required and must be a boolean';

// Field Names
const FIELD_ENABLE = 'enable';

// Action Verbs
const ACTION_ENABLING = 'Enabling';
const ACTION_DISABLING = 'Disabling';

/**
 * Business Capabilities Routes
 * Manage WhatsApp Business Account capabilities
 * 
 * P0 CRITICAL FIX: Cannot manage payment and advanced features
 */

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/business/:businessId/capabilities
 * Get current capabilities
 */
router.get('/:businessId/capabilities', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;

    logger.info('Getting capabilities for business', { businessId: businessId.toString() });

    const capabilities = await capabilitiesService.getCapabilities(businessId);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { data: capabilities },
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.businessId,
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
    throw new Error('Failed to process request');
  }
});

/**
 * POST /api/business/:businessId/capabilities/sync
 * Sync capabilities from WhatsApp API
 */
router.post('/:businessId/capabilities/sync', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;

    logger.info('Syncing capabilities for business', { businessId: businessId.toString() });

    const capabilities = await capabilitiesService.syncCapabilities(businessId);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { data: capabilities },
      message: MSG_CAPABILITIES_SYNCED,
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.businessId,
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
    throw new Error('Failed to process request');
  }
});

/**
 * PUT /api/business/:businessId/capabilities/payment
 * Enable/disable payment capability
 */
router.put('/:businessId/capabilities/payment', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;
    const { enable } = req.body;

    if (typeof enable !== 'boolean') {
      throw new ValidationError(ERROR_ENABLE_FIELD_REQUIRED);
    }

    logger.info(`${enable ? ACTION_ENABLING : ACTION_DISABLING} payment for business`, { businessId: businessId.toString() });

    const capabilities = await capabilitiesService.updatePaymentCapability(businessId, enable);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { data: capabilities },
      message: enable ? MSG_PAYMENT_ENABLED : MSG_PAYMENT_DISABLED,
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.businessId,
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
    throw new Error('Failed to process request');
  }
});

/**
 * GET /api/business/:businessId/capabilities/payment/config
 * Get payment configuration (requires payment to be enabled)
 */
router.get('/:businessId/capabilities/payment/config', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;

    logger.info('Getting payment config for business', { businessId: businessId.toString() });

    const config = await capabilitiesService.getPaymentConfiguration(businessId);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { data: config },
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.businessId,
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
    throw new Error('Failed to process request');
  }
});

module.exports = router;
