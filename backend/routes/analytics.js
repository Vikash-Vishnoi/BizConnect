const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Campaign = require('../models/Campaign');
// ✅ REMOVED: Message model no longer exists - using Conversation.messages
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');

// @route   GET /api/analytics/overview
// @desc    Get analytics overview (alias for dashboard)
// @access  Private
router.get('/overview', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  // Redirect to dashboard
  req.url = '/dashboard';
  router.handle(req, res);
});

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics summary
// @access  Private
router.get('/dashboard', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Get summary from Analytics collection
    const summary = await Analytics.getSummary(req.businessId, start, end);

    // Get real-time counts
    // ✅ FIXED: Calculate totalMessages from embedded messages in conversations
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

    // Calculate growth rates (compare with previous period)
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousSummary = await Analytics.getSummary(req.businessId, previousStart, start);

    const calculateGrowth = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
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
      dateRange: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// @route   GET /api/analytics/daily
// @desc    Get daily analytics data
// @access  Private
router.get('/daily', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await Analytics.find({
      businessId: req.businessId,
      date: { $gte: start, $lte: end },
      campaignId: null // Only daily aggregates
    }).sort({ date: 1 });

    res.json({ analytics });
  } catch (error) {
    console.error('Get daily analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

// @route   GET /api/analytics/campaigns
// @desc    Get campaign performance analytics
// @access  Private
router.get('/campaigns', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      businessId: req.businessId,
      status: { $in: ['completed', 'active'] }
    })
    .select('name status stats createdAt completedAt')
    .sort({ createdAt: -1 })
    .limit(10);

    const campaignStats = campaigns.map(campaign => ({
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      messagesSent: campaign.stats?.sent || campaign.stats?.total || 0,
      deliveryRate: campaign.stats?.total > 0 
        ? Math.round((campaign.stats.delivered / campaign.stats.total) * 100)
        : 0,
      readRate: campaign.stats?.total > 0
        ? Math.round((campaign.stats.read / campaign.stats.total) * 100)
        : 0,
      replyRate: campaign.stats?.total > 0
        ? Math.round(((campaign.stats.replied || 0) / campaign.stats.total) * 100)
        : 0,
      failureRate: campaign.stats?.total > 0
        ? Math.round((campaign.stats.failed / campaign.stats.total) * 100)
        : 0,
      createdAt: campaign.createdAt,
      completedAt: campaign.completedAt
    }));

    res.json({ campaigns: campaignStats });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// @route   GET /api/analytics/templates
// @desc    Get template usage analytics
// @access  Private
router.get('/templates', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const templates = await Template.find({ businessId: req.businessId })
      .select('name category status usage')
      .sort({ 'usage.messagesSent': -1 })
      .limit(20);

    res.json({ templates });
  } catch (error) {
    console.error('Get template analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch template analytics' });
  }
});

// @route   GET /api/analytics/conversations
// @desc    Get conversation analytics
// @access  Private
router.get('/conversations', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    // ✅ FIXED: Get analytics from embedded messages in conversations
    const [
      totalConversations,
      activeConversations,
      archivedConversations
    ] = await Promise.all([
      Conversation.countDocuments({ businessId: req.businessId }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'active' }),
      Conversation.countDocuments({ businessId: req.businessId, status: 'archived' })
    ]);

    // Calculate average messages per conversation and response rates from embedded messages
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

