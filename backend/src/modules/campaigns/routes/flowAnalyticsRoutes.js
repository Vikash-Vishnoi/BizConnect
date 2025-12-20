/**
 * Flow Response & Analytics Routes
 * @module routes/flows/flowAnalyticsRoutes
 */

const express = require('express');
const router = express.Router();
const { Flow, FlowResponse } = require('../../../core/database/models');
const { NotFoundError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants/httpConstants');
const logger = require('../../../common/helpers/logger');

// Constants
const DEFAULT_FLOW_RESPONSES_LIMIT = 50;
const MAX_FLOW_RESPONSES_LIMIT = 200;
const DEFAULT_PAGE = 1;
const FLOW_RESPONSE_STATUS_COMPLETED = 'COMPLETED';
const FLOW_RESPONSE_STATUS_ABANDONED = 'ABANDONED';
const FLOW_RESPONSE_STATUS_IN_PROGRESS = 'IN_PROGRESS';
const FLOW_STATUS_PUBLISHED = 'PUBLISHED';
const FLOW_STATUS_DRAFT = 'DRAFT';
const PERCENTAGE_MULTIPLIER = 100;

// GET /:id/responses - Get flow responses
router.get('/:id/responses', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { limit = DEFAULT_FLOW_RESPONSES_LIMIT, page = DEFAULT_PAGE, status } = req.query;
    const finalLimit = Math.min(parseInt(limit), MAX_FLOW_RESPONSES_LIMIT);

    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    const query = { flowId: flow._id };
    if (status) query.status = status;

    const responses = await FlowResponse.find(query)
      .sort({ submittedAt: -1 })
      .limit(finalLimit)
      .skip((parseInt(page) - DEFAULT_PAGE) * finalLimit);

    const total = await FlowResponse.countDocuments(query);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: responses.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / finalLimit),
        responses
      },
      message: 'Flow responses retrieved successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error retrieving flow responses:', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      flowId: req.params.id
    });
    throw error;
  }
});

// GET /:id/analytics - Get flow analytics
router.get('/:id/analytics', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const flow = await Flow.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!flow) {
      throw new NotFoundError('Flow not found');
    }

    const [total, completed, abandoned, pending] = await Promise.all([
      FlowResponse.countDocuments({ flowId: flow._id }),
      FlowResponse.countDocuments({ flowId: flow._id, status: FLOW_RESPONSE_STATUS_COMPLETED }),
      FlowResponse.countDocuments({ flowId: flow._id, status: FLOW_RESPONSE_STATUS_ABANDONED }),
      FlowResponse.countDocuments({ flowId: flow._id, status: FLOW_RESPONSE_STATUS_IN_PROGRESS })
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * PERCENTAGE_MULTIPLIER) : 0;
    const abandonmentRate = total > 0 ? Math.round((abandoned / total) * PERCENTAGE_MULTIPLIER) : 0;

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        analytics: {
          totalResponses: total,
          completed,
          abandoned,
          pending,
          completionRate,
          abandonmentRate
        }
      },
      message: 'Flow analytics retrieved successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error retrieving flow analytics:', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      flowId: req.params.id
    });
    throw error;
  }
});

// GET /stats/summary - Get flows summary statistics
router.get('/stats/summary', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const [totalFlows, publishedFlows, draftFlows] = await Promise.all([
      Flow.countDocuments({ businessId: req.businessId }),
      Flow.countDocuments({ businessId: req.businessId, status: FLOW_STATUS_PUBLISHED }),
      Flow.countDocuments({ businessId: req.businessId, status: FLOW_STATUS_DRAFT })
    ]);

    const totalResponses = await FlowResponse.countDocuments({
      businessId: req.businessId
    });

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        summary: {
          totalFlows,
          publishedFlows,
          draftFlows,
          totalResponses
        }
      },
      message: 'Flow summary retrieved successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Error retrieving flow summary:', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString()
    });
    throw error;
  }
});

module.exports = router;
