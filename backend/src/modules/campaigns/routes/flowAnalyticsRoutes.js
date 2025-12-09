/**
 * Flow Response & Analytics Routes
 * @module routes/flows/flowAnalyticsRoutes
 */

const express = require('express');
const router = express.Router();
const { Flow, FlowResponse } = require('../../../core/database/models');

// GET /:id/responses - Get flow responses
router.get('/:id/responses', async (req, res) => {
  try { 
    const defaultLimit = parseInt(process.env.FLOW_RESPONSES_DEFAULT_LIMIT || '50');
    const maxLimit = parseInt(process.env.FLOW_RESPONSES_MAX_LIMIT || '200');
    const { limit = defaultLimit, page = 1, status } = req.query;
    const finalLimit = Math.min(parseInt(limit), maxLimit);

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

    const query = { flowId: flow._id };
    if (status) query.status = status;

    const responses = await FlowResponse.find(query)
      .sort({ submittedAt: -1 })
      .limit(finalLimit)
      .skip((parseInt(page) - 1) * finalLimit);

    const total = await FlowResponse.countDocuments(query);

    res.json({
      success: true,
      count: responses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / finalLimit),
      responses
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

// GET /:id/analytics - Get flow analytics
router.get('/:id/analytics', async (req, res) => {
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

    const [total, completed, abandoned, pending] = await Promise.all([
      FlowResponse.countDocuments({ flowId: flow._id }),
      FlowResponse.countDocuments({ flowId: flow._id, status: 'COMPLETED' }),
      FlowResponse.countDocuments({ flowId: flow._id, status: 'ABANDONED' }),
      FlowResponse.countDocuments({ flowId: flow._id, status: 'IN_PROGRESS' })
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const abandonmentRate = total > 0 ? Math.round((abandoned / total) * 100) : 0;

    res.json({
      success: true,
      analytics: {
        totalResponses: total,
        completed,
        abandoned,
        pending,
        completionRate,
        abandonmentRate
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

// GET /stats/summary - Get flows summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalFlows, publishedFlows, draftFlows] = await Promise.all([
      Flow.countDocuments({ businessId: req.businessId }),
      Flow.countDocuments({ businessId: req.businessId, status: 'PUBLISHED' }),
      Flow.countDocuments({ businessId: req.businessId, status: 'DRAFT' })
    ]);

    const totalResponses = await FlowResponse.countDocuments({
      businessId: req.businessId
    });

    res.json({
      success: true,
      summary: {
        totalFlows,
        publishedFlows,
        draftFlows,
        totalResponses
      }
    });
  } catch (error) {
    console.error('Error getting flows summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get flows summary',
      error: error.message
    });
  }
});

module.exports = router;