// @route   POST /api/analytics/update
// @desc    Update daily analytics (typically called by cron job)
// @access  Private
router.post('/update', auth, requireBusiness, requireBusinessPermission('manage_analytics'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ FIXED: Get today's statistics from embedded messages
    const conversations = await Conversation.find({
      businessId: req.businessId,
      'messages.timestamp': { $gte: today }
    }, 'messages');

    let sent = 0, delivered = 0, read = 0, failed = 0;

    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages
          .filter(m => m.timestamp >= today)
          .forEach(msg => {
            if (['sent', 'delivered', 'read'].includes(msg.status)) sent++;
            if (['delivered', 'read'].includes(msg.status)) delivered++;
            if (msg.status === 'read') read++;
            if (msg.status === 'failed') failed++;
          });
      }
    });

    const stats = { sent, delivered, read, failed };

    // Get campaign stats
    const [activeCampaigns, completedCampaigns] = await Promise.all([
      Campaign.countDocuments({
        businessId: req.businessId,
        status: 'active',
        startedAt: { $gte: today }
      }),
      Campaign.countDocuments({
        businessId: req.businessId,
        status: 'completed',
        completedAt: { $gte: today }
      })
    ]);

    // Get conversation stats
    const [activeConversations, newConversations] = await Promise.all([
      Conversation.countDocuments({
        businessId: req.businessId,
        status: 'active'
      }),
      Conversation.countDocuments({
        businessId: req.businessId,
        createdAt: { $gte: today }
      })
    ]);

    // Get template stats
    const [templatesCreated, templatesApproved] = await Promise.all([
      Template.countDocuments({
        businessId: req.businessId,
        createdAt: { $gte: today }
      }),
      Template.countDocuments({
        businessId: req.businessId,
        status: 'approved',
        updatedAt: { $gte: today }
      })
    ]);

    // Update or create analytics document
    await Analytics.findOneAndUpdate(
      {
        businessId: req.businessId,
        date: today,
        campaignId: null
      },
      {
        metrics: {
          messagesSent: stats.sent,
          messagesDelivered: stats.delivered,
          messagesRead: stats.read,
          messagesFailed: stats.failed,
          activeCampaigns,
          completedCampaigns,
          activeConversations,
          newConversations,
          templatesCreated,
          templatesApproved
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    res.json({ message: 'Analytics updated successfully' });
  } catch (error) {
    console.error('Update analytics error:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
});

// @route   GET /api/analytics/recent-activity
// @desc    Get recent activity feed
// @access  Private
router.get('/recent-activity', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent campaigns, conversations, and templates
    const [recentCampaigns, recentConversations, recentTemplates] = await Promise.all([
      Campaign.find({ businessId: req.businessId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name status updatedAt'),
      Conversation.find({ businessId: req.businessId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('contact messages updatedAt'),
      Template.find({ businessId: req.businessId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select('name status updatedAt')
    ]);

    // Format activities
    const activities = [];

    // Add recent messages from conversations
    recentConversations.forEach(conv => {
      if (conv.messages && conv.messages.length > 0) {
        const lastMessage = conv.messages[conv.messages.length - 1];
        const displayName = conv.contact?.name || conv.contact?.phoneNumber || 'Unknown';
        activities.push({
          id: `msg-${conv._id}-${lastMessage._id}`,
          type: 'message',
          title: displayName,
          description: `Message ${lastMessage.direction === 'outgoing' ? 'sent' : 'received'}`,
          timestamp: lastMessage.timestamp || conv.updatedAt,
          icon: '💬',
          iconColor: '#10B981'
        });
      }
    });

    // Add campaigns
    recentCampaigns.forEach(campaign => {
      activities.push({
        id: `campaign-${campaign._id}`,
        type: 'campaign',
        title: campaign.name,
        description: `Campaign ${campaign.status}`,
        timestamp: campaign.updatedAt,
        icon: '🎯',
        iconColor: '#8B5CF6'
      });
    });

    // Add templates
    recentTemplates.forEach(template => {
      activities.push({
        id: `template-${template._id}`,
        type: 'template',
        title: template.name,
        description: `Template ${template.status}`,
        timestamp: template.updatedAt,
        icon: '📄',
        iconColor: '#3B82F6'
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json(limitedActivities);
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// @route   GET /api/analytics/quality
// @desc    Get quality score analytics
// @access  Private
router.get('/quality', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({ businessId: req.businessId });
    const totalCampaigns = campaigns.length;
    
    if (totalCampaigns === 0) {
      return res.json({
        score: 0,
        status: 'low',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        lastUpdated: new Date().toISOString(),
      });
    }

    // Calculate metrics
    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
    const totalRead = campaigns.reduce((sum, c) => sum + (c.stats?.read || 0), 0);
    
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const responseRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    
    // Get template quality
    const templates = await Template.find({ businessId: req.businessId });
    const approvedTemplates = templates.filter(t => t.status === 'approved').length;
    const templateQuality = templates.length > 0 ? Math.round((approvedTemplates / templates.length) * 100) : 0;
    
    // Calculate overall score (weighted average)
    const score = Math.round((deliveryRate * 0.4) + (responseRate * 0.3) + (templateQuality * 0.3));
    
    // Determine status based on score
    let status = 'low';
    if (score >= 80) status = 'high';
    else if (score >= 60) status = 'medium';

    res.json({
      score,
      status,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get quality score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get message trends
// @access  Private
router.get('/trends', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // ✅ FIXED: Get messages from embedded conversation messages
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

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // Group by date
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

    res.json(trends);
  } catch (error) {
    console.error('Get message trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analytics/status-distribution
// @desc    Get message status distribution
// @access  Private
router.get('/status-distribution', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    // ✅ FIXED: Get messages from embedded conversation messages
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

    res.json(statusDistribution);
  } catch (error) {
    console.error('Get status distribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analytics/campaign-performance
// @desc    Get campaign performance metrics
// @access  Private
router.get('/campaign-performance', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { businessId: req.businessId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 }).limit(10);
    
    const performance = campaigns.map(campaign => {
      const total = campaign.stats?.total || 0;
      const delivered = campaign.stats?.delivered || 0;
      const read = campaign.stats?.read || 0;
      
      return {
        name: campaign.name,
        sent: campaign.stats?.sent || 0,
        delivered,
        read,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      };
    });

    res.json(performance);
  } catch (error) {
    console.error('Get campaign performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analytics/conversation-categories
// @desc    Get conversation analytics by category with cost estimation (FEATURE 18)
// @access  Private
router.get('/conversation-categories', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { startDate, endDate, period = '30d' } = req.query;

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : (() => {
      const date = new Date();
      if (period === '7d') date.setDate(date.getDate() - 7);
      else if (period === '30d') date.setDate(date.getDate() - 30);
      else if (period === '90d') date.setDate(date.getDate() - 90);
      return date;
    })();

    // Get all conversations with messages in date range
    const conversations = await Conversation.find({
      businessId: req.businessId,
      'messages.timestamp': { $gte: start, $lte: end }
    }, 'messages contactName contactPhone tags');

    // WhatsApp Conversation Pricing (as of 2024)
    const conversationPricing = {
      service: 0.0095,        // $0.0095 per service conversation
      utility: 0.0042,        // $0.0042 per utility conversation
      authentication: 0.0028, // $0.0028 per authentication conversation
      marketing: 0.0160       // $0.0160 per marketing conversation (highest)
    };

    // Initialize category stats
    const categoryStats = {
      service: { count: 0, messages: 0, cost: 0, description: 'Customer support and service' },
      utility: { count: 0, messages: 0, cost: 0, description: 'Transactional updates and notifications' },
      authentication: { count: 0, messages: 0, cost: 0, description: 'OTP and verification codes' },
      marketing: { count: 0, messages: 0, cost: 0, description: 'Promotional messages and campaigns' }
    };

    // Analyze each conversation
    conversations.forEach(conv => {
      if (!conv.messages || conv.messages.length === 0) return;

      // Filter messages in date range
      const messagesInRange = conv.messages.filter(
        m => m.timestamp >= start && m.timestamp <= end
      );

      if (messagesInRange.length === 0) return;

      // Determine conversation category based on message patterns and tags
      const category = categorizeConversation(conv, messagesInRange);

      // Count business-initiated conversations (outgoing messages)
      const businessInitiated = messagesInRange.some(m => m.direction === 'outgoing');
      
      if (businessInitiated) {
        categoryStats[category].count += 1;
        categoryStats[category].messages += messagesInRange.length;
        categoryStats[category].cost += conversationPricing[category];
      }
    });

    // Calculate totals
    const totalConversations = Object.values(categoryStats).reduce((sum, cat) => sum + cat.count, 0);
    const totalMessages = Object.values(categoryStats).reduce((sum, cat) => sum + cat.messages, 0);
    const totalCost = Object.values(categoryStats).reduce((sum, cat) => sum + cat.cost, 0);

    // Calculate percentages
    const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      ...stats,
      percentage: totalConversations > 0 ? Math.round((stats.count / totalConversations) * 100) : 0,
      avgMessagesPerConversation: stats.count > 0 ? Math.round(stats.messages / stats.count) : 0
    }));

    res.json({
      summary: {
        totalConversations,
        totalMessages,
        totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
        period,
        startDate: start,
        endDate: end
      },
      categories: categoryBreakdown,
      pricing: conversationPricing
    });
  } catch (error) {
    console.error('Get conversation categories error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation category analytics' });
  }
});

/**
 * Helper function to categorize conversation based on content and patterns
 */
function categorizeConversation(conversation, messages) {
  const tags = conversation.tags || [];
  const content = messages.map(m => m.content?.text?.body || '').join(' ').toLowerCase();

  // Check tags first
  if (tags.includes('support') || tags.includes('service')) return 'service';
  if (tags.includes('marketing') || tags.includes('campaign')) return 'marketing';
  if (tags.includes('otp') || tags.includes('verification')) return 'authentication';
  if (tags.includes('order') || tags.includes('notification')) return 'utility';

  // Check content patterns for authentication
  if (/\b\d{4,6}\b/.test(content) || // OTP codes
      /verification|verify|otp|code|authenticate/i.test(content)) {
    return 'authentication';
  }

  // Check content patterns for utility
  if (/order|delivery|shipping|tracking|confirmation|receipt|invoice|appointment/i.test(content)) {
    return 'utility';
  }

  // Check content patterns for marketing
  if (/sale|discount|offer|promo|deal|limited|buy now|shop|special/i.test(content)) {
    return 'marketing';
  }

  // Default to service for customer support conversations
  return 'service';
}

// @route   GET /api/analytics/cost-breakdown
// @desc    Get detailed cost breakdown with daily/weekly trends
// @access  Private
router.get('/cost-breakdown', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const end = new Date();
    const start = new Date();
    if (period === '7d') start.setDate(start.getDate() - 7);
    else if (period === '30d') start.setDate(start.getDate() - 30);
    else if (period === '90d') start.setDate(start.getDate() - 90);

    // Get all conversations in range
    const conversations = await Conversation.find({
      businessId: req.businessId,
      'messages.timestamp': { $gte: start, $lte: end }
    }, 'messages createdAt');

    // Group by day
    const dailyCosts = {};
    const conversationPricing = {
      service: 0.0095,
      utility: 0.0042,
      authentication: 0.0028,
      marketing: 0.0160
    };

    conversations.forEach(conv => {
      if (!conv.messages || conv.messages.length === 0) return;

      const messagesInRange = conv.messages.filter(
        m => m.timestamp >= start && m.timestamp <= end
      );

      messagesInRange.forEach(msg => {
        if (msg.direction === 'outgoing') {
          const date = new Date(msg.timestamp).toISOString().split('T')[0];
          if (!dailyCosts[date]) {
            dailyCosts[date] = { date, service: 0, utility: 0, authentication: 0, marketing: 0, total: 0 };
          }

          // Simplified: assume service category for cost tracking
          const category = 'service';
          dailyCosts[date][category] += conversationPricing[category];
          dailyCosts[date].total += conversationPricing[category];
        }
      });
    });

    // Convert to sorted array
    const costTrend = Object.values(dailyCosts).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summary
    const totalCost = costTrend.reduce((sum, day) => sum + day.total, 0);
    const avgDailyCost = costTrend.length > 0 ? totalCost / costTrend.length : 0;

    res.json({
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        avgDailyCost: Math.round(avgDailyCost * 100) / 100,
        period,
        days: costTrend.length
      },
      trend: costTrend
    });
  } catch (error) {
    console.error('Get cost breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch cost breakdown' });
  }
});

module.exports = router;
