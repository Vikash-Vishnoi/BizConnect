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
router.get('/', async (req, res) => {
  try {
    const { view = 'dashboard', startDate, endDate, range, period = '30' } = req.query;
    
    // Handle date range
    let start, end;
    if (range === '7days') {
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      end = new Date();
    } else if (range === '30days') {
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      end = new Date();
    } else if (range === '90days') {
      start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      end = new Date();
    } else if (view === 'summary') {
      const days = parseInt(period);
      start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      end = new Date();
    } else {
      start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      end = endDate ? new Date(endDate) : new Date();
    }

    // For summary view, return simplified data
    if (view === 'summary') {
      const summary = await Analytics.getSummary(req.businessId, start, end);
      return res.json({ 
        summary, 
        period: parseInt(period),
        dateRange: { startDate: start, endDate: end }
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
      Campaign.countDocuments({ businessId: req.businessId, status: 'active' }),
      Campaign.countDocuments({ businessId: req.businessId, status: 'completed' }),
      Template.countDocuments({ businessId: req.businessId }),
      Template.countDocuments({ businessId: req.businessId, status: 'approved' }),
      Conversation.countDocuments({ businessId: req.businessId }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'active' })
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
      { $limit: 10 }
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
      .limit(10)
      .select('name status createdAt totalSent');

    const recentTemplates = await Template.find({ 
      businessId: req.businessId,
      status: 'approved'
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name status updatedAt');

    const activities = [];
    recentCampaigns.forEach(campaign => {
      activities.push({
        _id: campaign._id,
        type: campaign.status === 'active' ? 'campaign_sent' : 'campaign_created',
        description: `Campaign "${campaign.name}" ${campaign.status === 'active' ? 'is active' : 'was created'}`,
        timestamp: campaign.createdAt
      });
    });

    recentTemplates.forEach(template => {
      activities.push({
        _id: template._id,
        type: 'template_approved',
        description: `Template "${template.name}" was approved`,
        timestamp: template.updatedAt
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
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
      recentActivity: activities.slice(0, 10),
      dateRange: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

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
router.get('/timeseries', async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    if (period === 'distribution') {
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

      return res.json({ 
        period: 'distribution',
        data: statusDistribution 
      });
    }

    if (period === 'trends') {
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
        if (msg.status === 'sent') trend.sent++;
        else if (msg.status === 'delivered') trend.delivered++;
        else if (msg.status === 'read') trend.read++;
        else if (msg.status === 'failed') trend.failed++;
      });

      const trends = Array.from(trendsMap.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      }));

      return res.json({ 
        period: 'trends',
        data: trends 
      });
    }

    // Default: daily analytics
    const analytics = await Analytics.find({
      businessId: req.businessId,
      date: { $gte: start, $lte: end },
      campaignId: null
    }).sort({ date: 1 });

    res.json({ 
      period,
      data: analytics 
    });
  } catch (error) {
    console.error('Get timeseries analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch timeseries analytics' });
  }
});

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
router.get('/conversations', async (req, res) => {
  try {
    const { official = 'false', start, end, granularity = 'DAILY', useCache = 'true' } = req.query;

    // If official=true, fetch from WhatsApp Graph API
    if (official === 'true') {
      if (!start || !end) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'start and end timestamps are required for official API'
        });
      }

      const startDate = new Date(parseInt(start) * 1000);
      const endDate = new Date(parseInt(end) * 1000);

      // Get business WABA and access token
      const business = await Business.findById(req.businessId);
      if (!business.waba?.id || !business.accessToken) {
        return res.status(400).json({
          error: 'WABA not configured',
          message: 'WhatsApp Business Account ID and access token are required. Please complete embedded signup.'
        });
      }

      // Fetch from Graph API
      console.log('📊 Fetching conversation analytics from WhatsApp API...');
      const analyticsData = await getConversationAnalytics(
        business.waba.id, 
        { start: parseInt(start), end: parseInt(end), granularity }, 
        business.accessToken
      );

      // Transform data
      const transformedData = transformConversationAnalytics(analyticsData);

      res.json(transformedData);
    }

    // Otherwise, return local conversation analytics
    const [
      totalConversations,
      activeConversations,
      archivedConversations
    ] = await Promise.all([
      Conversation.countDocuments({ businessId: req.businessId }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'active' }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'archived' })
    ]);

    const conversations = await Conversation.find({ businessId: req.businessId }, 'messages');
    
    let totalMessagesCount = 0;
    let incomingCount = 0;
    let outgoingCount = 0;

    conversations.forEach(conv => {
      if (conv.messages) {
        totalMessagesCount += conv.messages.length;
        incomingCount += conv.messages.filter(m => m.direction === 'incoming').length;
        outgoingCount += conv.messages.filter(m => m.direction === 'outgoing').length;
      }
    });

    const avgMessagesPerConversation = conversations.length > 0 
      ? Math.round(totalMessagesCount / conversations.length) 
      : 0;

    const responseRate = incomingCount > 0 
      ? Math.round((outgoingCount / incomingCount) * 100) 
      : 0;

    res.json({
      totalConversations,
      activeConversations,
      archivedConversations,
      avgMessagesPerConversation,
      responseRate,
      incomingMessages: incomingCount,
      outgoingMessages: outgoingCount
    });
  } catch (error) {
    console.error('Get conversation analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation analytics' });
  }
});

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
router.get('/messages', async (req, res) => {
  try {
    const { start, end, granularity = 'DAILY' } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'start and end timestamps are required'
      });
    }

    const startDate = new Date(parseInt(start) * 1000);
    const endDate = new Date(parseInt(end) * 1000);

    // Get business WABA and access token
    const business = await Business.findById(req.businessId);
    if (!business.waba?.id || !business.accessToken) {
      return res.status(400).json({
        error: 'WABA not configured',
        message: 'WhatsApp Business Account ID and access token are required.'
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

    res.json(transformedData);
  } catch (error) {
    console.error('❌ Error fetching message analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch message analytics',
      message: error.message
    });
  }
});

