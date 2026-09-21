/**
 * Consolidated Analytics Routes
 * @module routes/analytics/analyticsRoutes
 * 
 * Consolidates: dashboardRoutes, performanceRoutes, reportRoutes, officialAnalyticsRoutes
 */
 
const express = require('express');
const router = express.Router();
const Analytics = require('../../../core/database/models/Analytics');
const Campaign = require('../../../core/database/models/Campaign');
const Conversation = require('../../../core/database/models/Conversation');
const Template = require('../../../core/database/models/Template');
const Business = require('../../../core/database/models/Business');
const { getConversationAnalytics, getMessageAnalytics } = require('../../../common/helpers/graphApiClient');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const { NotFoundError, ValidationError, ConflictError } = require('../../../core/middlewares/errorHandler');


// ============================================================================
// CONSTANTS
// ============================================================================

// View Types
const VIEW_TYPES = {
  OVERVIEW: 'overview',
  DASHBOARD: 'dashboard',
  SUMMARY: 'summary'
};

// Date Range Options
const DATE_RANGES = {
  SEVEN_DAYS: '7days',
  THIRTY_DAYS: '30days',
  NINETY_DAYS: '90days'
};

// Period Types
const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  TRENDS: 'trends',
  DISTRIBUTION: 'distribution'
};

// Granularity Options
const GRANULARITY_OPTIONS = {
  DAILY: 'DAILY',
  MONTHLY: 'MONTHLY'
};

// Campaign Status
const CAMPAIGN_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

// Template Status
const TEMPLATE_STATUS = {
  APPROVED: 'approved'
};

// Conversation Status
const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived'
};

// Message Direction
const MESSAGE_DIRECTION = {
  INCOMING: 'in',
  OUTGOING: 'out'
};

// Message Status
const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// Quality Score Thresholds
const QUALITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60
};

// Quality Status
const QUALITY_STATUS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Quality Weights
const QUALITY_WEIGHTS = {
  DELIVERY_RATE: 0.4,
  RESPONSE_RATE: 0.3,
  TEMPLATE_QUALITY: 0.3
};

// Time Constants (milliseconds)
const TIME_CONSTANTS = {
  DAY_IN_MS: 24 * 60 * 60 * 1000,
  SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS_MS: 90 * 24 * 60 * 60 * 1000
};

// Default Values
const DEFAULT_VIEW = VIEW_TYPES.DASHBOARD;
const DEFAULT_PERIOD = 30;
const DEFAULT_GRANULARITY = GRANULARITY_OPTIONS.DAILY;
const DEFAULT_GROUP_BY = PERIOD_TYPES.DAILY;
const DEFAULT_TOP_TEMPLATES_LIMIT = 10;
const DEFAULT_RECENT_CAMPAIGNS_LIMIT = 10;
const DEFAULT_RECENT_TEMPLATES_LIMIT = 5;
const DEFAULT_RECENT_ACTIVITY_LIMIT = 10;
const DEFAULT_CAMPAIGN_LIMIT = 10;

// Error Messages
const ERROR_MESSAGES = {
  ANALYTICS_ERROR: 'Failed to fetch analytics',
  TIMESERIES_ERROR: 'Failed to fetch timeseries analytics',
  CONVERSATION_ERROR: 'Failed to fetch conversation analytics',
  MESSAGE_ERROR: 'Failed to fetch message analytics',
  CAMPAIGN_ERROR: 'Failed to fetch campaign analytics',
  QUALITY_ERROR: 'Failed to fetch quality score',
  EXPORT_ERROR: 'Failed to create export',
  CACHE_ERROR: 'Failed to clear cache',
  MISSING_PARAMS: 'Missing required parameters',
  START_END_REQUIRED: 'start and end timestamps are required',
  START_END_REQUIRED_OFFICIAL: 'start and end timestamps are required for official API',
  WABA_NOT_CONFIGURED: 'WhatsApp Business Account ID and access token are required. Please complete embedded signup.',
  WABA_NOT_CONFIGURED_SHORT: 'WhatsApp Business Account ID and access token are required.',
  CACHE_NOT_AVAILABLE: 'AnalyticsCache model does not exist'
};

