const cron = require('node-cron');
const logger = require('../common/helpers/logger');
const Business = require('../core/database/models/Business');
const AlertLog = require('../core/database/models/AlertLog');
const WhatsAppService = require('../integrations/whatsapp/whatsappService');

// Constants for quality rating tracking
const QUALITY_SCORE_UNKNOWN = 'UNKNOWN'; // Unknown quality score
const QUALITY_SCORE_GREEN = 'GREEN'; // Good quality score
const QUALITY_SCORE_YELLOW = 'YELLOW'; // Warning quality score
const QUALITY_SCORE_RED = 'RED'; // Critical quality score
const QUALITY_RATING_HIGH = 'HIGH'; // High quality rating (100 score)
const QUALITY_RATING_MEDIUM = 'MEDIUM'; // Medium quality rating (50 score)
const QUALITY_RATING_LOW = 'LOW'; // Low quality rating (25 score)
const DEFAULT_TIER = 'TIER_1K'; // Default messaging limit tier
const NAME_STATUS_NONE = 'NONE'; // No name status
const DEFAULT_CHECK_DELAY_MS = 5000; // Default delay between business checks (5 seconds)
const QUALITY_CHECK_REASON = 'Automated quality check'; // Reason for quality check
const CRON_SCHEDULE_6_HOURS = '0 */6 * * *'; // Run every 6 hours
const CRON_TIMEZONE = 'UTC'; // Timezone for cron jobs
const ALERT_TYPE_QUALITY_UPDATE = 'PHONE_NUMBER_QUALITY_UPDATE'; // Alert type for quality updates
const ALERT_SEVERITY_CRITICAL = 'CRITICAL'; // Critical severity level
const ALERT_SEVERITY_WARNING = 'WARNING'; // Warning severity level
const ALERT_SEVERITY_HIGH = 'HIGH'; // High severity level
const ALERT_STATUS_UNREAD = 'UNREAD'; // Unread alert status
const QUALITY_SCORE_HIGH_VALUE = 100; // Numeric value for high quality
const QUALITY_SCORE_MEDIUM_VALUE = 50; // Numeric value for medium quality
const QUALITY_SCORE_LOW_VALUE = 25; // Numeric value for low quality
const BUSINESS_STATUS_ACTIVE = 'active'; // Active business status

/**
 * Quality Rating Tracker Job
 * Periodically checks quality rating for all active businesses
 * Runs every 6 hours
 */
  
let cronJob = null;

/**
 * Check quality rating for a single business
 */
async function checkBusinessQualityRating(business) {
  try {
    if (!business.whatsappConfig?.phoneNumberId) {
      logger.debug('Skipping business - no phone number configured', {
        businessId: business._id
      });
      return null;
    }

    logger.info('Checking quality rating for business', {
      businessId: business._id,
      name: business.name
    });

    // Get WhatsApp credentials and create service instance
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Fetch current quality rating from WhatsApp
    const phoneInfo = await whatsappService.getPhoneNumberInfo();
    
    if (!phoneInfo.success || !phoneInfo.data) {
      logger.error('Failed to fetch quality rating', {
        businessId: business._id,
        error: phoneInfo.error
      });
      return null;
    }

    const newQualityScore = phoneInfo.data.quality_score || QUALITY_SCORE_UNKNOWN;
    const newQualityRating = phoneInfo.data.quality_rating || QUALITY_SCORE_UNKNOWN;
    const newTier = phoneInfo.data.messaging_limit_tier || DEFAULT_TIER;
    const nameStatus = phoneInfo.data.name_status || NAME_STATUS_NONE;

    // Check if rating changed
    const previousScore = business.phoneNumberQuality?.qualityScore;
    const hasChanged = previousScore !== newQualityScore;

    // Update business phone quality
    await business.updatePhoneQuality({
      score: newQualityScore,
      rating: newQualityRating,
      tier: newTier,
      nameStatus: nameStatus,
      reason: QUALITY_CHECK_REASON
    });
    
    await business.save();

    logger.info('Quality rating saved', {
      businessId: business._id,
      name: business.name,
      qualityScore: newQualityScore,
      changed: hasChanged
    });

    // If rating changed to YELLOW or RED, trigger alert
    if (hasChanged && (newQualityScore === QUALITY_SCORE_YELLOW || newQualityScore === QUALITY_SCORE_RED)) {
      await triggerQualityAlert(business, previousScore, newQualityScore, newQualityRating);
    }

    return { business: business._id, qualityScore: newQualityScore, changed: hasChanged };
  } catch (error) {
    logger.error('Error checking quality rating', {
      businessId: business._id,
      error: error.message
    });
    return null;
  }
}

/**
 * Trigger alert when quality rating degrades
 */
