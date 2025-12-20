/**
 * Spending Dashboard Routes
 * Provides real-time WhatsApp API usage and spending analytics
 * 
 * CRITICAL: Helps businesses avoid exceeding WhatsApp limits and unexpected charges
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Business, Campaign } = require('../../../core/database/models');
const { requireBusinessAdmin } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// ============================================================================
// CONSTANTS
// ============================================================================

// Meta API Configuration
const META_API_VERSION = 'v17.0';
const META_API_BASE_URL = 'https://graph.facebook.com';
const WHATSAPP_FIELDS = 'quality_rating,messaging_limit,name_status,code_verification_status';

// Tier Limits
const DEFAULT_TIER_NOT_SET = 50;
const DEFAULT_TIER_50 = 250;
const DEFAULT_TIER_250 = 1000;
const DEFAULT_TIER_1K = 10000;
const DEFAULT_TIER_10K = 100000;
const DEFAULT_TIER_100K = 1000000;

// Cost Estimation
const DEFAULT_COST_PER_MESSAGE = 0.005;
const DEFAULT_MONTHLY_PROJECTION_DAYS = 30;

// History Defaults
const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 90;
const MIN_HISTORY_DAYS = 1;

// Threshold Percentages
const CRITICAL_THRESHOLD = 90;
const WARNING_THRESHOLD = 75;

// Quality Ratings
const QUALITY_RATING_RED = 'RED';
const QUALITY_RATING_YELLOW = 'YELLOW';
const QUALITY_RATING_GREEN = 'GREEN';
const QUALITY_RATING_UNKNOWN = 'UNKNOWN';

// Campaign Statuses
const CAMPAIGN_STATUS_RUNNING = 'RUNNING';
const CAMPAIGN_STATUS_COMPLETED = 'COMPLETED';

// Messaging Tiers
const TIER_NOT_SET = 'TIER_NOT_SET';
const TIER_50 = 'TIER_50';
const TIER_250 = 'TIER_250';
const TIER_1K = 'TIER_1K';
const TIER_10K = 'TIER_10K';
const TIER_100K = 'TIER_100K';
const TIER_UNLIMITED = 'UNLIMITED';

// Status Values
const NAME_STATUS_NONE = 'NONE';
const CODE_VERIFICATION_NOT_VERIFIED = 'NOT_VERIFIED';

// Warning Types
const WARNING_TYPE_CRITICAL = 'CRITICAL';
const WARNING_TYPE_WARNING = 'WARNING';

// Error Messages
const ERROR_BUSINESS_NOT_FOUND = 'Business not found';
const ERROR_SPENDING_DASHBOARD_FAILED = 'Failed to get spending dashboard';
const ERROR_SPENDING_HISTORY_FAILED = 'Failed to get spending history';
const ERROR_DAYS_OUT_OF_RANGE = 'Days must be between 1 and 90';

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET / - Get spending dashboard data
 * Returns current messaging limits, usage, and cost estimates
 */
