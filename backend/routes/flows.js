const express = require('express');
const router = express.Router();
const { Flow, FlowResponse } = require('../models');
const flowService = require('../services/flowService');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * @route   GET /api/flows
 * @desc    Get all flows for authenticated user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, limit = 50, page = 1 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.categories = category;

    const flows = await Flow.getUserFlows(req.user._id, filters);

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedFlows = flows.slice(startIndex, endIndex);

    res.json({
      success: true,
      count: paginatedFlows.length,
      total: flows.length,
      page: parseInt(page),
      pages: Math.ceil(flows.length / limit),
      flows: paginatedFlows
    });
  } catch (error) {
    console.error('Error getting flows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flows',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/flows/:id
 * @desc    Get flow by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    res.json({
      success: true,
      flow
    });
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flow',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/flows
 * @desc    Create a new flow
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, categories, screens, settings, useTemplate } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Flow name is required'
      });
    }

    let flow;

    // Create from template or custom
    if (useTemplate) {
      flow = Flow.createDefaultFlow(req.user._id, useTemplate);
      if (name !== flow.name) {
        flow.name = name;
      }
      if (description) {
        flow.description = description;
      }
    } else {
      if (!screens || screens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Flow must have at least one screen'
        });
      }

      flow = new Flow({
        user: req.user._id,
        name,
        description,
        categories: categories || ['OTHER'],
        screens,
        settings: settings || {},
        createdBy: req.user._id
      });
    }

    // Validate flow structure
    const validationErrors = flow.validateStructure();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Flow validation failed',
        errors: validationErrors
      });
    }

    await flow.save();

    res.status(201).json({
      success: true,
      message: 'Flow created successfully',
      flow
    });
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create flow',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/flows/:id
 * @desc    Update a flow
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    // Can't edit published flows
    if (flow.status === 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit published flows. Create a new version or deprecate first.'
      });
    }

    const { name, description, categories, screens, settings } = req.body;

    if (name) flow.name = name;
    if (description) flow.description = description;
    if (categories) flow.categories = categories;
    if (screens) flow.screens = screens;
    if (settings) flow.settings = { ...flow.settings, ...settings };
    
    flow.updatedBy = req.user._id;

    // Validate updated structure
    const validationErrors = flow.validateStructure();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Flow validation failed',
        errors: validationErrors
      });
    }

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