// Success Messages
const SUCCESS_MESSAGES = {
  ANALYTICS_SUMMARY: 'Analytics summary retrieved successfully',
  TIMESERIES_RETRIEVED: 'Timeseries analytics retrieved successfully',
  DISTRIBUTION_RETRIEVED: 'Message status distribution retrieved successfully',
  TRENDS_RETRIEVED: 'Message trends retrieved successfully',
  CONVERSATION_RETRIEVED: 'Conversation analytics retrieved successfully',
  CONVERSATION_OFFICIAL: 'Conversation analytics from Graph API retrieved successfully',
  MESSAGE_RETRIEVED: 'Message analytics from Graph API retrieved successfully',
  CAMPAIGN_RETRIEVED: 'Campaign analytics retrieved successfully',
  QUALITY_RETRIEVED: 'Quality score retrieved successfully',
  EXPORT_CREATED: 'Export job created successfully'
};

// API Error Codes
const API_ERROR_CODES = {
  WABA_NOT_CONFIGURED: 'WABA not configured',
  MISSING_PARAMS: 'Missing required parameters'
};

// Activity Types
const ACTIVITY_TYPES = {
  CAMPAIGN_SENT: 'campaign_sent',
  CAMPAIGN_CREATED: 'campaign_created',
  TEMPLATE_APPROVED: 'template_approved'
};

// Export Status
const EXPORT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Export Types
const EXPORT_TYPES = {
  CONVERSATIONS: 'conversations',
  CAMPAIGNS: 'campaigns',
  MESSAGES: 'messages',
  QUALITY: 'quality'
};

// Export Formats
const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json'
};

// Boolean String Values
const BOOLEAN_STRINGS = {
  TRUE: 'true',
  FALSE: 'false'
};

// ============================================================================
// CONSOLIDATED DASHBOARD/OVERVIEW/SUMMARY ROUTE
// Replaces: /overview, /dashboard, /summary, /daily-metrics
// ============================================================================

/**
 * GET / - Unified analytics view with query parameter
 * @query {string} view - Type of view: 'overview' | 'dashboard' | 'summary'
 * @query {string} range - Date range: '7days' | '30days' | '90days'
 * @query {string} startDate - Custom start date
 * @query {string} endDate - Custom end date
 * @query {number} period - Period in days (for summary view)
 */
