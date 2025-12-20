/**
 * Bulk Tags Routes
 * @module routes/bulk/bulkTagsRoutes
 */

const express = require('express');
const router = express.Router();
const bulkOperationsService = require('../services/bulkOperationsService');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const { businessContext } = require('../../../core/middlewares/businessContext');

// Apply business context middleware
router.use(businessContext);

// Constants for bulk tag operations
const MAX_BULK_TAGS = 10; // Maximum tags per operation
const MAX_CONVERSATIONS_PER_OPERATION = 100; // Maximum conversations per bulk operation

// POST /tags/add - Bulk add tags to conversations
router.post('/tags/add', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds, tags } = req.body;
 
    // Input validation
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'tags array is required and cannot be empty'
      });
    }

    // Validate limits
    if (conversationIds.length > MAX_CONVERSATIONS_PER_OPERATION) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_CONVERSATIONS_PER_OPERATION} conversations at once`
      });
    }

    if (tags.length > MAX_BULK_TAGS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot add more than ${MAX_BULK_TAGS} tags at once`
      });
    }

    const result = await bulkOperationsService.bulkAddTags(
      conversationIds,
      tags,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    logger.info('Bulk tags added', {
      businessId: req.businessId?.toString(),
      conversationCount: conversationIds.length,
      tagCount: tags.length,
      modified: result.modified,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      message: `Tags added to ${result.modified} conversations`,
      result,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk add tags error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to add tags to conversations'
    });
  }
});

// POST /tags/remove - Bulk remove tags from conversations
router.post('/tags/remove', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationIds, tags } = req.body;

    // Input validation
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'conversationIds array is required'
      });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'tags array is required and cannot be empty'
      });
    }

    // Validate limits
    if (conversationIds.length > MAX_CONVERSATIONS_PER_OPERATION) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot process more than ${MAX_CONVERSATIONS_PER_OPERATION} conversations at once`
      });
    }

    if (tags.length > MAX_BULK_TAGS) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot remove more than ${MAX_BULK_TAGS} tags at once`
      });
    }

    const result = await bulkOperationsService.bulkRemoveTags(
      conversationIds,
      tags,
      req.businessId
    );

    const processingTime = Date.now() - startTime;

    logger.info('Bulk tags removed', {
      businessId: req.businessId?.toString(),
      conversationCount: conversationIds.length,
      tagCount: tags.length,
      modified: result.modified,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      message: `Tags removed from ${result.modified} conversations`,
      result,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bulk remove tags error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to remove tags from conversations'
    });
  }
});

module.exports = router;
