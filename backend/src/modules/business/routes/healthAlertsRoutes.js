/**
 * Health Alerts Routes - Alerts, metrics, and limits
 * @module routes/phoneHealth/healthAlertsRoutes
 */

const express = require('express');
const router = express.Router();
const { AlertLog, Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const { NotFoundError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');

// ============================================================================
// CONSTANTS
// ============================================================================

// Alert Types
const ALERT_TYPE_PHONE_HEALTH = 'PHONE_HEALTH';
const ALERT_TYPE_QUALITY_RATING = 'QUALITY_RATING';

// Alert Status
const ALERT_STATUS_ACKNOWLEDGED = 'ACKNOWLEDGED';

// Quality Ratings
const QUALITY_RATING_GREEN = 'GREEN';
const QUALITY_RATING_YELLOW = 'YELLOW';
const QUALITY_RATING_RED = 'RED';
const QUALITY_RATING_UNKNOWN = 'UNKNOWN';

// Quality Score Thresholds
const QUALITY_SCORE_THRESHOLD_RED = 50;
const QUALITY_SCORE_THRESHOLD_YELLOW = 80;
const QUALITY_SCORE_DEFAULT = 100;

// Rating Values for Calculation
const RATING_VALUE_GREEN = 100;
const RATING_VALUE_YELLOW = 50;
const RATING_VALUE_RED = 0;

// History Limits
const RECENT_HISTORY_LIMIT_WEEKLY = 7;
const RECENT_HISTORY_LIMIT_TREND = 10;
const RECENT_ALERTS_LIMIT = 5;

// Time Periods
const DAYS_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const RECENT_ALERTS_DAYS = 30;

// Default Values
const DEFAULT_CURRENT_LIMIT = 1000;

// Priority Levels
const PRIORITY_CRITICAL = 'CRITICAL';
const PRIORITY_HIGH = 'HIGH';
const PRIORITY_MEDIUM = 'MEDIUM';
const PRIORITY_LOW = 'LOW';

// Trend Values
const TREND_DECREASING = 'DECREASING';
const TREND_STABLE = 'STABLE';

// Risk Levels
const RISK_LEVEL_CRITICAL = 'CRITICAL - Account suspension risk';
const RISK_LEVEL_MODERATE = 'MODERATE - Requires attention';
const RISK_LEVEL_LOW = 'LOW - Excellent standing';

// Improvement Estimates
const IMPROVEMENT_RED_TO_YELLOW_DAYS = '7-14 days with immediate action';
const IMPROVEMENT_RED_TO_GREEN_DAYS = '21-30 days with consistent improvements';
const IMPROVEMENT_YELLOW_TO_GREEN_DAYS = '7-14 days with consistent improvements';

// ============================================================================
// ROUTES
// ============================================================================
 
// GET /alerts - Get health-related alerts
router.get('/alerts', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const alerts = await AlertLog.find({
      businessId: req.businessId,
      type: ALERT_TYPE_PHONE_HEALTH
    }).sort({ createdAt: -1 });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: alerts.length,
        alerts
      },
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError) throw error;
    throw new Error('Failed to process request');
  }
});

// PATCH /alerts/:alertId/acknowledge - Acknowledge health alert
router.patch('/alerts/:alertId/acknowledge', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const alert = await AlertLog.findOne({
      _id: req.params.alertId,
      businessId: req.businessId
    });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    alert.status = ALERT_STATUS_ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user.id;

    await alert.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { alert },
      message: 'Alert acknowledged',
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError) throw error;
    throw new Error('Failed to process request');
  }
});

// GET /metrics - Get health metrics
router.get('/metrics', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.businessId);
    const qualityHistory = business.phoneNumberQuality?.qualityHistory || [];
    const recentHistory = qualityHistory.slice(-RECENT_HISTORY_LIMIT_WEEKLY);

    const metrics = {
      averageQualityRating: recentHistory.length > 0 
        ? recentHistory.reduce((sum, h) => sum + (h.rating === QUALITY_RATING_GREEN ? RATING_VALUE_GREEN : h.rating === QUALITY_RATING_YELLOW ? RATING_VALUE_YELLOW : RATING_VALUE_RED), 0) / recentHistory.length
        : null,
      healthTrend: recentHistory.length > 1 ? TREND_STABLE : null,
      recentChecks: recentHistory.length
    };

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { metrics },
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError) throw error;
    throw new Error('Failed to process request');
  }
});

// POST /metrics/update - Update health metrics
router.post('/metrics/update', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.businessId);
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    const healthData = await whatsappService.checkPhoneHealth(business);

    await business.updatePhoneQuality({
      qualityRating: healthData.qualityRating,
      messagingLimitTier: healthData.messagingLimit,
      currentLimit: healthData.currentLimit || DEFAULT_CURRENT_LIMIT
    });

    await business.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'Metrics updated successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError) throw error;
    throw new Error('Failed to process request');
  }
});

// GET /limits - Get messaging limits
router.get('/limits', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.businessId);
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    const limits = await whatsappService.getMessagingLimits(business);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { limits },
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError) throw error;
    throw new Error('Failed to process request');
  }
});

