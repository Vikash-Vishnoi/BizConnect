const cron = require('node-cron');
const User = require('../models/User');
const QualityRating = require('../models/QualityRating');
const whatsappService = require('../services/whatsappService');

/**
 * Quality Rating Tracker Job
 * Periodically checks quality rating for all active users
 * Runs every 6 hours
 */

let cronJob = null;

/**
 * Check quality rating for a single user
 */
async function checkUserQualityRating(user) {
  try {
    if (!user.whatsappPhoneNumberId) {
      console.log(`Skipping user ${user._id} - no phone number configured`);
      return null;
    }

    console.log(`Checking quality rating for user: ${user.email}`);

    // Fetch current quality rating from WhatsApp
    const ratingResult = await whatsappService.getQualityRating();
    
    if (!ratingResult.success) {
      console.error(`Failed to fetch quality rating for user ${user._id}:`, ratingResult.error);
      return null;
    }

    // Check if rating changed
    const latestRating = await QualityRating.getLatestRating(user._id);
    const hasChanged = !latestRating || latestRating.rating !== ratingResult.rating;

    // Get account limits for additional context
    const limitsResult = await whatsappService.getAccountLimits();

    // Save to database
    const qualityRecord = new QualityRating({
      userId: user._id,
      phoneNumberId: user.whatsappPhoneNumberId,
      rating: ratingResult.rating,
      tier: limitsResult.tier || 'TIER_1K',
      messagingLimit: limitsResult.messagingLimit || 1000,
      nameStatus: limitsResult.nameStatus || 'UNKNOWN',
      codeVerificationStatus: limitsResult.codeVerificationStatus || 'UNKNOWN',
      metadata: {
        source: 'cron_job',
        hasChanged,
        previousRating: latestRating ? latestRating.rating : null
      }
    });

    await qualityRecord.save();

    console.log(`✓ Quality rating saved for user ${user.email}: ${ratingResult.rating}${hasChanged ? ' (CHANGED)' : ''}`);

    // If rating changed to YELLOW or RED, trigger alert
    if (hasChanged && (ratingResult.rating === 'YELLOW' || ratingResult.rating === 'MEDIUM' || ratingResult.rating === 'RED' || ratingResult.rating === 'LOW')) {
      await triggerQualityAlert(user, latestRating?.rating, ratingResult.rating);
    }

    return qualityRecord;
  } catch (error) {
    console.error(`Error checking quality rating for user ${user._id}:`, error);
    return null;
  }
}

/**
 * Trigger alert when quality rating degrades
 */
async function triggerQualityAlert(user, previousRating, newRating) {
  try {
    console.log(`🚨 QUALITY ALERT: User ${user.email} rating changed from ${previousRating || 'UNKNOWN'} to ${newRating}`);

    // TODO: Implement alert mechanisms
    // - Socket.io event to frontend
    // - Email notification
    // - SMS notification
    // - Push notification
    // - Log to AlertLog model

    const AlertLog = require('../models/AlertLog');
    
    const alertLog = new AlertLog({
      userId: user._id,
      type: 'quality_rating_degraded',
      severity: newRating === 'RED' || newRating === 'LOW' ? 'critical' : 'warning',
      message: `Quality rating changed from ${previousRating || 'UNKNOWN'} to ${newRating}`,
      metadata: {
        previousRating,
        newRating,
        timestamp: new Date()
      },
      read: false
    });

    await alertLog.save();
    console.log(`Alert logged for user ${user.email}`);

    // Emit Socket.io event if socket server is available
    const io = global.io;
    if (io && user.socketId) {
      io.to(user.socketId).emit('quality:rating:changed', {
        previousRating,
        newRating,
        timestamp: new Date()
      });
      console.log(`Socket.io event emitted to user ${user.email}`);
    }
  } catch (error) {
    console.error('Error triggering quality alert:', error);
  }
}

/**
 * Main job function - check all users
 */
async function runQualityRatingCheck() {
  console.log('🔄 Starting quality rating check job...');
  const startTime = Date.now();

  try {
    // Find all active users with WhatsApp configured
    const users = await User.find({
      whatsappAccessToken: { $exists: true, $ne: '' },
      whatsappPhoneNumberId: { $exists: true, $ne: '' }
    }).select('_id email whatsappPhoneNumberId socketId');

    console.log(`Found ${users.length} users to check`);

    // Check each user (with rate limiting to avoid API overload)
    const results = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Add delay between checks to avoid rate limits (5 seconds)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const result = await checkUserQualityRating(user);
      results.push(result);
    }

    const successCount = results.filter(r => r !== null).length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✓ Quality rating check completed: ${successCount}/${users.length} successful in ${duration}s`);
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
  checkUserQualityRating
};
