/**
 * Bulk Operations Routes
 * @module routes/bulk/bulkOperationsRoutes
 */

const express = require('express');
const router = express.Router();
const bulkOperationsService = require('../services/bulkOperationsService');
const { Conversation } = require('../../../core/database/models');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const { businessContext } = require('../../../core/middlewares/businessContext');

// Apply business context middleware
router.use(businessContext);

// Constants for bulk operations
const MAX_BULK_CONVERSATIONS = 100; // Maximum conversations per bulk operation
const VALID_CONVERSATION_STATUSES = ['open', 'pending', 'resolved', 'closed']; // Valid status values

// POST /archive - Bulk archive conversations
router.post('/archive', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (conversationIds.length > MAX_BULK_CONVERSATIONS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_BULK_CONVERSATIONS} conversations at once`
      });
    }

    const result = await bulkOperationsService.bulkArchive(
      conversationIds,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    logger.info('Bulk archive completed', {
      businessId: req.businessId?.toString(),
      count: conversationIds.length,
      modified: result.modified,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      ...result,
      message: `${result.modified} conversations archived`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk archive error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to archive conversations'
    });
  }
});

// POST /unarchive - Bulk unarchive conversations
router.post('/unarchive', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (conversationIds.length > MAX_BULK_CONVERSATIONS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_BULK_CONVERSATIONS} conversations at once`
      });
    }

    const result = await bulkOperationsService.bulkUnarchive(
      conversationIds,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      ...result,
      message: `${result.modified} conversations unarchived`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk unarchive error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to unarchive conversations'
    });
  }
});

// POST /assign - Bulk assign conversations to agent
router.post('/assign', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds, agentId } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (!agentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'agentId is required'
      });
    }

    if (conversationIds.length > MAX_BULK_CONVERSATIONS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_BULK_CONVERSATIONS} conversations at once`
      });
    }

    const result = await bulkOperationsService.bulkAssign(
      conversationIds,
      agentId,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      result,
      message: `${result.modified} conversations assigned`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk assign error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to assign conversations'
    });
  }
});

// POST /unassign - Bulk unassign conversations
router.post('/unassign', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (conversationIds.length > MAX_BULK_CONVERSATIONS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_BULK_CONVERSATIONS} conversations at once`
      });
    }

    const result = await bulkOperationsService.bulkUnassign(
      conversationIds,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      result,
      message: `${result.modified} conversations unassigned`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk unassign error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to unassign conversations'
    });
  }
});

// POST /status - Bulk change conversation status
router.post('/status', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds, status } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (!status) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'status is required'
      });
    }

    if (!VALID_CONVERSATION_STATUSES.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Invalid status. Must be one of: ${VALID_CONVERSATION_STATUSES.join(', ')}`
      });
    }

    if (conversationIds.length > MAX_BULK_CONVERSATIONS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_BULK_CONVERSATIONS} conversations at once`
      });
    }

    const result = await bulkOperationsService.bulkChangeStatus(
      conversationIds,
      status,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      result,
      message: `${result.modified} conversations updated to ${status}`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk status change error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update conversation status'
    });
  }
});

module.exports = router;
