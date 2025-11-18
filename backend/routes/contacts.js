const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const ContactHistory = require('../models/ContactHistory');

// @route   GET /api/contacts/history
// @desc    Get contact history for all contacts
// @access  Private
router.get('/history', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      eventType,
      phoneNumber,
      startDate,
      endDate,
      hours = 24
    } = req.query;

    let query = { businessId: req.businessId };

    if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    } else if (!phoneNumber) {
      // Default to last 24 hours if no date range specified and not querying specific contact
      const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
      query.timestamp = { $gte: since };
    }

    const [history, total] = await Promise.all([
      ContactHistory.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      ContactHistory.countDocuments(query)
    ]);

    // Format for display
    const formattedHistory = history.map(item => {
      const instance = new ContactHistory(item);
      return instance.getDisplayInfo();
    });

    res.json({
      history: formattedHistory,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + history.length < total
      }
    });
  } catch (error) {
    console.error('Get contact history error:', error);
    res.status(500).json({ error: 'Failed to fetch contact history' });
  }
});

// @route   GET /api/contacts/history/:phoneNumber
// @desc    Get history for a specific contact
// @access  Private
router.get('/history/:phoneNumber', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { limit = 50, skip = 0, eventType } = req.query;

    const result = await ContactHistory.getHistory(req.businessId, phoneNumber, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      eventType
    });

    // Format for display
    const formattedHistory = result.history.map(item => {
      const instance = new ContactHistory(item);
      return instance.getDisplayInfo();
    });

    res.json({
      phoneNumber,
      history: formattedHistory,
      pagination: {
        total: result.total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Get contact history error:', error);
    res.status(500).json({ error: 'Failed to fetch contact history' });
  }
});

// @route   GET /api/contacts/recent-changes
// @desc    Get recent contact changes (last 24 hours by default)
// @access  Private
router.get('/recent-changes', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { limit = 20, hours = 24 } = req.query;

    const result = await ContactHistory.getRecentChanges(req.businessId, {
      limit: parseInt(limit),
      hours: parseInt(hours)
    });

    // Format for display
    const formattedChanges = result.changes.map(item => {
      const instance = new ContactHistory(item);
      return instance.getDisplayInfo();
    });

    // Format grouped data
    const formattedGrouped = {};
    Object.keys(result.grouped).forEach(phoneNumber => {
      formattedGrouped[phoneNumber] = result.grouped[phoneNumber].map(item => {
        const instance = new ContactHistory(item);
        return instance.getDisplayInfo();
      });
    });

    res.json({
      changes: formattedChanges,
      grouped: formattedGrouped,
      count: result.count,
      since: result.since,
      hours: parseInt(hours)
    });
  } catch (error) {
    console.error('Get recent changes error:', error);
    res.status(500).json({ error: 'Failed to fetch recent changes' });
  }
});

// @route   GET /api/contacts/change-summary
// @desc    Get summary of contact changes
// @access  Private
router.get('/change-summary', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const summary = await ContactHistory.getChangeSummary(req.businessId, parseInt(days));

    res.json(summary);
  } catch (error) {
    console.error('Get change summary error:', error);
    res.status(500).json({ error: 'Failed to fetch change summary' });
  }
});

// @route   GET /api/contacts/unprocessed
// @desc    Get unprocessed contact changes
// @access  Private
router.get('/unprocessed', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const unprocessed = await ContactHistory.getUnprocessed(req.businessId, parseInt(limit));

    // Format for display
    const formatted = unprocessed.map(item => {
      const instance = new ContactHistory(item);
      return instance.getDisplayInfo();
    });

    res.json({
      unprocessed: formatted,
      count: unprocessed.length
    });
  } catch (error) {
    console.error('Get unprocessed changes error:', error);
    res.status(500).json({ error: 'Failed to fetch unprocessed changes' });
  }
});

// @route   POST /api/contacts/mark-processed
// @desc    Mark contact changes as processed
// @access  Private
router.post('/mark-processed', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await ContactHistory.markAsProcessed(ids);

    res.json({
      message: 'Contact changes marked as processed',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark processed error:', error);
    res.status(500).json({ error: 'Failed to mark changes as processed' });
  }
});

// @route   GET /api/contacts/stats
// @desc    Get contact change statistics
// @access  Private
router.get('/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [total, byType, unprocessedCount, uniqueContacts] = await Promise.all([
      ContactHistory.countDocuments({
        businessId: req.businessId,
        timestamp: { $gte: since }
      }),
      ContactHistory.aggregate([
        {
          $match: {
            businessId: req.businessId,
            timestamp: { $gte: since }
          }
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      ContactHistory.countDocuments({
        businessId: req.businessId,
        'metadata.processed': false
      }),
      ContactHistory.distinct('phoneNumber', {
        businessId: req.businessId,
        timestamp: { $gte: since }
      })
    ]);

    // Get daily breakdown
    const dailyBreakdown = await ContactHistory.aggregate([
      {
        $match: {
          businessId: req.businessId,
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      total,
      byType,
      unprocessedCount,
      uniqueContactsCount: uniqueContacts.length,
      dailyBreakdown,
      period: `${days} days`,
      since
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