exports.getDashboard = async (req, res) => {
  const startTime = Date.now();
  try {
    const { view = DEFAULT_VIEW, startDate, endDate, range, period = DEFAULT_PERIOD } = req.query;
    
    // Handle date range
    let start, end;
    if (range === DATE_RANGES.SEVEN_DAYS) {
      start = new Date(Date.now() - TIME_CONSTANTS.SEVEN_DAYS_MS);
      end = new Date();
    } else if (range === DATE_RANGES.THIRTY_DAYS) {
      start = new Date(Date.now() - TIME_CONSTANTS.THIRTY_DAYS_MS);
      end = new Date();
    } else if (range === DATE_RANGES.NINETY_DAYS) {
      start = new Date(Date.now() - TIME_CONSTANTS.NINETY_DAYS_MS);
      end = new Date();
    } else if (view === VIEW_TYPES.SUMMARY) {
      const days = parseInt(period);
      start = new Date(Date.now() - days * TIME_CONSTANTS.DAY_IN_MS);
      end = new Date();
    } else {
      start = startDate ? new Date(startDate) : new Date(Date.now() - TIME_CONSTANTS.SEVEN_DAYS_MS);
      end = endDate ? new Date(endDate) : new Date();
    }

    // For summary view, return simplified data
    if (view === VIEW_TYPES.SUMMARY) {
      const summary = await Analytics.getSummary(req.businessId, start, end);
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { 
          summary, 
          period: parseInt(period),
          dateRange: { startDate: start, endDate: end }
        },
        message: SUCCESS_MESSAGES.ANALYTICS_SUMMARY,
        processingTime
      });
    }

    // For overview/dashboard view, return full dashboard data
    const summary = await Analytics.getSummary(req.businessId, start, end);
    const conversations = await Conversation.find({ businessId: req.businessId }, 'messages');
    const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0);

    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalTemplates,
      approvedTemplates,
      totalConversations,
      activeConversations
    ] = await Promise.all([
      Campaign.countDocuments({ businessId: req.businessId }),
      Campaign.countDocuments({ businessId: req.businessId, status: CAMPAIGN_STATUS.ACTIVE }),
      Campaign.countDocuments({ businessId: req.businessId, status: CAMPAIGN_STATUS.COMPLETED }),
      Template.countDocuments({ businessId: req.businessId }),
      Template.countDocuments({ businessId: req.businessId, status: TEMPLATE_STATUS.APPROVED }),
      Conversation.countDocuments({ businessId: req.businessId }),
      Conversation.countDocuments({ businessId: req.businessId, status: CONVERSATION_STATUS.ACTIVE })
    ]);

    // Calculate growth metrics
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousSummary = await Analytics.getSummary(req.businessId, previousStart, start);

    const calculateGrowth = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Get message volume by date
    const dailyAnalytics = await Analytics.find({
      businessId: req.businessId,
      date: { $gte: start, $lte: end },
      campaignId: null
    }).sort({ date: 1 });

    const messageVolume = dailyAnalytics.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: item.messagesSent || 0
    }));

    // Get delivery status breakdown
    const deliveryStatus = {
      sent: summary?.totalMessagesSent || 0,
      delivered: summary?.totalMessagesDelivered || 0,
      read: summary?.totalMessagesRead || 0,
      failed: summary?.totalMessagesFailed || 0
    };

    // Get template performance (top 10 templates)
    const templatePerformance = await Analytics.aggregate([
      {
        $match: {
          businessId: req.businessId,
          date: { $gte: start, $lte: end },
          campaignId: { $ne: null }
        }
      },
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaignId',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'templates',
          localField: 'campaign.templateId',
          foreignField: '_id',
          as: 'template'
        }
      },
      { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$template.name',
          sent: { $sum: '$messagesSent' },
          delivered: { $sum: '$messagesDelivered' },
          read: { $sum: '$messagesRead' }
        }
      },
      { $sort: { sent: -1 } },
      { $limit: DEFAULT_TOP_TEMPLATES_LIMIT }
    ]);

    const formattedTemplatePerformance = templatePerformance.map(item => ({
      name: item._id || 'Unknown Template',
      sent: item.sent || 0,
      delivered: item.delivered || 0,
      read: item.read || 0
    }));

    // Get today's metrics for dashboard
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAnalytics = await Analytics.aggregate([
      { 
        $match: { 
          businessId: req.businessId,
          date: { $gte: today }
        } 
      },
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$messagesSent' },
          totalDelivered: { $sum: '$messagesDelivered' },
          totalRead: { $sum: '$messagesRead' },
          totalReplied: { $sum: '$messagesReplied' }
        }
      }
    ]);

    const todayData = todayAnalytics[0] || { totalSent: 0, totalDelivered: 0, totalRead: 0, totalReplied: 0 };

    // Get recent activity (last 10 events)
    const recentCampaigns = await Campaign.find({ 
      businessId: req.businessId 
    })
      .sort({ createdAt: -1 })
      .limit(DEFAULT_RECENT_CAMPAIGNS_LIMIT)
      .select('name status createdAt totalSent');

    const recentTemplates = await Template.find({ 
      businessId: req.businessId,
      status: TEMPLATE_STATUS.APPROVED
    })
      .sort({ updatedAt: -1 })
      .limit(DEFAULT_RECENT_TEMPLATES_LIMIT)
      .select('name status updatedAt');

    const activities = [];
    recentCampaigns.forEach(campaign => {
      activities.push({
        _id: campaign._id,
        type: campaign.status === CAMPAIGN_STATUS.ACTIVE ? ACTIVITY_TYPES.CAMPAIGN_SENT : ACTIVITY_TYPES.CAMPAIGN_CREATED,
        description: `Campaign "${campaign.name}" ${campaign.status === CAMPAIGN_STATUS.ACTIVE ? 'is active' : 'was created'}`,
        timestamp: campaign.createdAt
      });
    });

    recentTemplates.forEach(template => {
      activities.push({
        _id: template._id,
        type: ACTIVITY_TYPES.TEMPLATE_APPROVED,
        description: `Template "${template.name}" was approved`,
        timestamp: template.updatedAt
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        view,
        // Stats for cards
        totalMessages: summary?.totalMessagesSent || 0,
        delivered: summary?.totalMessagesDelivered || 0,
        read: summary?.totalMessagesRead || 0,
        failed: summary?.totalMessagesFailed || 0,
        deliveryRate: Math.round(summary?.avgDeliveryRate || 0),
        readRate: Math.round(summary?.avgReadRate || 0),
        messagesToday: todayData.totalSent || 0,
        
        // Chart data
        messageVolume: messageVolume.length > 0 ? messageVolume : [{ date: 'Today', count: 0 }],
        deliveryStatus,
        templatePerformance: formattedTemplatePerformance.length > 0 ? formattedTemplatePerformance : [
          { name: 'No Data', sent: 0, delivered: 0, read: 0 }
        ],
        
        // Additional data
        overview: {
          totalCampaigns,
          activeCampaigns,
          completedCampaigns,
          totalTemplates,
          approvedTemplates,
          totalConversations,
          activeConversations,
          totalMessages
        },
        metrics: {
          messagesSent: summary?.totalMessagesSent || 0,
          messagesDelivered: summary?.totalMessagesDelivered || 0,
          messagesRead: summary?.totalMessagesRead || 0,
          messagesFailed: summary?.totalMessagesFailed || 0,
          messagesReplied: todayData.totalReplied || 0,
          avgDeliveryRate: Math.round(summary?.avgDeliveryRate || 0),
          avgReadRate: Math.round(summary?.avgReadRate || 0),
          avgQualityScore: Math.round(summary?.avgQualityScore || 0)
        },
        growth: {
          campaignsGrowth: calculateGrowth(
            summary?.totalCompletedCampaigns || 0,
            previousSummary?.totalCompletedCampaigns || 0
          ),
          messagesGrowth: calculateGrowth(
            summary?.totalMessagesSent || 0,
            previousSummary?.totalMessagesSent || 0
          ),
          conversationsGrowth: calculateGrowth(
            summary?.totalNewConversations || 0,
            previousSummary?.totalNewConversations || 0
          )
        },
        recentActivity: activities.slice(0, DEFAULT_RECENT_ACTIVITY_LIMIT),
        dateRange: {
          startDate: start,
          endDate: end
        }
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get analytics error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.ANALYTICS_ERROR,
      processingTime
    });
  }
};

