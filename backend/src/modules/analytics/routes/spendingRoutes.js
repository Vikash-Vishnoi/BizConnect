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
const { requireBusinessAdmin } = require('../../../core/middlewares/userTypeAuth');
 
/**
 * GET / - Get spending dashboard data
 * Returns current messaging limits, usage, and cost estimates
 */
router.get('/', requireBusinessAdmin, async (req, res) => {
  try {
    const business = await Business.findOne({
      _id: req.businessId,
      deleted: { $ne: true }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Fetch current WhatsApp limits from Meta API
    let whatsappLimits = null;
    let limitError = null;

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/${business.whatsappPhoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${business.whatsappAccessToken}`
          },
          params: {
            fields: 'quality_rating,messaging_limit,name_status,code_verification_status'
          }
        }
      );

      whatsappLimits = {
        qualityRating: response.data.quality_rating || 'UNKNOWN',
        messagingLimit: response.data.messaging_limit || 'TIER_NOT_SET',
        nameStatus: response.data.name_status || 'NONE',
        codeVerificationStatus: response.data.code_verification_status || 'NOT_VERIFIED'
      };
    } catch (error) {
      console.error('Error fetching WhatsApp limits:', error.message);
      limitError = error.response?.data?.error?.message || error.message;
    }

    // Get today's message count (approximate from campaigns)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCampaigns = await Campaign.find({
      businessId: req.businessId,
      status: { $in: ['RUNNING', 'COMPLETED'] },
      startedAt: { $gte: today }
    });

    const todayMessagesSent = todayCampaigns.reduce((total, campaign) => {
      return total + (campaign.analytics?.sent || 0);
    }, 0);

    // Calculate tier limits (configured via environment)
    const tierLimits = {
      'TIER_NOT_SET': parseInt(process.env.WHATSAPP_TIER_NOT_SET || '50'),
      'TIER_50': parseInt(process.env.WHATSAPP_TIER_50 || '250'),
      'TIER_250': parseInt(process.env.WHATSAPP_TIER_250 || '1000'),
      'TIER_1K': parseInt(process.env.WHATSAPP_TIER_1K || '10000'),
      'TIER_10K': parseInt(process.env.WHATSAPP_TIER_10K || '100000'),
      'TIER_100K': parseInt(process.env.WHATSAPP_TIER_100K || '1000000'),
      'UNLIMITED': Infinity
    };

    const currentTier = whatsappLimits?.messagingLimit || 'TIER_NOT_SET';
    const dailyLimit = tierLimits[currentTier] || 50;
    const remainingToday = Math.max(0, dailyLimit - todayMessagesSent);
    const usagePercent = dailyLimit > 0 ? (todayMessagesSent / dailyLimit * 100).toFixed(1) : 0;

    // Cost estimation (configured via environment, varies by region)
    const estimatedCostPerMessage = parseFloat(process.env.WHATSAPP_COST_PER_MESSAGE || '0.005');
    const todayCost = (todayMessagesSent * estimatedCostPerMessage).toFixed(2);
    const monthlyProjectionDays = parseInt(process.env.SPENDING_MONTHLY_PROJECTION_DAYS || '30');
    const projectedMonthlyCost = (todayMessagesSent * monthlyProjectionDays * estimatedCostPerMessage).toFixed(2);

    // Get campaign summary
    const totalCampaigns = await Campaign.countDocuments({ businessId: req.businessId });
    const activeCampaigns = await Campaign.countDocuments({
      businessId: req.businessId,
      status: 'RUNNING'
    });

    // Warning flags (thresholds configured via environment)
    const warnings = [];
    const criticalThreshold = parseFloat(process.env.SPENDING_CRITICAL_THRESHOLD || '90');
    const warningThreshold = parseFloat(process.env.SPENDING_WARNING_THRESHOLD || '75');
    
    if (usagePercent > criticalThreshold) {
      warnings.push({
        type: 'CRITICAL',
        message: `You have used over ${criticalThreshold}% of your daily messaging limit. New campaigns may fail.`
      });
    } else if (usagePercent > warningThreshold) {
      warnings.push({
        type: 'WARNING',
        message: `You have used over ${warningThreshold}% of your daily messaging limit.`
      });
    }

    if (whatsappLimits?.qualityRating === 'RED') {
      warnings.push({
        type: 'CRITICAL',
        message: 'Your quality rating is RED. Your account may be restricted or suspended.'
      });
    } else if (whatsappLimits?.qualityRating === 'YELLOW') {
      warnings.push({
        type: 'WARNING',
        message: 'Your quality rating is YELLOW. Improve your messaging quality to avoid restrictions.'
      });
    }

    res.json({
      success: true,
      data: {
        // WhatsApp account status
        account: {
          tier: currentTier,
          qualityRating: whatsappLimits?.qualityRating || 'UNKNOWN',
          nameStatus: whatsappLimits?.nameStatus || 'NONE',
          codeVerificationStatus: whatsappLimits?.codeVerificationStatus || 'NOT_VERIFIED',
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
      }
    });

  } catch (error) {
    console.error('Error getting spending dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spending dashboard',
      error: error.message
    });
  }
});

/**
 * GET /history - Get historical spending data
 */
router.get('/history', requireBusinessAdmin, async (req, res) => {
  try {
    const defaultDays = parseInt(process.env.SPENDING_HISTORY_DEFAULT_DAYS || '30');
    const maxDays = parseInt(process.env.SPENDING_HISTORY_MAX_DAYS || '90');
    const { days = defaultDays } = req.query;
    const daysNum = parseInt(days);

    if (daysNum < 1 || daysNum > maxDays) {
      return res.status(400).json({
        success: false,
        message: `Days must be between 1 and ${maxDays}`
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const campaigns = await Campaign.find({
      businessId: req.businessId,
      startedAt: { $gte: startDate },
      status: { $in: ['RUNNING', 'COMPLETED'] }
    }).sort({ startedAt: 1 });

    // Group by day
    const dailyStats = {};
    const estimatedCostPerMessage = parseFloat(process.env.WHATSAPP_COST_PER_MESSAGE || '0.005');

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

    res.json({
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
      }
    });

  } catch (error) {
    console.error('Error getting spending history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spending history',
      error: error.message
    });
  }
});

module.exports = router;
