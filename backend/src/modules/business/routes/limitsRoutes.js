/**
 * Limits & Quality Settings Routes
 * @module routes/settings/limitsRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');

// GET /account-limits - Get account limits
router.get('/account-limits', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
 
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const limits = await whatsappService.getAccountLimits(business);

    res.json({
      success: true,
      limits
    });
  } catch (error) {
    console.error('Error getting account limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get account limits',
      error: error.message
    });
  }
});

// GET /messaging-limits - Get messaging limits
router.get('/messaging-limits', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const limits = await whatsappService.getMessagingLimits(business);

    res.json({
      success: true,
      limits: {
        tier: limits.tier || 'TIER_50',
        dailyLimit: limits.dailyLimit || 50,
        remaining: limits.remaining || 0,
        resetTime: limits.resetTime
      }
    });
  } catch (error) {
    console.error('Error getting messaging limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messaging limits',
      error: error.message
    });
  }
});

// GET /quality-rating/history - Get quality rating history
router.get('/quality-rating/history', async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.QUALITY_RATING_HISTORY_LIMIT || '30');
    const maxLimit = parseInt(process.env.QUALITY_RATING_HISTORY_MAX_LIMIT || '90');
    const { limit = defaultLimit } = req.query;
    const finalLimit = Math.min(parseInt(limit), maxLimit);

    const business = await Business.findById(req.businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const history = business.phoneNumberQuality?.qualityHistory || [];
    const ratings = history.slice(-finalLimit).reverse();

    res.json({
      success: true,
      count: ratings.length,
      ratings
    });
  } catch (error) {
    console.error('Error getting quality rating history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quality rating history',
      error: error.message
    });
  }
});

// POST /quality-rating/check - Check current quality rating
router.post('/quality-rating/check', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const credentials = await business.getWhatsAppCredentials();
    const whatsappServiceInstance = new WhatsAppService(credentials);
    const phoneInfo = await whatsappServiceInstance.getPhoneNumberInfo();

    if (phoneInfo.success && phoneInfo.data) {
      await business.updatePhoneQuality({
        score: phoneInfo.data.quality_score,
        rating: phoneInfo.data.quality_rating,
        tier: phoneInfo.data.messaging_limit_tier,
        reason: 'Manual quality check'
      });
    }

    res.json({
      success: true,
      rating: {
        qualityScore: business.phoneNumberQuality?.qualityScore,
        qualityRating: business.phoneNumberQuality?.qualityRating,
        messagingLimitTier: business.phoneNumberQuality?.messagingLimitTier,
        lastUpdate: business.phoneNumberQuality?.lastQualityUpdate
      }
    });
  } catch (error) {
    console.error('Error checking quality rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check quality rating',
      error: error.message
    });
  }
});

module.exports = router;
