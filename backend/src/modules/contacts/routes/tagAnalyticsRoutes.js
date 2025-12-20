/**
 * Tag Analytics Routes - Suggestions, analytics, validation
 * @module routes/tags/tagAnalyticsRoutes
 */

const express = require('express');
const router = express.Router();
const { Conversation } = require('../../../core/database/models');
const { ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// ============================================================================
// CONSTANTS
// ============================================================================

const LIMITS = {
  TAG_SUGGESTIONS_DEFAULT: 10,
  TAG_NAME_MAX_LENGTH_DEFAULT: 50
};

const ERROR_MESSAGES = {
  TAG_NAME_REQUIRED: 'Tag name is required',
  FAILED_TO_GET_SUGGESTIONS: 'Failed to get tag suggestions',
  FAILED_TO_GET_ANALYTICS: 'Failed to get tag analytics',
  FAILED_TO_VALIDATE_TAG: 'Failed to validate tag'
};

const SUCCESS_MESSAGES = {
  VALID_TAG_NAME: 'Valid tag name',
  INVALID_TAG_NAME_FORMAT: 'Invalid tag name format'
};

const SORT_ORDER = {
  DESCENDING: -1
};

const FIELDS = {
  TAGS: 'tags',
  BUSINESS_ID: 'businessId',
  LAST_MESSAGE_AT: 'lastMessageAt'
};

const REGEX_PATTERNS = {
  TAG_NAME_DEFAULT: '^[a-zA-Z0-9_-]{1,50}$'
};

const AGGREGATE_OPERATORS = {
  SUM: 1
};

// ============================================================================
// ROUTES
// ============================================================================

// Apply business context middleware to all routes
router.use(businessContext);

// GET /suggestions - Get tag suggestions
router.get('/suggestions', async (req, res) => {
  const startTime = Date.now();
  try {
    const suggestionsLimit = parseInt(process.env.TAG_SUGGESTIONS_LIMIT || LIMITS.TAG_SUGGESTIONS_DEFAULT.toString());
    const tagCounts = await Conversation.aggregate([
      { $match: { businessId: req.businessId } },
      { $unwind: `$${FIELDS.TAGS}` },
      { $group: { _id: `$${FIELDS.TAGS}`, count: { $sum: AGGREGATE_OPERATORS.SUM } } },
      { $sort: { count: SORT_ORDER.DESCENDING } },
      { $limit: suggestionsLimit }
    ]);

    const suggestions = tagCounts.map(t => ({ tag: t._id, count: t.count }));
    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { suggestions },
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

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_GET_SUGGESTIONS);
  }
});

// GET /analytics - Get tag analytics
router.get('/analytics', async (req, res) => {
  const startTime = Date.now();
  try {
    const tagStats = await Conversation.aggregate([
      { $match: { businessId: req.businessId } },
      { $unwind: `$${FIELDS.TAGS}` },
      {
        $group: {
          _id: `$${FIELDS.TAGS}`,
          count: { $sum: AGGREGATE_OPERATORS.SUM },
          lastUsed: { $max: `$${FIELDS.LAST_MESSAGE_AT}` }
        }
      },
      { $sort: { count: SORT_ORDER.DESCENDING } }
    ]);

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: tagStats.length,
        analytics: tagStats.map(s => ({
          tag: s._id,
          conversationCount: s.count,
          lastUsed: s.lastUsed
        }))
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

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_GET_ANALYTICS);
  }
});

// POST /validate - Validate tag name
router.post('/validate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { tagName } = req.body;

    if (!tagName) {
      throw new ValidationError(ERROR_MESSAGES.TAG_NAME_REQUIRED);
    }

    const maxTagLength = parseInt(process.env.TAG_NAME_MAX_LENGTH || LIMITS.TAG_NAME_MAX_LENGTH_DEFAULT.toString());
    const tagPattern = new RegExp(process.env.TAG_NAME_PATTERN || REGEX_PATTERNS.TAG_NAME_DEFAULT);
    const isValid = tagPattern.test(tagName) && tagName.length <= maxTagLength;
    const exists = await Conversation.exists({
      businessId: req.businessId,
      tags: tagName
    });

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        valid: isValid,
        exists: !!exists,
        message: isValid ? SUCCESS_MESSAGES.VALID_TAG_NAME : SUCCESS_MESSAGES.INVALID_TAG_NAME_FORMAT
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

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_VALIDATE_TAG);
  }
});

module.exports = router;
