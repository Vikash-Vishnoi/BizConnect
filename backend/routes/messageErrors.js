const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const MessageError = require('../models/MessageError');

// @route   GET /api/message-errors
// @desc    Get all message errors with filters
// @access  Private
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      category,
      status,
      recipientPhone,
      conversationId,
      startDate,
      endDate,
      canRetry
    } = req.query;

    let query = { businessId: req.businessId };

    if (category) {
      query.errorCategory = category;
    }

    if (status) {
      query['resolution.status'] = status;
    }

    if (recipientPhone) {
      query.recipientPhone = recipientPhone;
    }

    if (conversationId) {
      query.conversationId = conversationId;
    }

    if (canRetry !== undefined) {
      query['retryInfo.canRetry'] = canRetry === 'true';
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [errors, total] = await Promise.all([
      MessageError.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      MessageError.countDocuments(query)
    ]);

    // Format for display
    const formattedErrors = errors.map(item => {
      const instance = new MessageError(item);
      return instance.getDisplayInfo();
    });

    res.json({
      errors: formattedErrors,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + errors.length < total
      }
    });
  } catch (error) {
    console.error('Get message errors error:', error);
    res.status(500).json({ error: 'Failed to fetch message errors' });
  }
});

// @route   GET /api/message-errors/stats
// @desc    Get error statistics
// @access  Private
router.get('/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await MessageError.getErrorStats(req.businessId, parseInt(days));

    res.json(stats);
  } catch (error) {
    console.error('Get error stats error:', error);
    res.status(500).json({ error: 'Failed to fetch error statistics' });
  }
});

// @route   GET /api/message-errors/:id
// @desc    Get specific error details
// @access  Private
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const error = await MessageError.findOne({
      _id: req.params.id,
      businessId: req.businessId
    }).lean();

    if (!error) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json(error);
  } catch (error) {
    console.error('Get error details error:', error);
    res.status(500).json({ error: 'Failed to fetch error details' });
  }
});

// @route   POST /api/message-errors/:id/retry
// @desc    Retry a failed message
// @access  Private
router.post('/:id/retry', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const error = await MessageError.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!error) {
      return res.status(404).json({ error: 'Error not found' });
    }

    if (!error.retryInfo.canRetry) {
      return res.status(400).json({ error: 'This error cannot be retried' });
    }

    if (error.retryInfo.retryCount >= error.retryInfo.maxRetries) {
      return res.status(400).json({ error: 'Maximum retry attempts reached' });
    }

    // Record retry attempt
    await error.recordRetry();

    // TODO: Implement actual message retry logic here
    // This would involve calling whatsappService to resend the message

    res.json({
      message: 'Retry recorded',
      retryCount: error.retryInfo.retryCount,
      maxRetries: error.retryInfo.maxRetries,
      nextRetryAt: error.retryInfo.nextRetryAt,
      status: error.resolution.status
    });
  } catch (error) {
    console.error('Retry error:', error);
    res.status(500).json({ error: 'Failed to retry message' });
  }
});

// @route   POST /api/message-errors/:id/resolve
// @desc    Mark error as resolved
// @access  Private
router.post('/:id/resolve', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { notes, action } = req.body;

    const error = await MessageError.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!error) {
      return res.status(404).json({ error: 'Error not found' });
    }

    await error.markResolved(req.userId, notes, action);

    res.json({
      message: 'Error marked as resolved',
      error: error.getDisplayInfo()
    });
  } catch (error) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// @route   POST /api/message-errors/:id/ignore
// @desc    Mark error as ignored
// @access  Private
router.post('/:id/ignore', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const error = await MessageError.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!error) {
      return res.status(404).json({ error: 'Error not found' });
    }

    error.resolution.status = 'IGNORED';
    error.metadata.processed = true;
    await error.save();

    res.json({
      message: 'Error marked as ignored',
      error: error.getDisplayInfo()
    });
  } catch (error) {
    console.error('Ignore error:', error);
    res.status(500).json({ error: 'Failed to ignore error' });
  }
});

// @route   POST /api/message-errors/bulk-resolve
// @desc    Resolve multiple errors
// @access  Private
router.post('/bulk-resolve', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { ids, notes, action } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const errors = await MessageError.find({
      _id: { $in: ids },
      businessId: req.businessId
    });

    for (const error of errors) {
      await error.markResolved(req.userId, notes, action);
    }

    res.json({
      message: `${errors.length} errors marked as resolved`,
      count: errors.length
    });
  } catch (error) {
    console.error('Bulk resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve errors' });
  }
});

// @route   GET /api/message-errors/pending/count
// @desc    Get count of pending errors
// @access  Private
router.get('/pending/count', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const count = await MessageError.countDocuments({
      businessId: req.businessId,
      'resolution.status': 'PENDING'
    });

    res.json({ count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ error: 'Failed to get pending count' });
  }
});

// @route   GET /api/message-errors/retryable
// @desc    Get retryable errors
// @access  Private
router.get('/retryable', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const errors = await MessageError.find({
      businessId: req.businessId,
      'retryInfo.canRetry': true,
      $or: [
        { 'resolution.status': 'PENDING' },
        { 'resolution.status': 'RETRYING' }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const formattedErrors = errors.map(item => {
      const instance = new MessageError(item);
      return instance.getDisplayInfo();
    });

    res.json({
      errors: formattedErrors,
      count: errors.length
    });
  } catch (error) {
    console.error('Get retryable errors error:', error);
    res.status(500).json({ error: 'Failed to fetch retryable errors' });
  }
});

module.exports = router;
