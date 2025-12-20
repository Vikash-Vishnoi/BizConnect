const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { requirePermission, requireBusinessPermission } = require('../../../core/middlewares/authorization');
const { findByIdSafe } = require('../../../common/utils/dbHelpers');
const Template = require('../../../core/database/models/Template');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS, MONGODB_PATTERNS, PAGINATION } = require('../../../common/constants');

/**
 * Template Constants
 */
const TEMPLATE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const TEMPLATE_CATEGORY = {
  MARKETING: 'MARKETING',
  UTILITY: 'UTILITY',
  AUTHENTICATION: 'AUTHENTICATION'
};

const DEFAULT_SORT = {
  FIELD: 'createdAt',
  ORDER: 'desc'
};

// ===================================================================
// SPECIFIC ROUTES FIRST (before dynamic :id routes)
// ===================================================================

/**
 * Get template statistics
 * GET /api/templates/stats
 */
router.get('/stats', auth, businessContext, async (req, res) => {
  try {
    const businessId = req.businessId;

    if (!businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    // Convert businessId to ObjectId for proper matching
    const businessObjectId = mongoose.Types.ObjectId.isValid(businessId) 
      ? new mongoose.Types.ObjectId(businessId)
      : businessId;

    logger.info('Stats request received', {
      businessId,
      businessIdType: typeof businessId,
      businessObjectId: businessObjectId.toString()
    });

    // Aggregate by the 'status' field (lowercase: draft, pending, approved, rejected)
    // Note: 'whatsappStatus' is null for drafts, so we use 'status' which always has a value
    const stats = await Template.aggregate([
      { $match: { businessId: businessObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Template.countDocuments({ businessId: businessObjectId });

    logger.info('Template stats aggregation result', {
      businessId,
      total,
      statsFromAggregate: stats,
      statuses: stats.map(s => ({ status: s._id, count: s.count }))
    });

    const result = {
      total,
      draft: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    };

    // Map the aggregation results to the stats object
    stats.forEach(stat => {
      if (stat._id && result.hasOwnProperty(stat._id)) {
        result[stat._id] = stat.count;
      }
    });

    logger.info('Template stats final result', {
      businessId,
      statsFromAggregate: stats,
      result
    });

    res.json({
      success: true,
      message: 'Template statistics retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error getting template stats', {
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to retrieve statistics',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Get template analytics
 * GET /api/templates/analytics
 */
router.get('/analytics', auth, businessContext, async (req, res) => {
  try {
    const businessId = req.businessId;
    const { startDate, endDate } = req.query;

    if (!businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const query = { businessId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const templates = await Template.find(query).lean();

    res.json({
      success: true,
      message: 'Template analytics retrieved successfully',
      data: {
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
      }
    });
  } catch (error) {
    logger.error('Error getting template analytics', {
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to retrieve analytics',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Save template as draft
 * POST /api/templates/draft
 */
router.post('/draft', auth, businessContext, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const businessId = req.businessId;
    const { name, category, language, components } = req.body;

    if (!businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Template name is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = new Template({
      businessId,
      name,
      category: category || TEMPLATE_CATEGORY.MARKETING,
      language: language || 'en',
      components: components || [],
      status: TEMPLATE_STATUS.DRAFT,
      userId: req.user._id
    });

    await template.save();

    logger.info('Draft template saved', {
      templateId: template._id.toString(),
      businessId: businessId.toString(),
      userId: req.user._id.toString(),
      name: template.name
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Draft template saved successfully',
      data: template
    });
  } catch (error) {
    logger.error('Error saving draft template', {
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to save draft',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Get template status from WhatsApp
 * GET /api/templates/:id/status (BEFORE /:id)
 */
router.get('/:id/status', auth, businessContext, requireBusinessPermission('view', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    if (!MONGODB_PATTERNS.OBJECT_ID.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Template not found',
        code: ERROR_CODES.NOT_FOUND
      });
    }

    res.json({
      success: true,
      message: 'Template status retrieved successfully',
      data: {
        status: template.status,
        whatsappStatus: template.whatsappStatus,
        whatsappTemplateId: template.whatsappTemplateId,
        qualityScore: template.qualityScore
      }
    });
  } catch (error) {
    logger.error('Error getting template status', {
      templateId: req.params.id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to retrieve status',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Submit template for approval
 * POST /api/templates/:id/submit (BEFORE /:id)
 */
router.post('/:id/submit', auth, businessContext, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    if (!MONGODB_PATTERNS.OBJECT_ID.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Template not found',
        code: ERROR_CODES.NOT_FOUND
      });
    }

    template.status = TEMPLATE_STATUS.PENDING;
    await template.save();

    logger.info('Template submitted for approval', {
      templateId: template._id.toString(),
      businessId: businessId.toString(),
      userId: req.user._id.toString()
    });

    res.json({
      success: true,
      message: 'Template submitted for approval successfully',
      data: template
    });
  } catch (error) {
    logger.error('Error submitting template', {
      templateId: req.params.id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to submit template',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

// ===================================================================
// ROOT LEVEL ROUTES (/ and /:id)
// ===================================================================

/**
 * Get all templates
 * GET /api/templates
 */
router.get('/', auth, businessContext, requireBusinessPermission('view', 'templates'), async (req, res) => {
  try {
    const businessId = req.businessId;
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      search,
      status,
      category,
      language,
      sortBy = DEFAULT_SORT.FIELD,
      sortOrder = DEFAULT_SORT.ORDER
    } = req.query;

    if (!businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

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
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [templates, total] = await Promise.all([
      Template.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Template.countDocuments(query)
    ]);

    res.json({
      success: true,
      message: 'Templates retrieved successfully',
      data: {
        templates,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        hasMore: skip + templates.length < total
      }
    });
  } catch (error) {
    logger.error('Error getting templates', {
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to retrieve templates',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Create new template
 * POST /api/templates
 */
router.post('/', auth, businessContext, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const businessId = req.businessId;
    const { name, category, language, components, status } = req.body;

    if (!businessId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Business ID is required',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    if (!name || !category || !language || !components) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Missing required fields: name, category, language, components',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = new Template({
      businessId,
      name,
      category,
      language,
      components,
      status: status || TEMPLATE_STATUS.DRAFT,
      userId: req.user._id
    });

    await template.save();

    logger.info('Template created', {
      templateId: template._id.toString(),
      businessId: businessId.toString(),
      userId: req.user._id.toString(),
      name: template.name,
      status: template.status
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    logger.error('Error creating template', {
      businessId: req.businessId,
      userId: req.user?._id,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to create template',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Get template by ID
 * GET /api/templates/:id
 */
router.get('/:id', auth, businessContext, requireBusinessPermission('view', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    if (!MONGODB_PATTERNS.OBJECT_ID.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Template not found',
        code: ERROR_CODES.NOT_FOUND
      });
    }

    res.json({
      success: true,
      message: 'Template retrieved successfully',
      data: template
    });
  } catch (error) {
    logger.error('Error getting template', {
      templateId: req.params.id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to retrieve template',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Update template
 * PUT /api/templates/:id
 */
router.put('/:id', auth, businessContext, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;
    const { name, category, language, components, status } = req.body;

    if (!MONGODB_PATTERNS.OBJECT_ID.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Template not found',
        code: ERROR_CODES.NOT_FOUND
      });
    }

    if (name) template.name = name;
    if (category) template.category = category;
    if (language) template.language = language;
    if (components) template.components = components;
    if (status) template.status = status;

    await template.save();

    logger.info('Template updated', {
      templateId: template._id.toString(),
      businessId: businessId.toString(),
      userId: req.user._id.toString()
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    logger.error('Error updating template', {
      templateId: req.params.id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to update template',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

/**
 * Delete template
 * DELETE /api/templates/:id
 */
router.delete('/:id', auth, businessContext, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    if (!MONGODB_PATTERNS.OBJECT_ID.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid template ID format',
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const template = await Template.findOne({ _id: id, businessId });

    if (!template) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Template not found',
        code: ERROR_CODES.NOT_FOUND
      });
    }

    await template.deleteOne();

    logger.info('Template deleted', {
      templateId: id,
      businessId: businessId.toString(),
      userId: req.user._id.toString()
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
      data: null
    });
  } catch (error) {
    logger.error('Error deleting template', {
      templateId: req.params.id,
      businessId: req.businessId,
      error: error.message,
      code: error.code
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to delete template',
      code: error.code || ERROR_CODES.INTERNAL_ERROR
    });
  }
});

module.exports = router;