router.get('/', requireBusinessAdmin, businessContext, async (req, res) => {
  const startTime = Date.now();
router.get('/', requireBusinessAdmin, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const business = await Business.findOne({
      _id: req.businessId,
      deleted: { $ne: true }
    });

    if (!business) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_BUSINESS_NOT_FOUND,
        processingTime
      });
    }

    // Fetch current WhatsApp limits from Meta API
    let whatsappLimits = null;
    let limitError = null;

    try {
      const response = await axios.get(
        `${META_API_BASE_URL}/${META_API_VERSION}/${business.whatsappPhoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${business.whatsappAccessToken}`
          },
          params: {
            fields: WHATSAPP_FIELDS
          }
        }
      );

      whatsappLimits = {
        qualityRating: response.data.quality_rating || QUALITY_RATING_UNKNOWN,
        messagingLimit: response.data.messaging_limit || TIER_NOT_SET,
        nameStatus: response.data.name_status || NAME_STATUS_NONE,
        codeVerificationStatus: response.data.code_verification_status || CODE_VERIFICATION_NOT_VERIFIED
      };
    } catch (error) {
      logger.error('Error fetching WhatsApp limits', {
        businessId: req.businessId?.toString(),
        error: error.message
      });
      limitError = error.response?.data?.error?.message || error.message;
    }

    // Get today's message count (approximate from campaigns)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCampaigns = await Campaign.find({
      businessId: req.businessId,
      status: { $in: [CAMPAIGN_STATUS_RUNNING, CAMPAIGN_STATUS_COMPLETED] },
      startedAt: { $gte: today }
    });

    const todayMessagesSent = todayCampaigns.reduce((total, campaign) => {
      return total + (campaign.analytics?.sent || 0);
    }, 0);

    // Calculate tier limits (configured via environment)
    const tierLimits = {
      [TIER_NOT_SET]: parseInt(process.env.WHATSAPP_TIER_NOT_SET || DEFAULT_TIER_NOT_SET.toString()),
      [TIER_50]: parseInt(process.env.WHATSAPP_TIER_50 || DEFAULT_TIER_50.toString()),
      [TIER_250]: parseInt(process.env.WHATSAPP_TIER_250 || DEFAULT_TIER_250.toString()),
      [TIER_1K]: parseInt(process.env.WHATSAPP_TIER_1K || DEFAULT_TIER_1K.toString()),
      [TIER_10K]: parseInt(process.env.WHATSAPP_TIER_10K || DEFAULT_TIER_10K.toString()),
      [TIER_100K]: parseInt(process.env.WHATSAPP_TIER_100K || DEFAULT_TIER_100K.toString()),
      [TIER_UNLIMITED]: Infinity
    };

    const currentTier = whatsappLimits?.messagingLimit || TIER_NOT_SET;
    const dailyLimit = tierLimits[currentTier] || DEFAULT_TIER_NOT_SET;
    const remainingToday = Math.max(0, dailyLimit - todayMessagesSent);
    const usagePercent = dailyLimit > 0 ? (todayMessagesSent / dailyLimit * 100).toFixed(1) : 0;

    // Cost estimation (configured via environment, varies by region)
    const estimatedCostPerMessage = parseFloat(process.env.WHATSAPP_COST_PER_MESSAGE || DEFAULT_COST_PER_MESSAGE.toString());
    const todayCost = (todayMessagesSent * estimatedCostPerMessage).toFixed(2);
    const monthlyProjectionDays = parseInt(process.env.SPENDING_MONTHLY_PROJECTION_DAYS || DEFAULT_MONTHLY_PROJECTION_DAYS.toString());
    const projectedMonthlyCost = (todayMessagesSent * monthlyProjectionDays * estimatedCostPerMessage).toFixed(2);

    // Get campaign summary
    const totalCampaigns = await Campaign.countDocuments({ businessId: req.businessId });
    const activeCampaigns = await Campaign.countDocuments({
      businessId: req.businessId,
      status: CAMPAIGN_STATUS_RUNNING
    });

    // Warning flags (thresholds configured via environment)
    const warnings = [];
    const criticalThreshold = parseFloat(process.env.SPENDING_CRITICAL_THRESHOLD || CRITICAL_THRESHOLD.toString());
    const warningThreshold = parseFloat(process.env.SPENDING_WARNING_THRESHOLD || WARNING_THRESHOLD.toString());
    
    if (usagePercent > criticalThreshold) {
      warnings.push({
        type: WARNING_TYPE_CRITICAL,
        message: `You have used over ${criticalThreshold}% of your daily messaging limit. New campaigns may fail.`
      });
    } else if (usagePercent > warningThreshold) {
      warnings.push({
        type: WARNING_TYPE_WARNING,
        message: `You have used over ${warningThreshold}% of your daily messaging limit.`
      });
    }

    if (whatsappLimits?.qualityRating === QUALITY_RATING_RED) {
      warnings.push({
        type: WARNING_TYPE_CRITICAL,
        message: 'Your quality rating is RED. Your account may be restricted or suspended.'
      });
    } else if (whatsappLimits?.qualityRating === QUALITY_RATING_YELLOW) {
      warnings.push({
        type: WARNING_TYPE_WARNING,
        message: 'Your quality rating is YELLOW. Improve your messaging quality to avoid restrictions.'
      });
    }

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        // WhatsApp account status
        account: {
          tier: currentTier,
          qualityRating: whatsappLimits?.qualityRating || QUALITY_RATING_UNKNOWN,
          nameStatus: whatsappLimits?.nameStatus || NAME_STATUS_NONE,
          codeVerificationStatus: whatsappLimits?.codeVerificationStatus || CODE_VERIFICATION_NOT_VERIFIED,
          limitError: limitError
        },
        
        // Today's usage
        usage: {
          today: {
            sent: todayMessagesSent,
              limit: dailyLimit,
              remaining: remainingToday,
              usagePercent: parseFloat(usagePercent)
            },
            cost: {
              today: parseFloat(todayCost),
              projectedMonthly: parseFloat(projectedMonthlyCost),
              perMessage: estimatedCostPerMessage
            }
          },

          // Campaign summary
          campaigns: {
            total: totalCampaigns,
            active: activeCampaigns
          },

          // Warnings and alerts
          warnings: warnings,

          // Last updated
          timestamp: new Date().toISOString()
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
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_SPENDING_DASHBOARD_FAILED,
      processingTime
    });
  }
});

