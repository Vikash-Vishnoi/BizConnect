const express = require('express');
const router = express.Router();
const SavedReply = require('../../../core/database/models/SavedReply');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requirePermission, requireBusinessPermission } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for saved replies
const DEFAULT_SAVED_REPLY_CATEGORY = 'other'; // Default category
const MAX_MESSAGE_LENGTH = 4096; // Maximum message length
const MAX_POPULAR_REPLIES_LIMIT = 10; // Default limit for popular replies
const MAX_POPULAR_REPLIES_MAX = 50; // Maximum limit for popular replies

/**
 * Saved Replies Routes
 * Manage quick reply templates
 */

// Get all saved replies for the authenticated user
router.get('/', auth, requireBusiness, businessContext, requireBusinessPermission('manage', 'conversations'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { category, search, isActive = 'true' } = req.query;

    // Build filter
    const filter = {
      businessId: req.businessId,
    };
   
    if (category && category !== 'all') {
      filter.category = category;
    }

    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { shortcut: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const savedReplies = await SavedReply.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      data: savedReplies,
      count: savedReplies.length,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get saved replies error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve saved replies'
    });
  }
});

// Get a single saved reply by ID
router.get('/:id', auth, requireBusiness, businessContext, requireBusinessPermission('manage', 'conversations'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const savedReply = await SavedReply.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Saved reply not found'
      });
    }

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      data: savedReply,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get saved reply error', {
      businessId: req.businessId?.toString(),
      savedReplyId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve saved reply'
    });
  }
});

// Create a new saved reply
router.post('/', auth, requireBusiness, businessContext, requireBusinessPermission('manage', 'conversations'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { shortcut, message, category } = req.body;

    // Validation
    if (!shortcut || !shortcut.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Shortcut is required'
      });
    }

    if (!message || !message.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Message is required'
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
      });
    }

    // Check for duplicate shortcut
    const existingReply = await SavedReply.findOne({
      businessId: req.businessId,
      shortcut: shortcut.trim(),
      isActive: true,
    });

    if (existingReply) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'A saved reply with this shortcut already exists'
      });
    }

    // Create saved reply
    const savedReply = new SavedReply({
      businessId: req.businessId,
      shortcut: shortcut.trim(),
      message: message.trim(),
      category: category || DEFAULT_SAVED_REPLY_CATEGORY,
    });

    await savedReply.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.CREATED).json({
      message: 'Saved reply created successfully',
      data: savedReply,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Create saved reply error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create saved reply'
    });
  }
});

// Update a saved reply
router.put('/:id', auth, requireBusiness, businessContext, requireBusinessPermission('manage', 'conversations'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { shortcut, message, category, isActive } = req.body;

    const savedReply = await SavedReply.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Saved reply not found'
      });
    }

    // Validation
    if (message && message.length > MAX_MESSAGE_LENGTH) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
      });
    }

    // Check for duplicate shortcut (if changing shortcut)
    if (shortcut && shortcut.trim() !== savedReply.shortcut) {
      const existingReply = await SavedReply.findOne({
        businessId: req.businessId,
        shortcut: shortcut.trim(),
        isActive: true,
        _id: { $ne: req.params.id },
      });

      if (existingReply) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'A saved reply with this shortcut already exists'
        });
      }
    }

    // Update fields
    if (shortcut !== undefined) savedReply.shortcut = shortcut.trim();
    if (message !== undefined) savedReply.message = message.trim();
    if (category !== undefined) savedReply.category = category;
    if (isActive !== undefined) savedReply.isActive = isActive;

    await savedReply.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      message: 'Saved reply updated successfully',
      data: savedReply,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Update saved reply error', {
      businessId: req.businessId?.toString(),
      savedReplyId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update saved reply'
    });
  }
});

// Increment usage count for a saved reply
router.post('/:id/use', auth, requireBusiness, businessContext, requireBusinessPermission('manage', 'conversations'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const savedReply = await SavedReply.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Saved reply not found'
      });
    }

    await savedReply.incrementUsage();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      message: 'Usage count incremented',
      data: savedReply,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Increment saved reply usage error', {
      businessId: req.businessId?.toString(),
      savedReplyId: req.params.id,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to increment usage count'
    });
  }
});

// Get popular saved replies (most used)
router.get('/stats/popular', auth, requireBusiness, businessContext, requireBusinessPermission('manage', 'conversations'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const requestedLimit = parseInt(req.query.limit) || MAX_POPULAR_REPLIES_LIMIT;
    const limit = Math.min(requestedLimit, MAX_POPULAR_REPLIES_MAX);

    const popularReplies = await SavedReply.find({
      businessId: req.businessId,
      isActive: true,
      usageCount: { $gt: 0 },
    })
      .sort({ usageCount: -1 })
      .limit(limit)
      .lean();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      data: popularReplies,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get popular saved replies error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to retrieve popular saved replies'
    });
  }
});

module.exports = router;
