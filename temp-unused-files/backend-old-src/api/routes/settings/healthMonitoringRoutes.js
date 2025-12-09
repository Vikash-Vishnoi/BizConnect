/**
 * Health Monitoring Routes - Check phone health and history
 * @module routes/phoneHealth/healthMonitoringRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../database/models');
const WhatsAppService = require('../../../services/whatsapp/whatsappService');
 
// GET / - Get current phone health status
router.get('/', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const health = {
      status: business.health?.apiStatus || 'UNKNOWN',
      qualityScore: business.phoneNumberQuality?.qualityScore || 'UNKNOWN',
      qualityRating: business.phoneNumberQuality?.qualityRating || 'UNKNOWN',
      messagingLimitTier: business.phoneNumberQuality?.messagingLimitTier || 'UNKNOWN',
      nameStatus: business.phoneNumberQuality?.nameStatus || 'NONE',
      lastQualityUpdate: business.phoneNumberQuality?.lastQualityUpdate,
      message: business.phoneNumberQuality?.lastQualityUpdate 
        ? 'Health data available' 
        : 'No health check performed yet'
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Error getting phone health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get phone health',
      error: error.message
    });
  }
});

// POST /check - Perform health check
router.post('/check', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get credentials and check health via WhatsApp API
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    const healthData = await whatsappService.checkPhoneHealth();

    // Update business phone quality
    await business.updatePhoneQuality({
      score: healthData.qualityScore || business.phoneNumberQuality?.qualityScore,
      rating: healthData.qualityRating || business.phoneNumberQuality?.qualityRating,
      tier: healthData.messagingLimit || business.phoneNumberQuality?.messagingLimitTier,
      nameStatus: healthData.nameStatus,
      reason: 'Manual health check'
    });

    res.json({
      success: true,
      message: 'Health check completed',
      health: {
        qualityScore: business.phoneNumberQuality?.qualityScore,
        qualityRating: business.phoneNumberQuality?.qualityRating,
        messagingLimitTier: business.phoneNumberQuality?.messagingLimitTier,
        nameStatus: business.phoneNumberQuality?.nameStatus,
        lastQualityUpdate: business.phoneNumberQuality?.lastQualityUpdate
      }
    });
  } catch (error) {
    console.error('Error checking phone health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phone health',
      error: error.message
    });
  }
});

// GET /history - Get health check history
router.get('/history', async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.PHONE_HEALTH_HISTORY_LIMIT || '30');
    const maxLimit = parseInt(process.env.PHONE_HEALTH_HISTORY_MAX_LIMIT || '90');
    const { limit = defaultLimit } = req.query;
    const finalLimit = Math.min(parseInt(limit), maxLimit);

    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get quality history from business
    const history = business.phoneNumberQuality?.qualityHistory || [];
    const limitedHistory = history.slice(-parseInt(limit)).reverse();

    res.json({
      success: true,
      count: limitedHistory.length,
      total: history.length,
      history: limitedHistory
    });
  } catch (error) {
    console.error('Error getting health history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get health history',
      error: error.message
    });
  }
});

// GET /recommendations - Get health recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const recommendations = [];
    const qualityScore = business.phoneNumberQuality?.qualityScore;
    const capabilities = business.capabilities;

    if (qualityScore === 'RED') {
      recommendations.push({
        severity: 'CRITICAL',
        message: 'Critical: Quality score is RED. Review messaging patterns immediately.',
        action: 'Check your message templates and reduce spam-like behavior'
      });
    } else if (qualityScore === 'YELLOW') {
      recommendations.push({
        severity: 'WARNING',
        message: 'Warning: Quality score is YELLOW. Improve message quality.',
        action: 'Focus on engagement and avoid broadcasting to inactive numbers'
      });
    }

    if (capabilities?.messaging === 'RESTRICTED') {
      recommendations.push({
        severity: 'HIGH',
        message: 'Messaging capability is restricted.',
        action: 'Contact WhatsApp support to resolve restrictions'
      });
    }

    if (capabilities?.messaging === 'DISABLED') {
      recommendations.push({
        severity: 'CRITICAL',
        message: 'Messaging capability is disabled.',
        action: 'Contact WhatsApp support immediately'
      });
    }

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

module.exports = router;
