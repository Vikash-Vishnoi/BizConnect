/**
 * Tag Management Routes - Add, remove, rename, merge tags
 * @module routes/tags/tagManagementRoutes
 */

const express = require('express');
const router = express.Router();
const { Conversation } = require('../../../core/database/models');
const { NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// ============================================================================
// CONSTANTS
// ============================================================================

const ERROR_MESSAGES = {
  TAGS_ARRAY_REQUIRED: 'Tags array is required',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  NEW_TAG_NAME_REQUIRED: 'New tag name is required',
  SOURCE_TAGS_AND_TARGET_REQUIRED: 'Source tags array and target tag are required',
  FAILED_TO_GET_TAGS: 'Failed to get tags',
  FAILED_TO_GET_CONVERSATIONS: 'Failed to get conversations by tag',
  FAILED_TO_ADD_TAGS: 'Failed to add tags to conversation',
  FAILED_TO_REMOVE_TAGS: 'Failed to remove tags from conversation',
  FAILED_TO_RENAME_TAG: 'Failed to rename tag',
  FAILED_TO_MERGE_TAGS: 'Failed to merge tags'
};

const SUCCESS_MESSAGES = {
  TAGS_REMOVED: 'Tags removed successfully'
};

const SORT_ORDER = {
  DESCENDING: -1
};

const FIELDS = {
  TAGS: 'tags',
  BUSINESS_ID: 'businessId',
  LAST_MESSAGE_AT: 'lastMessageAt'
};

// ============================================================================
// ROUTES
// ============================================================================

// Apply business context middleware to all routes
router.use(businessContext);

// GET / - Get all tags
router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const tags = await Conversation.distinct(FIELDS.TAGS, { businessId: req.businessId });
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: tags.length,
        tags
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_GET_TAGS);
  }
});

// GET /:tagName/conversations - Get conversations by tag
router.get('/:tagName/conversations', async (req, res) => {
  const startTime = Date.now();
  try {
    const conversations = await Conversation.find({
      businessId: req.businessId,
      tags: req.params.tagName
    }).sort({ lastMessageAt: SORT_ORDER.DESCENDING });
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: conversations.length,
        conversations
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_GET_CONVERSATIONS);
  }
});

// POST /conversation/:conversationId/add - Add tag to conversation
router.post('/conversation/:conversationId/add', async (req, res) => {
  const startTime = Date.now();
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      throw new ValidationError(ERROR_MESSAGES.TAGS_ARRAY_REQUIRED);
    }

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      businessId: req.businessId
    });

    if (!conversation) {
      throw new NotFoundError(ERROR_MESSAGES.CONVERSATION_NOT_FOUND);
    }

    if (!conversation.tags) conversation.tags = [];
    
    const newTags = tags.filter(tag => !conversation.tags.includes(tag));
    conversation.tags.push(...newTags);

    await conversation.save();
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        tags: conversation.tags
      },
      message: `${newTags.length} tags added`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_ADD_TAGS);
  }
});

// POST /conversation/:conversationId/remove - Remove tag from conversation
router.post('/conversation/:conversationId/remove', async (req, res) => {
  const startTime = Date.now();
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      throw new ValidationError(ERROR_MESSAGES.TAGS_ARRAY_REQUIRED);
    }

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      businessId: req.businessId
    });

    if (!conversation) {
      throw new NotFoundError(ERROR_MESSAGES.CONVERSATION_NOT_FOUND);
    }

    conversation.tags = conversation.tags.filter(tag => !tags.includes(tag));

    await conversation.save();
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        tags: conversation.tags
      },
      message: SUCCESS_MESSAGES.TAGS_REMOVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_REMOVE_TAGS);
  }
});

// PUT /:oldTagName/rename - Rename tag
router.put('/:oldTagName/rename', async (req, res) => {
  const startTime = Date.now();
  try {
    const { newTagName } = req.body;

    if (!newTagName) {
      throw new ValidationError(ERROR_MESSAGES.NEW_TAG_NAME_REQUIRED);
    }

    const result = await Conversation.updateMany(
      {
        businessId: req.businessId,
        tags: req.params.oldTagName
      },
      {
        $set: { 'tags.$': newTagName }
      }
    );
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        modified: result.modifiedCount
      },
      message: `Tag renamed in ${result.modifiedCount} conversations`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_RENAME_TAG);
  }
});

// POST /merge - Merge tags
router.post('/merge', async (req, res) => {
  const startTime = Date.now();
  try {
    const { sourceTags, targetTag } = req.body;

    if (!sourceTags || !Array.isArray(sourceTags) || !targetTag) {
      throw new ValidationError(ERROR_MESSAGES.SOURCE_TAGS_AND_TARGET_REQUIRED);
    }

    const conversations = await Conversation.find({
      businessId: req.businessId,
      tags: { $in: sourceTags }
    });

    let modifiedCount = 0;
    for (const conversation of conversations) {
      conversation.tags = conversation.tags.filter(tag => !sourceTags.includes(tag));
      if (!conversation.tags.includes(targetTag)) {
        conversation.tags.push(targetTag);
      }
      await conversation.save();
      modifiedCount++;
    }
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        modified: modifiedCount
      },
      message: `${sourceTags.length} tags merged into '${targetTag}' in ${modifiedCount} conversations`,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_MERGE_TAGS);
  }
});

module.exports = router;
