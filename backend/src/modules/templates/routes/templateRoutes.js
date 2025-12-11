const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/auth');
const Template = require('../../../core/database/models/Template');
const logger = require('../../../common/helpers/logger');

/**
 * Handle common database errors
 */
const handleError = (error, res, context = 'Operation') => {
  logger.error(`${context} failed:`, {
    message: error.message,
    code: error.code,
    name: error.name,
    stack: error.stack
  });
  
  // Handle duplicate name error
  if (error.code === 11000) {
    return res.status(409).json({ 
      error: 'A template with this name already exists',
      field: 'name'
    });
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation error',
      details: Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }))
    });
  }
  
  res.status(500).json({ 
    error: `Failed to ${context.toLowerCase()}`,
    details: error.message 
  });
};

// ===================================================================
// SPECIFIC ROUTES FIRST (before dynamic :id routes)
// ===================================================================

/**
 * Get template statistics
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
 * Get template analytics
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
 * Save template as draft
 * POST /api/templates/draft
 */
router.post('/draft', auth, requireBusiness, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const businessId = req.business._id;
    const { name, category, language, components } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const template = new Template({
      businessId,
      name,
      category: category || 'MARKETING',
      language: language || 'en',
      components: components || [],
      status: 'draft',
      userId: req.userId
    });

    await template.save();

    logger.info('Draft template saved', {
      templateId: template._id,
      businessId,
      userId: req.userId,
      name: template.name
    });

    res.status(201).json(template);
  } catch (error) {
    handleError(error, res, 'Save draft');
  }
});

/**
 * Get template status from WhatsApp
 * GET /api/templates/:id/status (BEFORE /:id)
 */
router.get('/:id/status', auth, requireBusiness, requireBusinessPermission('view', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      status: template.status,
      whatsappStatus: template.whatsappStatus,
      whatsappTemplateId: template.whatsappTemplateId,
      qualityScore: template.qualityScore
    });
  } catch (error) {
    logger.error('Error fetching template status:', error);
    res.status(500).json({ error: 'Failed to fetch template status', details: error.message });
  }
});

/**
 * Submit template for approval
 * POST /api/templates/:id/submit (BEFORE /:id)
 */
router.post('/:id/submit', auth, requireBusiness, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    template.status = 'pending';
    await template.save();

    logger.info('Template submitted for approval', {
      templateId: template._id,
      businessId,
      userId: req.userId
    });

    res.json(template);
  } catch (error) {
    handleError(error, res, 'Submit template');
  }
});

// ===================================================================
// ROOT LEVEL ROUTES (/ and /:id)
// ===================================================================

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
 * Create new template
 * POST /api/templates
 */
router.post('/', auth, requireBusiness, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const businessId = req.business._id;
    const { name, category, language, components, status } = req.body;

    if (!name || !category || !language || !components) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'category', 'language', 'components']
      });
    }

    const template = new Template({
      businessId,
      name,
      category,
      language,
      components,
      status: status || 'draft',
      userId: req.userId
    });

    await template.save();

    logger.info('Template created', {
      templateId: template._id,
      businessId,
      userId: req.userId,
      name: template.name
    });

    res.status(201).json(template);
  } catch (error) {
    handleError(error, res, 'Create template');
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

/**
 * Update template
 * PUT /api/templates/:id
 */
router.put('/:id', auth, requireBusiness, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;
    const { name, category, language, components, status } = req.body;

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (name) template.name = name;
    if (category) template.category = category;
    if (language) template.language = language;
    if (components) template.components = components;
    if (status) template.status = status;

    await template.save();

    logger.info('Template updated', {
      templateId: template._id,
      businessId,
      userId: req.userId
    });

    res.json(template);
  } catch (error) {
    handleError(error, res, 'Update template');
  }
});

/**
 * Delete template
 * DELETE /api/templates/:id
 */
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await template.deleteOne();

    logger.info('Template deleted', {
      templateId: id,
      businessId,
      userId: req.userId
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    handleError(error, res, 'Delete template');
  }
});

module.exports = router;
