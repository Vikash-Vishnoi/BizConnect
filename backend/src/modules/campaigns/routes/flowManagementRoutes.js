/**
 * Flow Management Routes
 * @module routes/flows/flowManagementRoutes
 */

const express = require('express');
const router = express.Router();
const { Flow } = require('../../../core/database/models');
const flowService = require('../services/flowService');
const { flowLimiter } = require('../../../core/middlewares/rateLimiter');
const {  
  validateCreateFlow, 
  validateUpdateFlow, 
  validateFlowId,
  validatePagination 
} = require('../../../core/middlewares/validation');
const { sendError, ERROR_CODES } = require('../../../common/helpers/errorCodes');
const { HTTP_STATUS } = require('../../../common/constants');
const { asyncHandler, NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');

// Constants
const DEFAULT_FLOWS_LIMIT = 50;
const MAX_FLOWS_LIMIT = 200;
const DEFAULT_PAGE = 1;
const FLOW_STATUS_PUBLISHED = 'PUBLISHED';
const FLOW_STATUS_DRAFT = 'DRAFT';
const FLOW_STATUS_DEPRECATED = 'DEPRECATED';
const FLOW_ROUTING_AUTO = 'AUTO';
const FLOW_SEND_MODE_PUBLISHED = 'published';

// GET / - Get all flows
router.get('/', validatePagination, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { status, category, limit = DEFAULT_FLOWS_LIMIT, page = DEFAULT_PAGE } = req.query;
    const finalLimit = Math.min(parseInt(limit), MAX_FLOWS_LIMIT);

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.categories = category;

    const flows = await Flow.getUserFlows(req.businessId, filters);

    const startIndex = (page - 1) * finalLimit;
    const endIndex = page * finalLimit;
    const paginatedFlows = flows.slice(startIndex, endIndex);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: paginatedFlows,
      pagination: {
        currentPage: parseInt(page),
        pageSize: finalLimit,
        totalItems: flows.length,
        totalPages: Math.ceil(flows.length / finalLimit)
      },
      message: 'Flows retrieved successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error retrieving flows:', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to retrieve flows'
      }
    });
  }
});

// GET /:id - Get flow by ID
router.get('/:id', validateFlowId, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Flow not found'
        }
      });
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: flow,
      message: 'Flow retrieved successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error retrieving flow:', {
      error: error.message,
      stack: error.stack,
      flowId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to retrieve flow'
      }
    });
  }
});

// POST / - Create new flow
router.post('/', flowLimiter, validateCreateFlow, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { name, categories, screens, routing, settings } = req.body;

    const flow = await Flow.create({
      businessId: req.businessId,
      name,
      categories: categories || [],
      screens,
      routing: routing || FLOW_ROUTING_AUTO,
      settings: settings || {}
    });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: flow,
      message: 'Flow created successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error creating flow:', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create flow'
      }
    });
  }
});

// PUT /:id - Update flow
router.put('/:id', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Flow not found'
        }
      });
    }

    if (flow.status === FLOW_STATUS_PUBLISHED) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Cannot update published flow. Create a new version or deprecate first.'
        }
      });
    }

    const { name, categories, screens, routing, settings } = req.body;

    if (name) flow.name = name;
    if (categories) flow.categories = categories;
    if (screens) flow.screens = screens;
    if (routing) flow.routing = routing;
    if (settings) flow.settings = { ...flow.settings, ...settings };

    await flow.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: flow,
      message: 'Flow updated successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error updating flow:', {
      error: error.message,
      stack: error.stack,
      flowId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update flow'
      }
    });
  }
});

// POST /:id/publish - Publish flow
router.post('/:id/publish', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Flow not found'
        }
      });
    }

    if (flow.status === FLOW_STATUS_PUBLISHED) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Flow is already published'
        }
      });
    }

    const published = await flowService.publishFlow(flow._id, req.businessId);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: published,
      message: 'Flow published successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error publishing flow:', {
      error: error.message,
      stack: error.stack,
      flowId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to publish flow'
      }
    });
  }
});

// POST /:id/deprecate - Deprecate flow
router.post('/:id/deprecate', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Flow not found'
        }
      });
    }

    flow.status = FLOW_STATUS_DEPRECATED;
    await flow.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: flow,
      message: 'Flow deprecated successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error deprecating flow:', {
      error: error.message,
      stack: error.stack,
      flowId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to deprecate flow'
      }
    });
  }
});

// POST /:id/send - Send flow to contact
router.post('/:id/send', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { phoneNumber, mode = FLOW_SEND_MODE_PUBLISHED } = req.body;

    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Phone number is required'
        }
      });
    }

    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Flow not found'
        }
      });
    }

    const result = await flowService.sendFlow(
      req.businessId,
      phoneNumber,
      flow._id,
      mode
    );

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
      message: 'Flow sent successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error sending flow:', {
      error: error.message,
      stack: error.stack,
      flowId: req.params.id,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to send flow'
      }
    });
  }
});

module.exports = router;