// ============================================================================
// CONSOLIDATED TIMESERIES ROUTE
// Replaces: /daily, /daily-metrics, /trends, /status-distribution
// ============================================================================

/**
 * GET /timeseries - Time-series analytics data
 * @query {string} period - 'daily' | 'weekly' | 'trends' | 'distribution'
 * @query {string} startDate - Start date
 * @query {string} endDate - End date
 */
exports.getTimeseries = async (req, res) => {
  const startTime = Date.now();
  try {
    const { period = DEFAULT_GROUP_BY, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - TIME_CONSTANTS.THIRTY_DAYS_MS);
    const end = endDate ? new Date(endDate) : new Date();

    if (period === PERIOD_TYPES.DISTRIBUTION) {
      // Return message status distribution
      const conversations = await Conversation.find({ businessId: req.businessId }, 'messages');
      
      const distribution = {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      };

      let total = 0;
      conversations.forEach(conv => {
        if (conv.messages) {
          conv.messages.forEach(msg => {
            if (distribution.hasOwnProperty(msg.status)) {
              distribution[msg.status]++;
              total++;
            }
          });
        }
      });

      total = total || 1;
      const statusDistribution = Object.entries(distribution).map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }));

      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { 
          period: PERIOD_TYPES.DISTRIBUTION,
          data: statusDistribution 
        },
        message: SUCCESS_MESSAGES.DISTRIBUTION_RETRIEVED,
        processingTime
      });
    }

    if (period === PERIOD_TYPES.TRENDS) {
      // Return message trends over time
      const conversations = await Conversation.find({
        businessId: req.businessId,
        'messages.timestamp': { $gte: start, $lte: end }
      }, 'messages');

      const messages = [];
      conversations.forEach(conv => {
        if (conv.messages) {
          const filteredMessages = conv.messages.filter(m => 
            m.timestamp >= start && m.timestamp <= end
          );
          messages.push(...filteredMessages);
        }
      });

      messages.sort((a, b) => a.timestamp - b.timestamp);

      const trendsMap = new Map();
      messages.forEach(msg => {
        const date = msg.timestamp.toISOString().split('T')[0];
        if (!trendsMap.has(date)) {
          trendsMap.set(date, { sent: 0, delivered: 0, read: 0, failed: 0 });
        }
        const trend = trendsMap.get(date);
        if (msg.status === MESSAGE_STATUS.SENT) trend.sent++;
        else if (msg.status === MESSAGE_STATUS.DELIVERED) trend.delivered++;
        else if (msg.status === MESSAGE_STATUS.READ) trend.read++;
        else if (msg.status === MESSAGE_STATUS.FAILED) trend.failed++;
      });

      const trends = Array.from(trendsMap.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      }));

      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { 
          period: PERIOD_TYPES.TRENDS,
          data: trends 
        },
        message: SUCCESS_MESSAGES.TRENDS_RETRIEVED,
        processingTime
      });
    }

    // Default: daily analytics
    const analytics = await Analytics.find({
      businessId: req.businessId,
      date: { $gte: start, $lte: end },
      campaignId: null
    }).sort({ date: 1 });

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { 
        period,
        data: analytics 
      },
      message: SUCCESS_MESSAGES.TIMESERIES_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get timeseries analytics error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.TIMESERIES_ERROR,
      processingTime
    });
  }
};