/**
 * @route   DELETE /api/flows/:id
 * @desc    Delete a flow (soft delete)
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    // Soft delete
    flow.isActive = false;
    flow.updatedBy = req.user._id;
    await flow.save();

    // Also delete from WhatsApp if published
    if (flow.flowId && flow.status === 'PUBLISHED') {
      try {
        await flowService.deleteFlow(flow.flowId);
      } catch (error) {
        console.error('Error deleting flow from WhatsApp:', error.message);
        // Continue even if WhatsApp deletion fails
      }
    }

    res.json({
      success: true,
      message: 'Flow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete flow',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/flows/:id/publish
 * @desc    Publish a flow to WhatsApp
 * @access  Private
 */
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    // Validate structure before publishing
    const validationErrors = flow.validateStructure();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Flow validation failed. Fix errors before publishing.',
        errors: validationErrors
      });
    }

    // Step 1: Create flow in WhatsApp (if not already created)
    if (!flow.flowId) {
      const createResult = await flowService.createFlow({
        name: flow.name,
        categories: flow.categories
      });

      flow.flowId = createResult.flowId;
      flow.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      await flow.save();
    }

    // Step 2: Upload flow JSON
    const flowJSON = flow.toFlowJSON();
    const uploadResult = await flowService.updateFlowJSON(flow.flowId, flowJSON);

    if (!uploadResult.success || uploadResult.validation_errors.length > 0) {
      flow.validation_errors = uploadResult.validation_errors;
      await flow.save();

      return res.status(400).json({
        success: false,
        message: 'Flow JSON validation failed',
        errors: uploadResult.validation_errors
      });
    }

    // Step 3: Publish the flow
    const publishResult = await flowService.publishFlow(flow.flowId);

    flow.status = 'PUBLISHED';
    flow.validation_errors = [];
    flow.updatedBy = req.user._id;
    await flow.save();

    res.json({
      success: true,
      message: 'Flow published successfully',
      flow,
      whatsappData: publishResult.data
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

/**
 * @route   POST /api/flows/:id/deprecate
 * @desc    Deprecate a published flow
 * @access  Private
 */
router.post('/:id/deprecate', auth, async (req, res) => {
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    if (!flow.flowId) {
      return res.status(400).json({
        success: false,
        message: 'Flow not published yet'
      });
    }

    // Deprecate in WhatsApp
    await flowService.deprecateFlow(flow.flowId);

    flow.status = 'DEPRECATED';
    flow.updatedBy = req.user._id;
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

/**
 * @route   POST /api/flows/:id/send
 * @desc    Send a flow message to a contact
 * @access  Private
 */
router.post('/:id/send', auth, async (req, res) => {
  try {
    const { phoneNumber, header, body, footer, flow_cta, initial_screen } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!body) {
      return res.status(400).json({
        success: false,
        message: 'Message body is required'
      });
    }

    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    if (flow.status !== 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'Flow must be published before sending'
      });
    }

    // Generate unique flow token
    const flowToken = crypto.randomBytes(16).toString('hex');

    // Create flow response record
    const flowResponse = new FlowResponse({
      flow: flow._id,
      flowId: flow.flowId,
      user: req.user._id,
      contact: {
        phoneNumber
      },
      flowToken,
      status: 'initiated'
    });
    await flowResponse.save();

    // Send flow message via WhatsApp
    const result = await flowService.sendFlowMessage(
      process.env.WHATSAPP_PHONE_NUMBER_ID,
      phoneNumber,
      {
        flow_id: flow.flowId,
        flow_token: flowToken,
        header,
        body,
        footer,
        flow_cta: flow_cta || 'Open',
        initial_screen: initial_screen || (flow.screens[0]?.id)
      }
    );

    // Update flow response with message ID
    flowResponse.messageId = result.messageId;
    await flowResponse.save();

    res.json({
      success: true,
      message: 'Flow sent successfully',
      messageId: result.messageId,
      flowToken
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

/**
 * @route   GET /api/flows/:id/responses
 * @desc    Get responses for a flow
 * @access  Private
 */
router.get('/:id/responses', auth, async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 50, page = 1 } = req.query;

    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    const filters = {};
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const responses = await FlowResponse.getFlowResponses(flow._id, filters);

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResponses = responses.slice(startIndex, endIndex);

    res.json({
      success: true,
      count: paginatedResponses.length,
      total: responses.length,
      page: parseInt(page),
      pages: Math.ceil(responses.length / limit),
      responses: paginatedResponses
    });
  } catch (error) {
    console.error('Error getting flow responses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flow responses',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/flows/:id/analytics
 * @desc    Get flow analytics
 * @access  Private
 */
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const flow = await Flow.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    // Get response statistics
    const responseStats = await FlowResponse.getResponseStats(flow._id, parseInt(days));

    // Get WhatsApp analytics if available
    let whatsappAnalytics = null;
    if (flow.flowId) {
      const waResult = await flowService.getFlowAnalytics(flow.flowId);
      if (waResult.success) {
        whatsappAnalytics = waResult.data;
      }
    }

    res.json({
      success: true,
      analytics: {
        flow: {
          id: flow._id,
          name: flow.name,
          status: flow.status,
          sent_count: flow.analytics.sent_count,
          completed_count: flow.analytics.completed_count,
          abandoned_count: flow.analytics.abandoned_count,
          completion_rate: flow.analytics.completion_rate,
          avg_completion_time: flow.analytics.avg_completion_time
        },
        responses: responseStats,
        whatsapp: whatsappAnalytics
      }
    });
  } catch (error) {
    console.error('Error getting flow analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flow analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/flows/stats/summary
 * @desc    Get flow statistics summary for user
 * @access  Private
 */
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const stats = await Flow.getFlowStats(req.user._id);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting flow stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flow stats',
      error: error.message
    });
  }
});

module.exports = router;

