const cron = require('node-cron');
const Business = require('../database/models/Business');
const AlertLog = require('../database/models/AlertLog');
const WhatsAppService = require('../services/whatsapp/whatsappService');

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
      console.log(`Skipping business ${business._id} - no phone number configured`);
      return null;
    }

    console.log(`Checking quality rating for business: ${business.name}`);

    // Get WhatsApp credentials and create service instance
    const credentials = await business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Fetch current quality rating from WhatsApp
    const phoneInfo = await whatsappService.getPhoneNumberInfo();
    
    if (!phoneInfo.success || !phoneInfo.data) {
      console.error(`Failed to fetch quality rating for business ${business._id}:`, phoneInfo.error);
      return null;
    }

    const newQualityScore = phoneInfo.data.quality_score || 'UNKNOWN';
    const newQualityRating = phoneInfo.data.quality_rating || 'UNKNOWN';
    const newTier = phoneInfo.data.messaging_limit_tier || 'TIER_1K';
    const nameStatus = phoneInfo.data.name_status || 'NONE';

    // Check if rating changed
    const previousScore = business.phoneNumberQuality?.qualityScore;
    const hasChanged = previousScore !== newQualityScore;

    // Update business phone quality
    await business.updatePhoneQuality({
      score: newQualityScore,
      rating: newQualityRating,
      tier: newTier,
      nameStatus: nameStatus,
      reason: 'Automated quality check'
    });
    
    await business.save();

    console.log(`✓ Quality rating saved for business ${business.name}: ${newQualityScore}${hasChanged ? ' (CHANGED)' : ''}`);

    // If rating changed to YELLOW or RED, trigger alert
    if (hasChanged && (newQualityScore === 'YELLOW' || newQualityScore === 'RED')) {
      await triggerQualityAlert(business, previousScore, newQualityScore, newQualityRating);
    }

    return { business: business._id, qualityScore: newQualityScore, changed: hasChanged };
  } catch (error) {
    console.error(`Error checking quality rating for business ${business._id}:`, error);
    return null;
  }
}

/**
 * Trigger alert when quality rating degrades
 */
async function triggerQualityAlert(business, previousScore, newScore, newRating) {
  try {
    console.log(`🚨 QUALITY ALERT: Business ${business.name} rating changed from ${previousScore || 'UNKNOWN'} to ${newScore}`);

    // Create alert in business alerts array
    await business.addAlert({
      alertType: 'PHONE_NUMBER_QUALITY_UPDATE',
      severity: newScore === 'RED' ? 'CRITICAL' : 'WARNING',
      title: `Phone Quality Score: ${newScore}`,
      description: `Quality score changed from ${previousScore || 'UNKNOWN'} to ${newScore}. Rating: ${newRating}`,
      metadata: {
        previousScore,
        newScore,
        newRating,
        timestamp: new Date(),
        source: 'quality_tracker_job'
      }
    });

    // Also create AlertLog for central tracking
    const alertLog = new AlertLog({
      userId: business.owner,
      businessId: business._id,
      alertType: 'PHONE_NUMBER_QUALITY_UPDATE',
      severity: newScore === 'RED' ? 'CRITICAL' : 'HIGH',
      title: `Quality Score: ${newScore}`,
      message: `Quality score changed from ${previousScore || 'UNKNOWN'} to ${newScore}`,
      whatsappData: {
        phoneNumberId: business.whatsappConfig.phoneNumberId,
        currentRating: newScore,
        previousRating: previousScore,
        qualityScore: newRating === 'HIGH' ? 100 : newRating === 'MEDIUM' ? 50 : 25
      },
      status: 'UNREAD'
    });

    await alertLog.save();
    console.log(`Alert logged for business ${business.name}`);

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
      console.log(`Socket.io event emitted for business ${business.name}`);
    }
  } catch (error) {
    console.error('Error triggering quality alert:', error);
  }
}

/**
 * Main job function - check all businesses
 */
async function runQualityRatingCheck() {
  console.log('🔄 Starting quality rating check job...');
  const startTime = Date.now();

  try {
    // Find all active businesses with WhatsApp configured
    const businesses = await Business.find({
      'whatsappConfig.phoneNumberId': { $exists: true, $ne: '' },
      'whatsappConfig.accessToken': { $exists: true, $ne: '' },
      status: 'active',
      isDeleted: false
    }).select('_id name whatsappConfig phoneNumberQuality owner');

    console.log(`Found ${businesses.length} businesses to check`);

    const delayBetweenChecks = parseInt(process.env.QUALITY_CHECK_DELAY) || 5000;
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

    console.log(`✓ Quality rating check completed: ${successCount}/${businesses.length} successful in ${duration}s`);
  } catch (error) {
    console.error('Error in quality rating check job:', error);
  }
}

/**
 * Start the cron job
 */
function startQualityRatingTracker() {
  if (cronJob) {
    console.log('Quality rating tracker already running');
    return;
  }

  // Run every 6 hours: 0 */6 * * *
  // For testing: every 5 minutes: */5 * * * *
  cronJob = cron.schedule('0 */6 * * *', async () => {
    await runQualityRatingCheck();
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  console.log('✓ Quality rating tracker started (runs every 6 hours)');

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
    console.log('✓ Quality rating tracker stopped');
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
