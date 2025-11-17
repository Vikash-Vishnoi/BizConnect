const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const TemplateAnalytics = require('../models/TemplateAnalytics');
const Template = require('../models/Template');

/**
 * @route   GET /api/template-analytics
 * @desc    Get analytics for all templates
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;
    
    const analytics = await TemplateAnalytics.find({
      userId: req.userId,
      period
    }).populate('templateId');
    
    const summary = analytics.map(a => a.getSummary());
    
    res.json({
      analytics: summary,
      count: summary.length
    });
  } catch (error) {
    console.error('Get all analytics error:', error);
    res.status(500).json({ error: 'Failed to get template analytics' });
  }
});

/**
 * @route   GET /api/template-analytics/overall
 * @desc    Get overall statistics across all templates
 * @access  Private
 */
router.get('/overall', auth, async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;
    
    const stats = await TemplateAnalytics.getOverallStats(req.userId, period);
    
    res.json(stats);
  } catch (error) {
    console.error('Get overall stats error:', error);
    res.status(500).json({ error: 'Failed to get overall statistics' });
  }
});

/**
 * @route   GET /api/template-analytics/top-performers
 * @desc    Get top performing templates
 * @access  Private
 */
router.get('/top-performers', auth, async (req, res) => {
  try {
    const { metric = 'engagementRate', limit = 10 } = req.query;
    
    const topPerformers = await TemplateAnalytics.getTopPerformers(
      req.userId,
      metric,
      parseInt(limit)
    );
    
    const formatted = topPerformers.map(a => ({
      id: a._id,
      templateId: a.templateId._id,
      templateName: a.templateName,
      template: a.templateId,
      metrics: a.metrics,
      rates: a.rates,
      lastUpdated: a.metadata.lastUpdated
    }));
    
    res.json({
      topPerformers: formatted,
      metric,
      count: formatted.length
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({ error: 'Failed to get top performers' });
  }
});

/**
 * @route   GET /api/template-analytics/template/:templateId
 * @desc    Get analytics for a specific template
 * @access  Private
 */
router.get('/template/:templateId', auth, async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;
    
    const analytics = await TemplateAnalytics.findOne({
      userId: req.userId,
      templateId: req.params.templateId,
      period
    }).populate('templateId');
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found for this template' });
    }
    
    const summary = analytics.getSummary();
    
    res.json({
      ...summary,
      campaigns: analytics.campaigns,
      costs: analytics.costs
    });
  } catch (error) {
    console.error('Get template analytics error:', error);
    res.status(500).json({ error: 'Failed to get template analytics' });
  }
});

/**
 * @route   GET /api/template-analytics/compare
 * @desc    Compare analytics for multiple templates
 * @access  Private
 */
router.get('/compare', auth, async (req, res) => {
  try {
    const { templateIds, period = 'all-time' } = req.query;
    
    if (!templateIds) {
      return res.status(400).json({ error: 'Template IDs are required' });
    }
    
    const ids = Array.isArray(templateIds) ? templateIds : templateIds.split(',');
    
    const comparison = await TemplateAnalytics.compareTemplates(
      req.userId,
      ids,
      period
    );
    
    res.json({
      comparison,
      count: comparison.length
    });
  } catch (error) {
    console.error('Compare templates error:', error);
    res.status(500).json({ error: 'Failed to compare templates' });
  }
});

/**
 * @route   POST /api/template-analytics/:templateId/track
 * @desc    Manually track an event for a template
 * @access  Private
 */
