const express = require('express');
const router = express.Router();
const retryService = require('../services/retryService');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for message retry operations
const DEFAULT_FAILED_MESSAGES_LIMIT = 50; // Default limit for failed messages
const MAX_FAILED_MESSAGES_LIMIT = 200; // Maximum limit for failed messages
const DEFAULT_MAX_RETRIES = 3; // Default maximum retry attempts
const MAX_AUTO_RETRY_ATTEMPTS = 5; // Maximum auto-retry attempts
const DEFAULT_SKIP = 0; // Default skip for pagination

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
router.get('/failed', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit, skip, startDate, endDate } = req.query;

    const finalLimit = limit ? Math.min(parseInt(limit), MAX_FAILED_MESSAGES_LIMIT) : DEFAULT_FAILED_MESSAGES_LIMIT;
    const finalSkip = skip ? parseInt(skip) : DEFAULT_SKIP;

    const messages = await retryService.getFailedMessages(req.businessId, {
      limit: finalLimit,
      skip: finalSkip,
      startDate,
      endDate
    });

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      messages,
      count: messages.length,
      pagination: {
        limit: finalLimit,
        skip: finalSkip
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get failed messages error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve failed messages'
    });
  }
});

/**
 * POST /api/messages/:conversationId/retry/:messageId
 * Retry a single failed message
 */
router.post('/:conversationId/retry/:messageId', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId, messageId } = req.params;

    if (!conversationId || !messageId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationId and messageId are required'
      });
    }

    const result = await retryService.retryMessage(conversationId, messageId);

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...result,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Retry message error', {
      businessId: req.businessId?.toString(),
      conversationId: req.params.conversationId,
      messageId: req.params.messageId,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retry message'
    });
  }
});

/**
 * POST /api/messages/retry-bulk
 * Retry multiple messages in bulk
 */
router.post('/retry-bulk', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'messages array is required'
      });
    }

    const results = await retryService.retryBulk(req.businessId, messages);

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...results,
      message: `Retry completed: ${results.succeeded} succeeded, ${results.failed} failed`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Retry bulk messages error', {
      businessId: req.businessId?.toString(),
      messageCount: req.body.messages?.length,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retry bulk messages'
    });
  }
});

/**
 * POST /api/messages/auto-retry
 * Auto-retry failed messages with exponential backoff
 */
router.post('/auto-retry', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { maxRetries } = req.body;

    const finalMaxRetries = maxRetries ? Math.min(parseInt(maxRetries), MAX_AUTO_RETRY_ATTEMPTS) : DEFAULT_MAX_RETRIES;

    const results = await retryService.autoRetryFailed(req.businessId, finalMaxRetries);

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...results,
      message: `Auto-retry completed: ${results.succeeded} succeeded, ${results.failed} failed, ${results.skipped} skipped`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Auto-retry messages error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to auto-retry messages'
    });
  }
});

module.exports = router;
