/**
 * Health Alerts Routes - Alerts, metrics, and limits
 * @module routes/phoneHealth/healthAlertsRoutes
 */

const express = require('express');
const router = express.Router();
const { AlertLog, Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const whatsappService = new WhatsAppService();
 
// GET /alerts - Get health-related alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      type: 'PHONE_HEALTH'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error getting health alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get health alerts',
      error: error.message
    });
  }
});

// PATCH /alerts/:alertId/acknowledge - Acknowledge health alert
router.patch('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const alert = await AlertLog.findOne({
      _id: req.params.alertId,
      businessId: req.businessId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user.id;

    await alert.save();

    res.json({
      success: true,
      message: 'Alert acknowledged',
      alert
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
});

// GET /metrics - Get health metrics
router.get('/metrics', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    const qualityHistory = business.phoneNumberQuality?.qualityHistory || [];
    const recentHistory = qualityHistory.slice(-7);

    const metrics = {
      averageQualityRating: recentHistory.length > 0 
        ? recentHistory.reduce((sum, h) => sum + (h.rating === 'GREEN' ? 100 : h.rating === 'YELLOW' ? 50 : 0), 0) / recentHistory.length
        : null,
      healthTrend: recentHistory.length > 1 ? 'stable' : null,
      recentChecks: recentHistory.length
    };

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
      error: error.message
    });
  }
});

// POST /metrics/update - Update health metrics
router.post('/metrics/update', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    const healthData = await whatsappService.checkPhoneHealth(business);

    await business.updatePhoneQuality({
      qualityRating: healthData.qualityRating,
      messagingLimitTier: healthData.messagingLimit,
      currentLimit: healthData.currentLimit || 1000
    });

    await business.save();

    res.json({
      success: true,
      message: 'Metrics updated successfully'
    });
  } catch (error) {
    console.error('Error updating metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update metrics',
      error: error.message
    });
  }
});

// GET /limits - Get messaging limits
router.get('/limits', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    const limits = await whatsappService.getMessagingLimits(business);

    res.json({
      success: true,
      limits
    });
  } catch (error) {
    console.error('Error getting limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get limits',
      error: error.message
    });
  }
});