// POST /quality/improve - Get suggestions to improve quality rating
router.post('/quality/improve', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.businessId);

    const currentRating = business.health?.qualityRating || QUALITY_RATING_UNKNOWN;
    const qualityScore = business.health?.qualityScore || QUALITY_SCORE_DEFAULT;
    const qualityHistory = business.health?.qualityHistory || [];

    // Analyze quality trends
    const recentHistory = qualityHistory.slice(-RECENT_HISTORY_LIMIT_TREND);
    const isDecreasing = recentHistory.length >= 2 && 
      recentHistory[recentHistory.length - 1].score < recentHistory[recentHistory.length - 2].score;

    // Generate personalized suggestions based on rating
    const suggestions = {
      currentRating,
      qualityScore,
      trend: isDecreasing ? TREND_DECREASING : TREND_STABLE,
      recommendations: [],
      immediateActions: [],
      preventiveMeasures: [],
      estimatedImpact: {}
    };

    // Rating-specific recommendations
    if (currentRating === QUALITY_RATING_RED || qualityScore < QUALITY_SCORE_THRESHOLD_RED) {
      suggestions.recommendations = [
        {
          priority: PRIORITY_CRITICAL,
          title: 'Reduce Message Volume Immediately',
          description: 'Your quality rating is in RED zone. Pause non-essential campaigns to prevent account suspension.',
          action: 'Pause all marketing campaigns and send only critical transactional messages',
          estimatedImprovement: '20-30 points within 7 days'
        },
        {
          priority: PRIORITY_CRITICAL,
          title: 'Review Recent Blocked Messages',
          description: 'Check which messages were blocked and identify patterns.',
          action: 'Go to Message Errors > Filter by "Blocked" status',
          estimatedImprovement: 'Identify root cause'
        },
        {
          priority: PRIORITY_HIGH,
          title: 'Verify Contact Consent',
          description: 'Ensure all contacts have explicitly opted in to receive messages.',
          action: 'Review opt-in records and remove contacts without clear consent',
          estimatedImprovement: '10-15 points within 14 days'
        },
        {
          priority: PRIORITY_HIGH,
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
        daysToYellow: IMPROVEMENT_RED_TO_YELLOW_DAYS,
        daysToGreen: IMPROVEMENT_RED_TO_GREEN_DAYS,
        riskLevel: RISK_LEVEL_CRITICAL
      };

    } else if (currentRating === QUALITY_RATING_YELLOW || qualityScore < QUALITY_SCORE_THRESHOLD_YELLOW) {
      suggestions.recommendations = [
        {
          priority: PRIORITY_HIGH,
          title: 'Improve Response Rate',
          description: 'Low customer response rates negatively impact quality scores.',
          action: 'Send more engaging content and use interactive messages',
          estimatedImprovement: '5-10 points within 7 days'
        },
        {
          priority: PRIORITY_HIGH,
          title: 'Reduce Block Rate',
          description: 'Users are blocking your number. Review message relevance and frequency.',
          action: 'Implement frequency capping (max 1 message per day per contact)',
          estimatedImprovement: '8-12 points within 14 days'
        },
        {
          priority: PRIORITY_MEDIUM,
          title: 'Monitor Opt-Out Keywords',
          description: 'High opt-out rates indicate message quality issues.',
          action: 'Review recent opt-outs and identify common patterns',
          estimatedImprovement: '5-8 points within 7 days'
        },
        {
          priority: PRIORITY_MEDIUM,
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
        daysToGreen: IMPROVEMENT_YELLOW_TO_GREEN_DAYS,
        riskLevel: RISK_LEVEL_MODERATE
      };

    } else if (currentRating === QUALITY_RATING_GREEN) {
      suggestions.recommendations = [
        {
          priority: PRIORITY_LOW,
          title: 'Maintain Best Practices',
          description: 'Your quality rating is excellent. Continue following best practices.',
          action: 'Monitor daily for any sudden changes',
          estimatedImprovement: 'Maintain current rating'
        },
        {
          priority: PRIORITY_LOW,
          title: 'Expand Messaging Tier',
          description: 'With GREEN rating, you may be eligible for tier upgrade.',
          action: 'Check tier upgrade eligibility in Messaging Limits',
          estimatedImprovement: 'Increase daily message limits'
        },
        {
          priority: PRIORITY_LOW,
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
        riskLevel: RISK_LEVEL_LOW,
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
      type: ALERT_TYPE_QUALITY_RATING,
      createdAt: { $gte: new Date(Date.now() - RECENT_ALERTS_DAYS * DAYS_IN_MILLISECONDS) }
    }).sort({ createdAt: -1 }).limit(RECENT_ALERTS_LIMIT);

    suggestions.recentEvents = recentAlerts.map(alert => ({
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.createdAt
    }));

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { suggestions },
      processingTime
    });
  } catch (error) {
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime: Date.now() - startTime
    });
    if (error instanceof NotFoundError) throw error;
    throw new Error('Failed to process request');
  }
});

module.exports = router;
