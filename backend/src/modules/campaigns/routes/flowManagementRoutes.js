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
const { sendError } = require('../../../common/helpers/errorCodes');
const { successResponse, paginatedResponse, notFoundResponse, createdResponse } = require('../../../common/helpers/responseHelper');

// GET / - Get all flows
router.get('/', validatePagination, async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.FLOWS_DEFAULT_LIMIT || '50');
    const maxLimit = parseInt(process.env.FLOWS_MAX_LIMIT || '200');
    const { status, category, limit = defaultLimit, page = 1 } = req.query;
    const finalLimit = Math.min(parseInt(limit), maxLimit);

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.categories = category;

    const flows = await Flow.getUserFlows(req.businessId, filters);

    const startIndex = (page - 1) * finalLimit;
    const endIndex = page * finalLimit;
    const paginatedFlows = flows.slice(startIndex, endIndex);

    return paginatedResponse(res, paginatedFlows, parseInt(page), finalLimit, flows.length, 'Flows retrieved successfully');
  } catch (error) {
    console.error('Error getting flows:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message);
  }
});

// GET /:id - Get flow by ID
router.get('/:id', validateFlowId, async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return sendError(res, 'FLOW_NOT_FOUND');
    }

    return successResponse(res, flow, 'Flow retrieved successfully');
  } catch (error) {
    console.error('Error getting flow:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message);
  }
});

// POST / - Create new flow
router.post('/', flowLimiter, validateCreateFlow, async (req, res) => {
  try {
    const { name, categories, screens, routing, settings } = req.body;

    const flow = await Flow.create({
      businessId: req.businessId,
      name,
      categories: categories || [],
      screens,
      routing: routing || 'AUTO',
      settings: settings || {}
    });

    return createdResponse(res, flow, 'Flow created successfully');
  } catch (error) {
    console.error('Error creating flow:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', error.message);
  }
});

// PUT /:id - Update flow
router.put('/:id', async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    if (flow.status === 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update published flow. Create a new version or deprecate first.'
      });
    }

    const { name, categories, screens, routing, settings } = req.body;

    if (name) flow.name = name;
    if (categories) flow.categories = categories;
    if (screens) flow.screens = screens;
    if (routing) flow.routing = routing;
    if (settings) flow.settings = { ...flow.settings, ...settings };

    await flow.save();

    res.json({
      success: true,
      message: 'Flow updated successfully',
      flow
    });
  } catch (error) {
    console.error('Error updating flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update flow',
      error: error.message
    });
  }
});

// POST /:id/publish - Publish flow
router.post('/:id/publish', async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    if (flow.status === 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'Flow is already published'
      });
    }

    const published = await flowService.publishFlow(flow._id, req.businessId);

    res.json({
      success: true,
      message: 'Flow published successfully',
      flow: published
    });
  } catch (error) {
    console.error('Error publishing flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish flow',
      error: error.message
    });
  }
});

// POST /:id/deprecate - Deprecate flow
router.post('/:id/deprecate', async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    flow.status = 'DEPRECATED';
    await flow.save();

    res.json({
      success: true,
      message: 'Flow deprecated successfully',
      flow
    });
  } catch (error) {
    console.error('Error deprecating flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deprecate flow',
      error: error.message
    });
  }
});

// POST /:id/send - Send flow to contact
router.post('/:id/send', async (req, res) => {
  try {
    const { phoneNumber, mode = 'published' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    const result = await flowService.sendFlow(
      req.businessId,
      phoneNumber,
      flow._id,
      mode
    );

    res.json({
      success: true,
      message: 'Flow sent successfully',
      result
    });
  } catch (error) {
    console.error('Error sending flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send flow',
      error: error.message
    });
  }
});

module.exports = router;