// ============================================================================
// CAMPAIGN ANALYTICS
// Keeps: /campaigns (from reportRoutes + performanceRoutes campaign-performance)
// ============================================================================

/**
 * GET /campaigns - Campaign performance analytics
 * @query {string} startDate - Start date
 * @query {string} endDate - End date
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { businessId: req.businessId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      query.status = { $in: ['completed', 'active'] };
    }

    const campaigns = await Campaign.find(query)
      .select('name status stats createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(10);

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

    res.json({ campaigns: campaignStats });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// ============================================================================
// QUALITY SCORE
// Keeps: /quality (from performanceRoutes)
// ============================================================================

/**
 * GET /quality - Quality score and rating
 */
router.get('/quality', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ businessId: req.businessId });
    const totalCampaigns = campaigns.length;
    
    if (totalCampaigns === 0) {
      return res.json({
        score: 0,
        status: 'low',
        phoneNumberId: req.business?.whatsappConfig?.phoneNumberId || '',
        lastUpdated: new Date().toISOString(),
      });
    }

    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
    const totalRead = campaigns.reduce((sum, c) => sum + (c.stats?.read || 0), 0);
    
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const responseRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    
    const templates = await Template.find({ businessId: req.businessId });
    const approvedTemplates = templates.filter(t => t.status === 'approved').length;
    const templateQuality = templates.length > 0 ? Math.round((approvedTemplates / templates.length) * 100) : 0;
    
    const score = Math.round((deliveryRate * 0.4) + (responseRate * 0.3) + (templateQuality * 0.3));
    
    let status = 'low';
    if (score >= 80) status = 'high';
    else if (score >= 60) status = 'medium';

    res.json({
      score,
      status,
      phoneNumberId: req.business?.whatsappConfig?.phoneNumberId || '',
      lastUpdated: new Date().toISOString(),
      components: {
        deliveryRate,
        responseRate,
        templateQuality
      }
    });
  } catch (error) {
    console.error('Get quality score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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
router.post('/export', async (req, res) => {
  try {
    const { type, format = 'csv', dateRange } = req.body;

    if (!type) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Export type is required'
      });
    }

    // Create export job (placeholder - implement actual export logic)
    const exportData = {
      businessId: req.businessId,
      type,
      format,
      dateRange,
      status: 'pending',
      createdAt: new Date()
    };

    // NOTE: Full export functionality not yet implemented
    // Future: Create DataExport model and implement background job processing
    // 1. Save export request to DataExport collection
    // 2. Queue background job to generate file
    // 3. Store file in exports/ directory or cloud storage
    // 4. Send notification when ready
    res.json({
      success: true,
      message: 'Export job created',
      export: exportData
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

// ============================================================================
// CACHE MANAGEMENT
// Replaces: DELETE /official/cache
// ============================================================================

/**
 * DELETE /cache - Clear analytics cache
 * @query {string} source - Cache source to clear
 * @query {string} type - Cache type to clear
 */
router.delete('/cache', async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Cache functionality not available',
      message: 'AnalyticsCache model does not exist'
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

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

module.exports = router;