/**
 * GET /history - Get historical spending data
 */
router.get('/history', requireBusinessAdmin, businessContext, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const defaultDays = parseInt(process.env.SPENDING_HISTORY_DEFAULT_DAYS || DEFAULT_HISTORY_DAYS.toString());
    const maxDays = parseInt(process.env.SPENDING_HISTORY_MAX_DAYS || MAX_HISTORY_DAYS.toString());
    const { days = defaultDays } = req.query;
    const daysNum = parseInt(days);

    if (daysNum < MIN_HISTORY_DAYS || daysNum > maxDays) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Days must be between ${MIN_HISTORY_DAYS} and ${maxDays}`,
        processingTime
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const campaigns = await Campaign.find({
      businessId: req.businessId,
      startedAt: { $gte: startDate },
      status: { $in: [CAMPAIGN_STATUS_RUNNING, CAMPAIGN_STATUS_COMPLETED] }
    }).sort({ startedAt: 1 });

    // Group by day
    const dailyStats = {};
    const estimatedCostPerMessage = parseFloat(process.env.WHATSAPP_COST_PER_MESSAGE || DEFAULT_COST_PER_MESSAGE.toString());

    campaigns.forEach(campaign => {
      const dateKey = campaign.startedAt.toISOString().split('T')[0];
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          sent: 0,
          delivered: 0,
          failed: 0,
          cost: 0,
          campaigns: 0
        };
      }

      dailyStats[dateKey].sent += campaign.analytics?.sent || 0;
      dailyStats[dateKey].delivered += campaign.analytics?.delivered || 0;
      dailyStats[dateKey].failed += campaign.analytics?.failed || 0;
      dailyStats[dateKey].cost += (campaign.analytics?.sent || 0) * estimatedCostPerMessage;
      dailyStats[dateKey].campaigns += 1;
    });

    const history = Object.values(dailyStats).map(day => ({
      ...day,
      cost: parseFloat(day.cost.toFixed(2))
    }));

    const totalSpent = history.reduce((sum, day) => sum + day.cost, 0);
    const totalMessages = history.reduce((sum, day) => sum + day.sent, 0);

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        history: history,
        summary: {
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          totalMessages: totalMessages,
          averagePerDay: parseFloat((totalMessages / daysNum).toFixed(0)),
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: daysNum
          }
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
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_SPENDING_HISTORY_FAILED,
      processingTime
    });
  }
});

module.exports = router;