// ============================================================================
// CONVERSATION ANALYTICS
// Keeps: /conversations (from reportRoutes + officialAnalyticsRoutes)
// ============================================================================

/**
 * GET /conversations - Conversation analytics
 * @query {boolean} official - If true, fetch from WhatsApp Graph API
 * @query {string} start - Unix timestamp (for official API)
 * @query {string} end - Unix timestamp (for official API)
 * @query {string} granularity - 'DAILY' | 'MONTHLY' (for official API)
 */
exports.getConversations = async (req, res) => {
  const startTime = Date.now();
  try {
    const { official = BOOLEAN_STRINGS.FALSE, start, end, granularity = DEFAULT_GRANULARITY, useCache = BOOLEAN_STRINGS.TRUE } = req.query;

    // If official=true, fetch from WhatsApp Graph API
    if (official === BOOLEAN_STRINGS.TRUE) {
      if (!start || !end) {
        const processingTime = Date.now() - startTime;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: API_ERROR_CODES.MISSING_PARAMS,
          message: ERROR_MESSAGES.START_END_REQUIRED_OFFICIAL,
          processingTime
        });
      }

      const startDate = new Date(parseInt(start) * 1000);
      const endDate = new Date(parseInt(end) * 1000);

      // Get business WABA and access token
      const business = await Business.findById(req.businessId);
      if (!business.waba?.id || !business.accessToken) {
        const processingTime = Date.now() - startTime;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: API_ERROR_CODES.WABA_NOT_CONFIGURED,
          message: ERROR_MESSAGES.WABA_NOT_CONFIGURED,
          processingTime
        });
      }

      // Fetch from Graph API
      logger.info('Fetching conversation analytics from WhatsApp API', {
        businessId: req.businessId?.toString()
      });
      const analyticsData = await getConversationAnalytics(
        business.waba.id, 
        { start: parseInt(start), end: parseInt(end), granularity }, 
        business.accessToken
      );

      // Transform data
      const transformedData = transformConversationAnalytics(analyticsData);

      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: transformedData,
        message: SUCCESS_MESSAGES.CONVERSATION_OFFICIAL,
        processingTime
      });
    }

    // Otherwise, return local conversation analytics
    const [
      totalConversations,
      activeConversations,
      archivedConversations
    ] = await Promise.all([
      Conversation.countDocuments({ businessId: req.businessId }),
      Conversation.countDocuments({ businessId: req.businessId, status: CONVERSATION_STATUS.ACTIVE }),
      Conversation.countDocuments({ businessId: req.businessId, status: CONVERSATION_STATUS.ARCHIVED })
    ]);

    const conversations = await Conversation.find({ businessId: req.businessId }, 'messages');
    
    let totalMessagesCount = 0;
    let incomingCount = 0;
    let outgoingCount = 0;

    conversations.forEach(conv => {
      if (conv.messages) {
        totalMessagesCount += conv.messages.length;
        incomingCount += conv.messages.filter(m => m.direction === MESSAGE_DIRECTION.INCOMING).length;
        outgoingCount += conv.messages.filter(m => m.direction === MESSAGE_DIRECTION.OUTGOING).length;
      }
    });

    const avgMessagesPerConversation = conversations.length > 0 
      ? Math.round(totalMessagesCount / conversations.length) 
      : 0;

    const responseRate = incomingCount > 0 
      ? Math.round((outgoingCount / incomingCount) * 100) 
      : 0;

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        totalConversations,
        activeConversations,
        archivedConversations,
        avgMessagesPerConversation,
        responseRate,
        incomingMessages: incomingCount,
        outgoingMessages: outgoingCount
      },
      message: SUCCESS_MESSAGES.CONVERSATION_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get conversation analytics error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.CONVERSATION_ERROR,
      processingTime
    });
  }
};

