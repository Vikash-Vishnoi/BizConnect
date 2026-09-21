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
});

