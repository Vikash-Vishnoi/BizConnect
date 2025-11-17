const express = require('express');
const router = express.Router();
const PhoneNumberHealth = require('../models/PhoneNumberHealth');
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

/**
 * Phone Number Health Routes
 * 
 * Monitor WhatsApp phone number quality rating, messaging limits, and health status
 * Provides recommendations and alerts for maintaining good account health
 */

// @route   GET /api/phone-health
// @desc    Get current phone number health status
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const health = await PhoneNumberHealth.getCurrentHealth(req.userId);

    if (!health) {
      return res.status(404).json({ 
        error: 'No health data found. Run a health check first.',
        needsCheck: true
      });
    }

    res.json({
      health: {
        phoneNumberId: health.phoneNumberId,
        phoneNumber: health.phoneNumber,
        qualityRating: health.qualityRating,
        messagingLimitTier: health.messagingLimitTier,
        healthScore: health.healthScore,
        status: health.status,
        isHealthy: health.isHealthy,
        needsAttention: health.needsAttention,
        isCritical: health.isCritical,
        verifiedName: health.verifiedName,
        codeVerificationStatus: health.codeVerificationStatus,
        metrics: health.metrics,
        lastCheckedAt: health.lastCheckedAt,
        timeSinceLastCheck: health.timeSinceLastCheck
      },
      recommendations: health.recommendations,
      alerts: health.alerts.filter(a => !a.acknowledged),
      totalAlerts: health.alerts.length,
      unacknowledgedAlerts: health.alerts.filter(a => !a.acknowledged).length
    });
  } catch (error) {
    console.error('Get health status error:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// @route   POST /api/phone-health/check
// @desc    Run a health check (fetch from WhatsApp API)
// @access  Private
router.post('/check', auth, async (req, res) => {
  try {
    console.log('🔍 Running phone number health check...');

    // Fetch health data from WhatsApp API
    const result = await whatsappService.getPhoneNumberHealth();

    if (!result.success) {
      return res.status(400).json({ 
        error: 'Failed to fetch health data from WhatsApp',
        details: result.error
      });
    }

    // Find or create health record
    let health = await PhoneNumberHealth.findOne({ 
      userId: req.userId,
      phoneNumberId: result.data.phoneNumberId
    });

    if (!health) {
      // Create new health record
      health = new PhoneNumberHealth({
        userId: req.userId,
        phoneNumberId: result.data.phoneNumberId,
        phoneNumber: result.data.display_phone_number
      });
    }

    // Update health data
    health.updateFromApi(result.data);

    // Update metrics from conversation data
    await health.updateMetrics();

    // Save health record
    await health.save();

    console.log('✅ Health check complete');
    console.log('   Quality Rating:', health.qualityRating);
    console.log('   Health Score:', health.healthScore);

    res.json({
      message: 'Health check completed successfully',
      health: {
        phoneNumberId: health.phoneNumberId,
        phoneNumber: health.phoneNumber,
        qualityRating: health.qualityRating,
        messagingLimitTier: health.messagingLimitTier,
        healthScore: health.healthScore,
        status: health.status,
        isHealthy: health.isHealthy,
        needsAttention: health.needsAttention,
        isCritical: health.isCritical,
        verifiedName: health.verifiedName,
        metrics: health.metrics,
        lastCheckedAt: health.lastCheckedAt
      },
      recommendations: health.recommendations,
      alerts: health.alerts.filter(a => !a.acknowledged),
      changes: {
        qualityChanged: health.previousQualityRating !== health.qualityRating,
        tierChanged: health.previousTier !== health.messagingLimitTier
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

// @route   GET /api/phone-health/history
// @desc    Get health history for the last N days
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const history = await PhoneNumberHealth.getHealthHistory(
      req.userId,
      parseInt(days)
    );

    // Calculate trends
    const qualityTrend = [];
    const scoreTrend = [];
    
    history.forEach(record => {
      qualityTrend.push({
        date: record.createdAt,
        rating: record.qualityRating
      });
      scoreTrend.push({
        date: record.createdAt,
        score: record.healthScore
      });
    });

    res.json({
      history: history,
      trends: {
        quality: qualityTrend,
        healthScore: scoreTrend
      },
      summary: {
        totalChecks: history.length,
        averageScore: history.reduce((sum, h) => sum + h.healthScore, 0) / history.length,
        currentRating: history[0]?.qualityRating || 'UNKNOWN',
        currentScore: history[0]?.healthScore || 0
      }
    });
  } catch (error) {
    console.error('Get health history error:', error);
    res.status(500).json({ error: 'Failed to get health history' });
  }
});

// @route   GET /api/phone-health/recommendations
// @desc    Get current recommendations
// @access  Private
router.get('/recommendations', auth, async (req, res) => {
  try {
    const health = await PhoneNumberHealth.getCurrentHealth(req.userId);

    if (!health) {
      return res.status(404).json({ error: 'No health data found' });
    }

    res.json({
      recommendations: health.recommendations,
      summary: {
        total: health.recommendations.length,
        critical: health.recommendations.filter(r => r.priority === 'critical').length,
        high: health.recommendations.filter(r => r.priority === 'high').length,
        medium: health.recommendations.filter(r => r.priority === 'medium').length,
        low: health.recommendations.filter(r => r.priority === 'low').length
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// @route   GET /api/phone-health/alerts
// @desc    Get current alerts
// @access  Private
router.get('/alerts', auth, async (req, res) => {
  try {
    const { includeAcknowledged = false } = req.query;

    const health = await PhoneNumberHealth.getCurrentHealth(req.userId);

    if (!health) {
      return res.status(404).json({ error: 'No health data found' });
    }

    let alerts = health.alerts;
    
    if (!includeAcknowledged) {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    res.json({
      alerts: alerts.sort((a, b) => b.createdAt - a.createdAt),
      summary: {
        total: health.alerts.length,
        unacknowledged: health.alerts.filter(a => !a.acknowledged).length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        error: alerts.filter(a => a.severity === 'error').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// @route   PATCH /api/phone-health/alerts/:alertId/acknowledge
// @desc    Acknowledge an alert
// @access  Private
router.patch('/alerts/:alertId/acknowledge', auth, async (req, res) => {
  try {
    const { alertId } = req.params;

    const health = await PhoneNumberHealth.getCurrentHealth(req.userId);

    if (!health) {
      return res.status(404).json({ error: 'No health data found' });
    }

    const alert = health.acknowledgeAlert(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await health.save();

    res.json({
      message: 'Alert acknowledged successfully',
      alert: alert
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// @route   GET /api/phone-health/metrics
// @desc    Get messaging metrics
// @access  Private
router.get('/metrics', auth, async (req, res) => {
  try {
    const health = await PhoneNumberHealth.getCurrentHealth(req.userId);

    if (!health) {
      return res.status(404).json({ error: 'No health data found' });
    }

    res.json({
      metrics: health.metrics,
      healthScore: health.healthScore,
      qualityRating: health.qualityRating,
      lastUpdated: health.lastCheckedAt
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// @route   POST /api/phone-health/metrics/update
// @desc    Update metrics from conversation data
// @access  Private
router.post('/metrics/update', auth, async (req, res) => {
  try {
    const health = await PhoneNumberHealth.getCurrentHealth(req.userId);

    if (!health) {
      return res.status(404).json({ error: 'No health data found' });
    }

    await health.updateMetrics();
    await health.save();

    res.json({
      message: 'Metrics updated successfully',
      metrics: health.metrics,
      healthScore: health.healthScore
    });
  } catch (error) {
    console.error('Update metrics error:', error);
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});

// @route   GET /api/phone-health/limits
// @desc    Get messaging limit information
// @access  Private
router.get('/limits', auth, async (req, res) => {
  try {
    const result = await whatsappService.getMessagingLimits();

    if (!result.success) {
      return res.status(400).json({ 
        error: 'Failed to get messaging limits',
        details: result.error
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Get limits error:', error);
    res.status(500).json({ error: 'Failed to get messaging limits' });
  }
});

module.exports = router;
