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

module.exports = router;
