const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/auth');
const Template = require('../../../core/database/models/Template');
const logger = require('../../../common/helpers/logger');

/**
 * Get template statistics (must be before /:id route)
 * GET /api/templates/stats
 */
router.get('/stats', auth, requireBusiness, async (req, res) => {
  try {
    const businessId = req.business._id;

    const stats = await Template.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Template.countDocuments({ businessId });

    const result = {
      total,
      draft: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      result[stat._id.toLowerCase()] = stat.count;
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching template stats:', error);
    res.status(500).json({ error: 'Failed to fetch template statistics' });
  }
});

/**
 * Get template analytics (must be before /:id route)
 * GET /api/templates/analytics
 */
router.get('/analytics', auth, requireBusiness, async (req, res) => {
  try {
    const businessId = req.business._id;
    const { startDate, endDate } = req.query;

    const query = { businessId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const templates = await Template.find(query).lean();

    res.json({
      templates: templates.map(t => ({
        id: t._id,
        name: t.name,
        category: t.category,
        status: t.status,
        sent: t.messagesSent || 0,
        delivered: t.messagesDelivered || 0,
        read: t.messagesRead || 0,
        failed: t.messagesFailed || 0
      }))
    });
  } catch (error) {
    logger.error('Error fetching template analytics:', error);
    res.status(500).json({ error: 'Failed to fetch template analytics' });
  }
});

/**
 * Get all templates
 * GET /api/templates
 */
router.get('/', auth, requireBusiness, requireBusinessPermission('view', 'templates'), async (req, res) => {
  try {
    const businessId = req.business._id;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      category,
      language,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { businessId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (language && language !== 'all') {
      query.language = language;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [templates, total] = await Promise.all([
      Template.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Template.countDocuments(query)
    ]);

    res.json({
      templates,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: skip + templates.length < total
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get template by ID
 * GET /api/templates/:id
 */
router.get('/:id', auth, requireBusiness, requireBusinessPermission('view', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

module.exports = router;