// ============================================================================
// MESSAGE ANALYTICS
// Replaces: /official/messages
// ============================================================================

/**
 * GET /messages - Message analytics from WhatsApp Graph API
 * @query {string} start - Unix timestamp
 * @query {string} end - Unix timestamp
 * @query {string} granularity - 'DAILY' | 'MONTHLY'
 */
exports.getMessages = async (req, res) => {
  const startTime = Date.now();
  try {
    const { start, end, granularity = DEFAULT_GRANULARITY } = req.query;

    if (!start || !end) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: API_ERROR_CODES.MISSING_PARAMS,
        message: ERROR_MESSAGES.START_END_REQUIRED,
        processingTime
      });
    }

    const startDate = new Date(parseInt(start) * 1000);
    const endDate = new Date(parseInt(end) * 1000);

    // Get business WABA and access token
    const business = await Business.findById(req.businessId);
    if (!business.waba?.id || !business.accessToken) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: API_ERROR_CODES.WABA_NOT_CONFIGURED,
        message: ERROR_MESSAGES.WABA_NOT_CONFIGURED_SHORT,
        processingTime
      });
    }

    // Fetch from Graph API
    const analyticsData = await getMessageAnalytics(
      business.waba.id,
      { start: parseInt(start), end: parseInt(end), granularity },
      business.accessToken
    );

    // Transform data
    const transformedData = transformMessageAnalytics(analyticsData);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: transformedData,
      message: SUCCESS_MESSAGES.MESSAGE_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error fetching message analytics', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.MESSAGE_ERROR,
      message: error.message,
      processingTime
    });
  }
};