async function triggerQualityAlert(business, previousScore, newScore, newRating) {
  try {
    logger.warn('Quality rating degraded', {
      businessId: business._id,
      name: business.name,
      previousScore: previousScore || QUALITY_SCORE_UNKNOWN,
      newScore,
      newRating
    });

    // Create alert in business alerts array
    await business.addAlert({
      alertType: ALERT_TYPE_QUALITY_UPDATE,
      severity: newScore === QUALITY_SCORE_RED ? ALERT_SEVERITY_CRITICAL : ALERT_SEVERITY_WARNING,
      title: `Phone Quality Score: ${newScore}`,
      description: `Quality score changed from ${previousScore || QUALITY_SCORE_UNKNOWN} to ${newScore}. Rating: ${newRating}`,
      metadata: {
        previousScore,
        newScore,
        newRating,
        timestamp: new Date(),
        source: 'quality_tracker_job'
      }
    });

    // Calculate numeric quality score
    let qualityScoreValue;
    if (newRating === QUALITY_RATING_HIGH) {
      qualityScoreValue = QUALITY_SCORE_HIGH_VALUE;
    } else if (newRating === QUALITY_RATING_MEDIUM) {
      qualityScoreValue = QUALITY_SCORE_MEDIUM_VALUE;
    } else {
      qualityScoreValue = QUALITY_SCORE_LOW_VALUE;
    }

    // Also create AlertLog for central tracking
    const alertLog = new AlertLog({
      userId: business.owner,
      businessId: business._id,
      alertType: ALERT_TYPE_QUALITY_UPDATE,
      severity: newScore === QUALITY_SCORE_RED ? ALERT_SEVERITY_CRITICAL : ALERT_SEVERITY_HIGH,
      title: `Quality Score: ${newScore}`,
      message: `Quality score changed from ${previousScore || QUALITY_SCORE_UNKNOWN} to ${newScore}`,
      whatsappData: {
        phoneNumberId: business.whatsappConfig.phoneNumberId,
        currentRating: newScore,
        previousRating: previousScore,
        qualityScore: qualityScoreValue
      },
      status: ALERT_STATUS_UNREAD
    });

    await alertLog.save();
    logger.info('Quality alert logged', {
      businessId: business._id,
      name: business.name
    });

    // Emit Socket.io event if socket server is available
    const io = global.io;
    if (io) {
      io.to(`business_${business._id}`).emit('quality:rating:changed', {
        businessId: business._id,
        previousScore,
        newScore,
        newRating,
        timestamp: new Date()
      });
      logger.debug('Socket.io event emitted for quality change', {
        businessId: business._id
      });
    }
  } catch (error) {
    logger.error('Error triggering quality alert', {
      businessId: business._id,
      error: error.message
    });
  }
}

/**
 * Main job function - check all businesses
 */
async function runQualityRatingCheck() {
  logger.info('Starting quality rating check job');
  const startTime = Date.now();

  try {
    // Find all active businesses with WhatsApp configured
    const businesses = await Business.find({
      'whatsappConfig.phoneNumberId': { $exists: true, $ne: '' },
      'whatsappConfig.accessToken': { $exists: true, $ne: '' },
      status: BUSINESS_STATUS_ACTIVE,
      isDeleted: false
    }).select('_id name whatsappConfig phoneNumberQuality owner');

    logger.info('Found businesses to check quality', { count: businesses.length });

    const delayBetweenChecks = parseInt(process.env.QUALITY_CHECK_DELAY) || DEFAULT_CHECK_DELAY_MS;
    const results = [];
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));
      }

      const result = await checkBusinessQualityRating(business);
      results.push(result);
    }

    const successCount = results.filter(r => r !== null).length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('Quality rating check completed', {
      total: businesses.length,
      successful: successCount,
      duration: `${duration}s`
    });
  } catch (error) {
    logger.error('Error in quality rating check job', { error: error.message });
  }
}

/**
 * Start the cron job
 */
function startQualityRatingTracker() {
  if (cronJob) {
    logger.debug('Quality rating tracker already running');
    return;
  }

  // Run every 6 hours: 0 */6 * * *
  // For testing: every 5 minutes: */5 * * * *
  cronJob = cron.schedule(CRON_SCHEDULE_6_HOURS, async () => {
    await runQualityRatingCheck();
  }, {
    scheduled: true,
    timezone: CRON_TIMEZONE
  });

  logger.info('Quality rating tracker started (runs every 6 hours)');

  // Optional: Run immediately on startup
  // setTimeout(() => runQualityRatingCheck(), 5000);
}

/**
 * Stop the cron job
 */
function stopQualityRatingTracker() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Quality rating tracker stopped');
  }
}

/**
 * Manually trigger check (for testing)
 */
async function manualCheck() {
  await runQualityRatingCheck();
}

module.exports = {
  startQualityRatingTracker,
  stopQualityRatingTracker,
  manualCheck,
  checkBusinessQualityRating
};
