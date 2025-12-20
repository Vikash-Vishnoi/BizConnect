/**
 * Health Monitoring Routes - Check phone health and history
 * @module routes/phoneHealth/healthMonitoringRoutes
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

// Default Status Values
const DEFAULT_STATUS = {
  API: 'UNKNOWN',
  QUALITY_SCORE: 'UNKNOWN',
  QUALITY_RATING: 'UNKNOWN',
  MESSAGING_TIER: 'UNKNOWN',
  NAME_STATUS: 'NONE'
};

// Default Limits
const HISTORY_DEFAULTS = {
  PHONE_HEALTH_HISTORY_LIMIT: parseInt(process.env.PHONE_HEALTH_HISTORY_LIMIT || '30'),
  PHONE_HEALTH_HISTORY_MAX_LIMIT: parseInt(process.env.PHONE_HEALTH_HISTORY_MAX_LIMIT || '90')
};

// Health Check Messages
const HEALTH_MESSAGES = {
  DATA_AVAILABLE: 'Health data available',
  NO_CHECK_PERFORMED: 'No health check performed yet'
};

// Recommendation Severity Levels
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

// Quality Score States
const QUALITY_SCORE = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN'
};

// Capability States
const CAPABILITY_STATUS = {
  RESTRICTED: 'RESTRICTED',
  DISABLED: 'DISABLED',
  ENABLED: 'ENABLED'
};

// Recommendation Messages
const RECOMMENDATION_MESSAGES = {
  RED_QUALITY: 'Critical: Quality score is RED. Review messaging patterns immediately.',
  YELLOW_QUALITY: 'Warning: Quality score is YELLOW. Improve message quality.',
  MESSAGING_RESTRICTED: 'Messaging capability is restricted.',
  MESSAGING_DISABLED: 'Messaging capability is disabled.'
};

// Recommendation Actions
const RECOMMENDATION_ACTIONS = {
  RED_QUALITY: 'Check your message templates and reduce spam-like behavior',
  YELLOW_QUALITY: 'Focus on engagement and avoid broadcasting to inactive numbers',
  MESSAGING_RESTRICTED: 'Contact WhatsApp support to resolve restrictions',
  MESSAGING_DISABLED: 'Contact WhatsApp support immediately'
};

// Check Reasons
const CHECK_REASON = {
  MANUAL_HEALTH_CHECK: 'Manual health check'
};

// Error Messages
const ERROR_MESSAGES = {
  BUSINESS_NOT_FOUND: 'Business not found',
  FETCH_HEALTH_FAILED: 'Failed to check phone health',
  FETCH_HISTORY_FAILED: 'Failed to get health history',
  FETCH_RECOMMENDATIONS_FAILED: 'Failed to get recommendations'
};

// Success Messages
const SUCCESS_MESSAGES = {
  HEALTH_RETRIEVED: 'Health status retrieved successfully',
  HEALTH_CHECK_COMPLETED: 'Health check completed successfully',
  HISTORY_RETRIEVED: 'Health history retrieved successfully',
  RECOMMENDATIONS_RETRIEVED: 'Recommendations retrieved successfully'
};
 
// GET / - Get current phone health status
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await validateBusiness(req.businessId);

    const health = {
      status: business.health?.apiStatus || DEFAULT_STATUS.API,
      qualityScore: business.phoneNumberQuality?.qualityScore || DEFAULT_STATUS.QUALITY_SCORE,
      qualityRating: business.phoneNumberQuality?.qualityRating || DEFAULT_STATUS.QUALITY_RATING,
      messagingLimitTier: business.phoneNumberQuality?.messagingLimitTier || DEFAULT_STATUS.MESSAGING_TIER,
      nameStatus: business.phoneNumberQuality?.nameStatus || DEFAULT_STATUS.NAME_STATUS,
      lastQualityUpdate: business.phoneNumberQuality?.lastQualityUpdate,
      message: business.phoneNumberQuality?.lastQualityUpdate 
        ? HEALTH_MESSAGES.DATA_AVAILABLE
        : HEALTH_MESSAGES.NO_CHECK_PERFORMED
    };

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { health },
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
    throw new Error(ERROR_MESSAGES.FETCH_HEALTH_FAILED);
  }
});

// POST /check - Perform health check
router.post('/check', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await validateBusiness(req.businessId);

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
      reason: CHECK_REASON.MANUAL_HEALTH_CHECK
    });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        health: {
          qualityScore: business.phoneNumberQuality?.qualityScore,
          qualityRating: business.phoneNumberQuality?.qualityRating,
          messagingLimitTier: business.phoneNumberQuality?.messagingLimitTier,
          nameStatus: business.phoneNumberQuality?.nameStatus,
          lastQualityUpdate: business.phoneNumberQuality?.lastQualityUpdate
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
    throw new Error(ERROR_MESSAGES.FETCH_HEALTH_FAILED);
  }
});

// GET /history - Get health check history
router.get('/history', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit = HISTORY_DEFAULTS.PHONE_HEALTH_HISTORY_LIMIT } = req.query;
    const finalLimit = Math.min(parseInt(limit), HISTORY_DEFAULTS.PHONE_HEALTH_HISTORY_MAX_LIMIT);

    const business = await Business.findById(req.businessId);

    if (!business) {
      throw new NotFoundError(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
    }

    // Get quality history from business
    const history = business.phoneNumberQuality?.qualityHistory || [];
    const limitedHistory = history.slice(-finalLimit).reverse();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: limitedHistory.length,
        total: history.length,
        history: limitedHistory
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
    throw new Error(ERROR_MESSAGES.FETCH_HISTORY_FAILED);
  }
});

// GET /recommendations - Get health recommendations
router.get('/recommendations', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await Business.findById(req.businessId);
    
    if (!business) {
      throw new NotFoundError(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
    }

    const recommendations = [];
    const qualityScore = business.phoneNumberQuality?.qualityScore;
    const capabilities = business.capabilities;

    if (qualityScore === QUALITY_SCORE.RED) {
      recommendations.push({
        severity: SEVERITY.CRITICAL,
        message: RECOMMENDATION_MESSAGES.RED_QUALITY,
        action: RECOMMENDATION_ACTIONS.RED_QUALITY
      });
    } else if (qualityScore === QUALITY_SCORE.YELLOW) {
      recommendations.push({
        severity: SEVERITY.WARNING,
        message: RECOMMENDATION_MESSAGES.YELLOW_QUALITY,
        action: RECOMMENDATION_ACTIONS.YELLOW_QUALITY
      });
    }

    if (capabilities?.messaging === CAPABILITY_STATUS.RESTRICTED) {
      recommendations.push({
        severity: SEVERITY.HIGH,
        message: RECOMMENDATION_MESSAGES.MESSAGING_RESTRICTED,
        action: RECOMMENDATION_ACTIONS.MESSAGING_RESTRICTED
      });
    }

    if (capabilities?.messaging === CAPABILITY_STATUS.DISABLED) {
      recommendations.push({
        severity: SEVERITY.CRITICAL,
        message: RECOMMENDATION_MESSAGES.MESSAGING_DISABLED,
        action: RECOMMENDATION_ACTIONS.MESSAGING_DISABLED
      });
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { recommendations },
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
    throw new Error(ERROR_MESSAGES.FETCH_RECOMMENDATIONS_FAILED);
  }
});

module.exports = router;