// POST /quality/improve - Get suggestions to improve quality rating
router.post('/quality/improve', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const currentRating = business.health?.qualityRating || 'UNKNOWN';
    const qualityScore = business.health?.qualityScore || 100;
    const qualityHistory = business.health?.qualityHistory || [];

    // Analyze quality trends
    const recentHistory = qualityHistory.slice(-10);
    const isDecreasing = recentHistory.length >= 2 && 
      recentHistory[recentHistory.length - 1].score < recentHistory[recentHistory.length - 2].score;

    // Generate personalized suggestions based on rating
    const suggestions = {
      currentRating,
      qualityScore,
      trend: isDecreasing ? 'DECREASING' : 'STABLE',
      recommendations: [],
      immediateActions: [],
      preventiveMeasures: [],
      estimatedImpact: {}
    };

    // Rating-specific recommendations
    if (currentRating === 'RED' || qualityScore < 50) {
      suggestions.recommendations = [
        {
          priority: 'CRITICAL',
          title: 'Reduce Message Volume Immediately',
          description: 'Your quality rating is in RED zone. Pause non-essential campaigns to prevent account suspension.',
          action: 'Pause all marketing campaigns and send only critical transactional messages',
          estimatedImprovement: '20-30 points within 7 days'
        },
        {
          priority: 'CRITICAL',
          title: 'Review Recent Blocked Messages',
          description: 'Check which messages were blocked and identify patterns.',
          action: 'Go to Message Errors > Filter by "Blocked" status',
          estimatedImprovement: 'Identify root cause'
        },
        {
          priority: 'HIGH',
          title: 'Verify Contact Consent',
          description: 'Ensure all contacts have explicitly opted in to receive messages.',
          action: 'Review opt-in records and remove contacts without clear consent',
          estimatedImprovement: '10-15 points within 14 days'
        },
        {
          priority: 'HIGH',
          title: 'Use Only Approved Templates',
          description: 'Stick to pre-approved templates to avoid policy violations.',
          action: 'Review and approve all templates before sending',
          estimatedImprovement: 'Prevent further degradation'
        }
      ];

      suggestions.immediateActions = [
        'Stop all active campaigns immediately',
        'Review and remove contacts who marked messages as spam',
        'Contact Meta support to understand specific issues',
        'Audit message content for policy violations'
      ];

      suggestions.estimatedImpact = {
        daysToYellow: '7-14 days with immediate action',
        daysToGreen: '21-30 days with consistent improvements',
        riskLevel: 'CRITICAL - Account suspension risk'
      };

    } else if (currentRating === 'YELLOW' || qualityScore < 80) {
      suggestions.recommendations = [
        {
          priority: 'HIGH',
          title: 'Improve Response Rate',
          description: 'Low customer response rates negatively impact quality scores.',
          action: 'Send more engaging content and use interactive messages',
          estimatedImprovement: '5-10 points within 7 days'
        },
        {
          priority: 'HIGH',
          title: 'Reduce Block Rate',
          description: 'Users are blocking your number. Review message relevance and frequency.',
          action: 'Implement frequency capping (max 1 message per day per contact)',
          estimatedImprovement: '8-12 points within 14 days'
        },
        {
          priority: 'MEDIUM',
          title: 'Monitor Opt-Out Keywords',
          description: 'High opt-out rates indicate message quality issues.',
          action: 'Review recent opt-outs and identify common patterns',
          estimatedImprovement: '5-8 points within 7 days'
        },
        {
          priority: 'MEDIUM',
          title: 'Verify Phone Number Quality',
          description: 'Sending to invalid numbers hurts quality score.',
          action: 'Enable phone number validation before sending',
          estimatedImprovement: '3-5 points within 7 days'
        }
      ];

      suggestions.immediateActions = [
        'Review and pause underperforming campaigns',
        'Implement opt-in re-confirmation for inactive contacts',
        'Add clear opt-out instructions to all messages',
        'Monitor message delivery rates daily'
      ];

      suggestions.estimatedImpact = {
        daysToGreen: '7-14 days with consistent improvements',
        riskLevel: 'MODERATE - Requires attention'
      };

    } else if (currentRating === 'GREEN') {
      suggestions.recommendations = [
        {
          priority: 'LOW',
          title: 'Maintain Best Practices',
          description: 'Your quality rating is excellent. Continue following best practices.',
          action: 'Monitor daily for any sudden changes',
          estimatedImprovement: 'Maintain current rating'
        },
        {
          priority: 'LOW',
          title: 'Expand Messaging Tier',
          description: 'With GREEN rating, you may be eligible for tier upgrade.',
          action: 'Check tier upgrade eligibility in Messaging Limits',
          estimatedImprovement: 'Increase daily message limits'
        },
        {
          priority: 'LOW',
          title: 'Optimize Engagement',
          description: 'High quality scores allow for more engagement opportunities.',
          action: 'Experiment with new template types (carousel, product messages)',
          estimatedImprovement: 'Improved customer engagement'
        }
      ];

      suggestions.preventiveMeasures = [
        'Continue monitoring opt-out rates',
        'Maintain clear opt-in processes',
        'Keep message content relevant and personalized',
        'Respond promptly to customer messages'
      ];

      suggestions.estimatedImpact = {
        riskLevel: 'LOW - Excellent standing',
        recommendation: 'Continue current practices'
      };
    }

    // Common best practices for all ratings
    suggestions.bestPractices = [
      'Always obtain explicit opt-in consent before messaging',
      'Send messages only during business hours (9 AM - 9 PM)',
      'Personalize messages with contact name and relevant content',
      'Respond to customer messages within 24 hours',
      'Use approved templates for all marketing messages',
      'Monitor and respect opt-out requests immediately',
      'Avoid sending duplicate or spam-like content',
      'Validate phone numbers before adding to contact list',
      'Track delivery rates and investigate failures',
      'Regularly clean your contact list (remove inactive numbers)'
    ];

    // Recent quality events
    const recentAlerts = await AlertLog.find({
      businessId: req.businessId,
      type: 'QUALITY_RATING',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(5);

    suggestions.recentEvents = recentAlerts.map(alert => ({
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.createdAt
    }));

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Error generating quality improvement suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate suggestions',
      error: error.message
    });
  }
});

module.exports = router;