router.post('/:templateId/track', auth, async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Get template
    const template = await Template.findOne({
      _id: req.params.templateId,
      userId: req.userId
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Get or create analytics
    const analytics = await TemplateAnalytics.getOrCreateAnalytics(
      req.userId,
      template._id,
      template.name
    );
    
    // Track event
    const updateData = {};
    
    switch (event) {
      case 'sent':
        updateData.sent = 1;
        if (data?.recipientPhone) {
          updateData.recipientPhone = data.recipientPhone;
        }
        break;
        
      case 'delivered':
        updateData.delivered = 1;
        if (data?.deliveryTime) {
          updateData.deliveryTime = data.deliveryTime;
        }
        break;
        
      case 'read':
        updateData.read = 1;
        break;
        
      case 'replied':
        updateData.replied = 1;
        break;
        
      case 'clicked':
        updateData.clicked = 1;
        if (data?.buttonText) {
          updateData.buttonClick = data.buttonText;
        }
        if (data?.quickReply) {
          updateData.quickReplyClick = data.quickReply;
        }
        break;
        
      case 'failed':
        updateData.failed = 1;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid event type' });
    }
    
    await analytics.updateMetrics(updateData);
    
    res.json({
      message: 'Event tracked successfully',
      analytics: analytics.getSummary()
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * @route   GET /api/template-analytics/:templateId/button-performance
 * @desc    Get button/quick reply performance for a template
 * @access  Private
 */
router.get('/:templateId/button-performance', auth, async (req, res) => {
  try {
    const analytics = await TemplateAnalytics.findOne({
      userId: req.userId,
      templateId: req.params.templateId,
      period: 'all-time'
    });
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    
    res.json({
      buttons: analytics.getTopButtons(10),
      quickReplies: analytics.getTopQuickReplies(10),
      totalClicks: analytics.metrics.clicked
    });
  } catch (error) {
    console.error('Get button performance error:', error);
    res.status(500).json({ error: 'Failed to get button performance' });
  }
});

/**
 * @route   GET /api/template-analytics/:templateId/timing
 * @desc    Get timing analytics for a template
 * @access  Private
 */
router.get('/:templateId/timing', auth, async (req, res) => {
  try {
    const analytics = await TemplateAnalytics.findOne({
      userId: req.userId,
      templateId: req.params.templateId,
      period: 'all-time'
    });
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    
    res.json({
      timing: {
        averageDelivery: analytics.formatTime(analytics.timing.averageDeliveryTime),
        averageRead: analytics.formatTime(analytics.timing.averageReadTime),
        averageReply: analytics.formatTime(analytics.timing.averageReplyTime),
        fastestDelivery: analytics.formatTime(analytics.timing.fastestDelivery),
        slowestDelivery: analytics.formatTime(analytics.timing.slowestDelivery)
      },
      raw: analytics.timing
    });
  } catch (error) {
    console.error('Get timing analytics error:', error);
    res.status(500).json({ error: 'Failed to get timing analytics' });
  }
});

/**
 * @route   GET /api/template-analytics/:templateId/campaigns
 * @desc    Get campaign performance for a template
 * @access  Private
 */
router.get('/:templateId/campaigns', auth, async (req, res) => {
  try {
    const analytics = await TemplateAnalytics.findOne({
      userId: req.userId,
      templateId: req.params.templateId,
      period: 'all-time'
    }).populate('campaigns.campaignId');
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    
    const campaigns = analytics.campaigns.map(c => ({
      id: c.campaignId?._id,
      name: c.campaignName,
      sent: c.sent,
      delivered: c.delivered,
      read: c.read,
      deliveryRate: c.sent > 0 
        ? parseFloat(((c.delivered / c.sent) * 100).toFixed(2))
        : 0,
      readRate: c.delivered > 0
        ? parseFloat(((c.read / c.delivered) * 100).toFixed(2))
        : 0
    }));
    
    res.json({
      campaigns,
      totalCampaigns: campaigns.length
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to get campaign analytics' });
  }
});

/**
 * @route   DELETE /api/template-analytics/:templateId
 * @desc    Delete analytics for a template (admin/cleanup)
 * @access  Private
 */
router.delete('/:templateId', auth, async (req, res) => {
  try {
    const result = await TemplateAnalytics.deleteMany({
      userId: req.userId,
      templateId: req.params.templateId
    });
    
    res.json({
      message: 'Template analytics deleted',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete analytics error:', error);
    res.status(500).json({ error: 'Failed to delete analytics' });
  }
});

/**
 * @route   POST /api/template-analytics/:templateId/reset
 * @desc    Reset analytics for a template
 * @access  Private
 */
router.post('/:templateId/reset', auth, async (req, res) => {
  try {
    const analytics = await TemplateAnalytics.findOne({
      userId: req.userId,
      templateId: req.params.templateId,
      period: 'all-time'
    });
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    
    // Reset all metrics
    analytics.metrics = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      replied: 0,
      clicked: 0,
      buttonClicks: [],
      quickReplyClicks: []
    };
    
    analytics.rates = {
      deliveryRate: 0,
      readRate: 0,
      replyRate: 0,
      clickRate: 0,
      engagementRate: 0,
      failureRate: 0
    };
    
    analytics.timing = {
      averageDeliveryTime: 0,
      averageReadTime: 0,
      averageReplyTime: 0,
      fastestDelivery: 0,
      slowestDelivery: 0
    };
    
    analytics.campaigns = [];
    analytics.metadata.uniqueRecipients = [];
    analytics.metadata.totalRecipients = 0;
    analytics.metadata.lastUpdated = new Date();
    
    await analytics.save();
    
    res.json({
      message: 'Analytics reset successfully',
      analytics: analytics.getSummary()
    });
  } catch (error) {
    console.error('Reset analytics error:', error);
    res.status(500).json({ error: 'Failed to reset analytics' });
  }
});

module.exports = router;
