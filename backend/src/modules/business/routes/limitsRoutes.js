/**
 * Limits & Quality Settings Routes
 * @module routes/settings/limitsRoutes
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../../../core/database/models');
const WhatsAppService = require('../../../integrations/whatsapp/whatsappService');
const { NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');

// ==================== CONSTANTS ====================

// Default Limits
const LIMITS_DEFAULTS = {
  QUALITY_HISTORY_LIMIT: parseInt(process.env.QUALITY_RATING_HISTORY_LIMIT || '30'),
  QUALITY_HISTORY_MAX_LIMIT: parseInt(process.env.QUALITY_RATING_HISTORY_MAX_LIMIT || '90'),
  DEFAULT_DAILY_LIMIT: 50,
  DEFAULT_REMAINING: 0
};

// Default Tier
const DEFAULT_TIER = 'TIER_50';

// Error Messages
const ERROR_MESSAGES = {
  FETCH_ACCOUNT_LIMITS_FAILED: 'Failed to fetch account limits',
  FETCH_MESSAGING_LIMITS_FAILED: 'Failed to fetch messaging limits',
  FETCH_QUALITY_HISTORY_FAILED: 'Failed to fetch quality rating history',
  CHECK_QUALITY_FAILED: 'Failed to check quality rating'
};

// Success Messages
const SUCCESS_MESSAGES = {
  ACCOUNT_LIMITS_RETRIEVED: 'Account limits retrieved successfully',
  MESSAGING_LIMITS_RETRIEVED: 'Messaging limits retrieved successfully',
  QUALITY_HISTORY_RETRIEVED: 'Quality rating history retrieved successfully',
  QUALITY_CHECK_COMPLETED: 'Quality rating check completed successfully'
};

// Check Reasons
const CHECK_REASON = {
  MANUAL_CHECK: 'Manual quality check'
};

// GET /account-limits - Get account limits
router.get('/account-limits', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await validateBusiness(req.businessId);
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    const limits = await whatsappService.getAccountLimits(business);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { limits },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error(ERROR_MESSAGES.FETCH_ACCOUNT_LIMITS_FAILED);
  }
});

// GET /messaging-limits - Get messaging limits
router.get('/messaging-limits', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await validateBusiness(req.businessId);
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    const limits = await whatsappService.getMessagingLimits(business);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        limits: {
          tier: limits.tier || DEFAULT_TIER,
          dailyLimit: limits.dailyLimit || LIMITS_DEFAULTS.DEFAULT_DAILY_LIMIT,
          remaining: limits.remaining || LIMITS_DEFAULTS.DEFAULT_REMAINING,
          resetTime: limits.resetTime
        }
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error(ERROR_MESSAGES.FETCH_MESSAGING_LIMITS_FAILED);
  }
});

// GET /quality-rating/history - Get quality rating history
router.get('/quality-rating/history', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit = LIMITS_DEFAULTS.QUALITY_HISTORY_LIMIT } = req.query;
    const finalLimit = Math.min(parseInt(limit), LIMITS_DEFAULTS.QUALITY_HISTORY_MAX_LIMIT);

    const business = await validateBusiness(req.businessId);

    const history = business.phoneNumberQuality?.qualityHistory || [];
    const ratings = history.slice(-finalLimit).reverse();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: ratings.length,
        ratings
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error(ERROR_MESSAGES.FETCH_QUALITY_HISTORY_FAILED);
  }
});

// POST /quality-rating/check - Check current quality rating
router.post('/quality-rating/check', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await validateBusiness(req.businessId);

    const credentials = await business.getWhatsAppCredentials();
    const whatsappServiceInstance = new WhatsAppService(credentials);
    const phoneInfo = await whatsappServiceInstance.getPhoneNumberInfo();

    if (phoneInfo.success && phoneInfo.data) {
      await business.updatePhoneQuality({
        score: phoneInfo.data.quality_score,
        rating: phoneInfo.data.quality_rating,
        tier: phoneInfo.data.messaging_limit_tier,
        reason: CHECK_REASON.MANUAL_CHECK
      });
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        rating: {
          qualityScore: business.phoneNumberQuality?.qualityScore,
          qualityRating: business.phoneNumberQuality?.qualityRating,
          messagingLimitTier: business.phoneNumberQuality?.messagingLimitTier,
          lastUpdate: business.phoneNumberQuality?.lastQualityUpdate
        }
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.businessId?.toString(),
      processingTime
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error(ERROR_MESSAGES.CHECK_QUALITY_FAILED);
  }
});

module.exports = router;
