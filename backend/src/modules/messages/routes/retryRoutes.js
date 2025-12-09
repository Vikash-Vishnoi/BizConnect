const express = require('express');
const router = express.Router();
const retryService = require('../services/retryService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * Message Retry Routes
 * Retry failed messages with tracking
 * 
 * P1 FIX: Add retry for all messages (not just campaigns)
 */

/**
 * GET /api/messages/failed
 * Get list of failed messages
 */
router.get('/failed', auth, async (req, res) => {
  try {
    const { businessId, limit, skip, startDate, endDate } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'businessId is required'
      });
    }

    // Verify business access
    if (req.user.role !== 'admin' && req.user.businessId.toString() !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const messages = await retryService.getFailedMessages(businessId, {
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });

  } catch (error) {
    logger.error('Get failed messages error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/messages/:conversationId/retry/:messageId
 * Retry a single failed message
 */
router.post('/:conversationId/retry/:messageId', auth, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const result = await retryService.retryMessage(conversationId, messageId);

    res.json({
      success: true,
      data: result,
      message: 'Message retried successfully'
    });

  } catch (error) {
    logger.error('Retry message error', {
      conversationId: req.params.conversationId,
      messageId: req.params.messageId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : error.message.includes('not in failed state') ? 400 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/messages/retry-bulk
 * Retry multiple messages in bulk
 */
router.post('/retry-bulk', auth, async (req, res) => {
  try {
    const { businessId, messages } = req.body;

    if (!businessId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'businessId and messages array are required'
      });
    }

    // Verify business access
    if (req.user.role !== 'admin' && req.user.businessId.toString() !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const results = await retryService.retryBulk(businessId, messages);

    res.json({
      success: true,
      data: results,
      message: `Retry completed: ${results.succeeded} succeeded, ${results.failed} failed`
    });

  } catch (error) {
    logger.error('Bulk retry error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/messages/auto-retry
 * Auto-retry failed messages with exponential backoff
 */
router.post('/auto-retry', auth, async (req, res) => {
  try {
    const { businessId, maxRetries } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'businessId is required'
      });
    }

    // Verify business access
    if (req.user.role !== 'admin' && req.user.businessId.toString() !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const results = await retryService.autoRetryFailed(businessId, maxRetries || 3);

    res.json({
      success: true,
      data: results,
      message: `Auto-retry completed: ${results.succeeded} succeeded, ${results.failed} failed, ${results.skipped} skipped`
    });

  } catch (error) {
    logger.error('Auto-retry error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
