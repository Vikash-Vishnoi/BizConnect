const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Campaign = require('../models/Campaign');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const { auth } = require('../middleware/auth');

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics summary
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Get summary from Analytics collection
    const summary = await Analytics.getSummary(req.userId, start, end);

    // Get real-time counts
    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalTemplates,
      approvedTemplates,
      totalConversations,
      activeConversations,
      totalMessages
    ] = await Promise.all([
      Campaign.countDocuments({ userId: req.userId }),
      Campaign.countDocuments({ userId: req.userId, status: 'active' }),
      Campaign.countDocuments({ userId: req.userId, status: 'completed' }),
      Template.countDocuments({ userId: req.userId }),
      Template.countDocuments({ userId: req.userId, status: 'approved' }),
      Conversation.countDocuments({ userId: req.userId }),
      Conversation.countDocuments({ userId: req.userId, status: 'active' }),
      Message.countDocuments({ userId: req.userId })
    ]);

    // Calculate growth rates (compare with previous period)
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousSummary = await Analytics.getSummary(req.userId, previousStart, start);

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
router.get('/daily', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await Analytics.find({
      userId: req.userId,
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
router.get('/campaigns', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      userId: req.userId,
      status: { $in: ['completed', 'active'] }
    })
    .select('name status stats createdAt completedAt')
    .sort({ createdAt: -1 })
    .limit(10);

    const campaignStats = campaigns.map(campaign => ({
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      stats: campaign.stats,
      deliveryRate: campaign.stats.total > 0 
        ? Math.round((campaign.stats.delivered / campaign.stats.total) * 100)
        : 0,
      readRate: campaign.stats.total > 0
        ? Math.round((campaign.stats.read / campaign.stats.total) * 100)
        : 0,
      failureRate: campaign.stats.total > 0
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
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await Template.find({
      userId: req.userId,
      status: 'approved'
    })
    .select('name category usage')
    .sort({ 'usage.messagesSent': -1 })
    .limit(10);

    res.json({ templates });
  } catch (error) {
    console.error('Get template analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch template analytics' });
  }
});

// @route   GET /api/analytics/conversations
// @desc    Get conversation analytics
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const [
      totalConversations,
      activeConversations,
      archivedConversations,
      avgMessagesPerConversation
    ] = await Promise.all([
      Conversation.countDocuments({ userId: req.userId }),
      Conversation.countDocuments({ userId: req.userId, status: 'active' }),
      Conversation.countDocuments({ userId: req.userId, status: 'archived' }),
      Message.aggregate([
        { $match: { userId: req.userId } },
        { $group: {
          _id: '$conversationId',
          count: { $sum: 1 }
        }},
        { $group: {
          _id: null,
          avgMessages: { $avg: '$count' }
        }}
      ])
    ]);

    // Get response rate
    const incomingCount = await Message.countDocuments({
      userId: req.userId,
      direction: 'incoming'
    });

    const outgoingCount = await Message.countDocuments({
      userId: req.userId,
      direction: 'outgoing'
    });

    const responseRate = incomingCount > 0
      ? Math.round((outgoingCount / incomingCount) * 100)
      : 0;

    res.json({
      totalConversations,
      activeConversations,
      archivedConversations,
      avgMessagesPerConversation: Math.round(avgMessagesPerConversation[0]?.avgMessages || 0),
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
router.post('/update', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's statistics
    const todayStats = await Message.aggregate([
      {
        $match: {
          userId: req.userId,
          timestamp: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          sent: {
            $sum: {
              $cond: [
                { $in: ['$status', ['sent', 'delivered', 'read']] },
                1,
                0
              ]
            }
          },
          delivered: {
            $sum: {
              $cond: [
                { $in: ['$status', ['delivered', 'read']] },
                1,
                0
              ]
            }
          },
          read: {
            $sum: {
              $cond: [{ $eq: ['$status', 'read'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const stats = todayStats[0] || { sent: 0, delivered: 0, read: 0, failed: 0 };

    // Get campaign stats
    const [activeCampaigns, completedCampaigns] = await Promise.all([
      Campaign.countDocuments({
        userId: req.userId,
        status: 'active',
        startedAt: { $gte: today }
      }),
      Campaign.countDocuments({
        userId: req.userId,
        status: 'completed',
        completedAt: { $gte: today }
      })
    ]);

    // Get conversation stats
    const [activeConversations, newConversations] = await Promise.all([
      Conversation.countDocuments({
        userId: req.userId,
        status: 'active'
      }),
      Conversation.countDocuments({
        userId: req.userId,
        createdAt: { $gte: today }
      })
    ]);

    // Get template stats
    const [templatesCreated, templatesApproved] = await Promise.all([
      Template.countDocuments({
        userId: req.userId,
        createdAt: { $gte: today }
      }),
      Template.countDocuments({
        userId: req.userId,
        status: 'approved',
        updatedAt: { $gte: today }
      })
    ]);

    // Update or create analytics document
    await Analytics.findOneAndUpdate(
      {
        userId: req.userId,
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
router.get('/recent-activity', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent campaigns, messages, and conversations
    const [recentCampaigns, recentMessages, recentConversations] = await Promise.all([
      Campaign.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('name status createdAt'),
      Message.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('status createdAt'),
      Conversation.find({ userId: req.userId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select('customerName status updatedAt')
    ]);

    // Format activities
    const activities = [];

    // Add campaigns
    recentCampaigns.forEach(campaign => {
      activities.push({
        id: campaign._id,
        type: 'campaign',
        title: `Campaign "${campaign.name}" ${campaign.status}`,
        description: `Campaign status: ${campaign.status}`,
        timestamp: campaign.createdAt,
        icon: '📢',
        iconColor: '#8B5CF6'
      });
    });

    // Add messages
    recentMessages.forEach(message => {
      activities.push({
        id: message._id,
        type: 'message',
        title: `Message ${message.status}`,
        description: `Message status: ${message.status}`,
        timestamp: message.createdAt,
        icon: '💬',
        iconColor: '#10B981'
      });
    });

    // Add conversations
    recentConversations.forEach(conversation => {
      activities.push({
        id: conversation._id,
        type: 'conversation',
        title: `Conversation with ${conversation.customerName || 'Unknown'}`,
        description: `Status: ${conversation.status}`,
        timestamp: conversation.updatedAt,
        icon: '👤',
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
router.get('/quality', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.userId });
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
    const templates = await Template.find({ userId: req.userId });
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
router.get('/trends', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const messages = await Message.find({
      userId: req.userId,
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });

    // Group by date
    const trendsMap = new Map();
    messages.forEach(msg => {
      const date = msg.createdAt.toISOString().split('T')[0];
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
router.get('/status-distribution', auth, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.userId });
    
    const distribution = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    messages.forEach(msg => {
      if (distribution.hasOwnProperty(msg.status)) {
        distribution[msg.status]++;
      }
    });

    const total = messages.length || 1;
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
router.get('/campaign-performance', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.userId };
    
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

module.exports = router;