// ============================================================================
// CAMPAIGN ANALYTICS
// Keeps: /campaigns (from reportRoutes + performanceRoutes campaign-performance)
// ============================================================================

/**
 * GET /campaigns - Campaign performance analytics
 * @query {string} startDate - Start date
 * @query {string} endDate - End date
 */
exports.getCampaigns = async (req, res) => {
  const startTime = Date.now();
  try {
    const { startDate, endDate } = req.query;
    const query = { businessId: req.businessId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      query.status = { $in: [CAMPAIGN_STATUS.COMPLETED, CAMPAIGN_STATUS.ACTIVE] };
    }

    const campaigns = await Campaign.find(query)
      .select('name status stats createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(DEFAULT_CAMPAIGN_LIMIT);

    const campaignStats = campaigns.map(campaign => {
      const total = campaign.stats?.total || campaign.stats?.sent || 0;
      const delivered = campaign.stats?.delivered || 0;
      const read = campaign.stats?.read || 0;
      
      return {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        sent: campaign.stats?.sent || total,
        messagesSent: total,
        delivered,
        read,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
        replyRate: total > 0
          ? Math.round(((campaign.stats.replied || 0) / total) * 100)
          : 0,
        failureRate: total > 0
          ? Math.round((campaign.stats.failed / total) * 100)
          : 0,
        createdAt: campaign.createdAt,
        completedAt: campaign.completedAt
      };
    });

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { campaigns: campaignStats },
      message: SUCCESS_MESSAGES.CAMPAIGN_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get campaign analytics error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.CAMPAIGN_ERROR,
      processingTime
    });
  }
};

// ============================================================================
// QUALITY SCORE
// Keeps: /quality (from performanceRoutes)
// ============================================================================

/**
 * GET /quality - Quality score and rating
 */
exports.getQuality = async (req, res) => {
  const startTime = Date.now();
  try {
    const campaigns = await Campaign.find({ businessId: req.businessId });
    const totalCampaigns = campaigns.length;
    
    if (totalCampaigns === 0) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          score: 0,
          status: QUALITY_STATUS.LOW,
          phoneNumberId: req.business?.whatsappConfig?.phoneNumberId || '',
          lastUpdated: new Date().toISOString(),
        },
        message: SUCCESS_MESSAGES.QUALITY_RETRIEVED,
        processingTime
      });
    }

    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
    const totalRead = campaigns.reduce((sum, c) => sum + (c.stats?.read || 0), 0);
    
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const responseRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    
    const templates = await Template.find({ businessId: req.businessId });
    const approvedTemplates = templates.filter(t => t.status === TEMPLATE_STATUS.APPROVED).length;
    const templateQuality = templates.length > 0 ? Math.round((approvedTemplates / templates.length) * 100) : 0;
    
    const score = Math.round((deliveryRate * QUALITY_WEIGHTS.DELIVERY_RATE) + (responseRate * QUALITY_WEIGHTS.RESPONSE_RATE) + (templateQuality * QUALITY_WEIGHTS.TEMPLATE_QUALITY));
    
    let status = QUALITY_STATUS.LOW;
    if (score >= QUALITY_THRESHOLDS.HIGH) status = QUALITY_STATUS.HIGH;
    else if (score >= QUALITY_THRESHOLDS.MEDIUM) status = QUALITY_STATUS.MEDIUM;

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        score,
        status,
        phoneNumberId: req.business?.whatsappConfig?.phoneNumberId || '',
        lastUpdated: new Date().toISOString(),
        components: {
          deliveryRate,
          responseRate,
          templateQuality
        }
      },
      message: SUCCESS_MESSAGES.QUALITY_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get quality score error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.QUALITY_ERROR,
      processingTime
    });
  }
};

// ============================================================================
// EXPORT ANALYTICS
// New unified export endpoint
// ============================================================================

/**
 * POST /export - Export analytics data
 * @body {string} type - 'conversations' | 'campaigns' | 'messages' | 'quality'
 * @body {string} format - 'csv' | 'json'
 * @body {object} dateRange - { startDate, endDate }
 */
exports.exportAnalytics = async (req, res) => {
  const startTime = Date.now();
  try {
    const { type, format = EXPORT_FORMATS.CSV, dateRange } = req.body;

    if (!type) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: API_ERROR_CODES.MISSING_PARAMS,
        message: 'Export type is required',
        processingTime
      });
    }

    // Create export job (placeholder - implement actual export logic)
    const exportData = {
      businessId: req.businessId,
      type,
      format,
      dateRange,
      status: EXPORT_STATUS.PENDING,
      createdAt: new Date()
    };

    // NOTE: Full export functionality not yet implemented
    // Future: Create DataExport model and implement background job processing
    // 1. Save export request to DataExport collection
    // 2. Queue background job to generate file
    // 3. Store file in exports/ directory or cloud storage
    // 4. Send notification when ready
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: 'Export job created',
        export: exportData
      },
      message: SUCCESS_MESSAGES.EXPORT_CREATED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Export analytics error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.EXPORT_ERROR,
      processingTime
    });
  }
};

// ============================================================================
// CACHE MANAGEMENT
// Replaces: DELETE /official/cache
// ============================================================================

/**
 * DELETE /cache - Clear analytics cache
 * @query {string} source - Cache source to clear
 * @query {string} type - Cache type to clear
 */
exports.clearCache = async (req, res) => {
  const startTime = Date.now();
  try {
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      error: 'Cache functionality not available',
      message: ERROR_MESSAGES.CACHE_NOT_AVAILABLE,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error clearing cache', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.CACHE_ERROR,
      message: error.message,
      processingTime
    });
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function transformConversationAnalytics(apiData) {
  if (!apiData || !apiData.data) {
    return {
      conversationVolume: [],
      categoryBreakdown: {},
      directionBreakdown: {},
      totalConversations: 0,
      totalCost: 0
    };
  }

  const conversationVolume = [];
  const categoryBreakdown = {};
  const directionBreakdown = {};
  let totalConversations = 0;
  let totalCost = 0;

  apiData.data.forEach(dataset => {
    const category = dataset.conversation_category;
    const direction = dataset.conversation_direction;

    dataset.data_points.forEach(point => {
      const date = new Date(point.start * 1000).toISOString().split('T')[0];
      const conversations = point.conversation || 0;
      const cost = point.cost || 0;

      conversationVolume.push({
        date,
        conversations,
        cost,
        category,
        direction
      });

      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + conversations;
      directionBreakdown[direction] = (directionBreakdown[direction] || 0) + conversations;
      totalConversations += conversations;
      totalCost += cost;
    });
  });

  return {
    conversationVolume,
    categoryBreakdown,
    directionBreakdown,
    totalConversations,
    totalCost
  };
}

function transformMessageAnalytics(apiData) {
  if (!apiData || !apiData.data) {
    return {
      messageVolume: [],
      typeBreakdown: {},
      totalMessages: 0
    };
  }

  const messageVolume = [];
  const typeBreakdown = {};
  let totalMessages = 0;

  apiData.data.forEach(dataset => {
    const messageType = dataset.message_type;

    dataset.data_points.forEach(point => {
      const date = new Date(point.start * 1000).toISOString().split('T')[0];
      const messages = point.sent || 0;

      messageVolume.push({
        date,
        messages,
        messageType
      });

      typeBreakdown[messageType] = (typeBreakdown[messageType] || 0) + messages;
      totalMessages += messages;
    });
  });

  return {
    messageVolume,
    typeBreakdown,
    totalMessages
  };
}


