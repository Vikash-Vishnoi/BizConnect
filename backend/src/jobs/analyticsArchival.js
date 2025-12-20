const cron = require('node-cron');
const logger = require('../common/helpers/logger');
const mongoose = require('mongoose');
const Analytics = require('../core/database/models/Analytics');

// Constants for analytics archival
const DEFAULT_ANALYTICS_HOT_DATA_DAYS = 90; // Default days for hot data retention
const DEFAULT_ANALYTICS_RETENTION_DAYS = 365; // Default days for total retention
const DEFAULT_ANALYTICS_CACHE_RETENTION_DAYS = 7; // Default days for cache retention
const ANALYTICS_ARCHIVE_COLLECTION = 'analytics_archive'; // Archive collection name
const TEMPLATE_ARCHIVE_COLLECTION = 'template_analytics_archive'; // Template archive collection name
const ARCHIVE_MODEL_NAME = 'AnalyticsArchive'; // Archive model name
const ARCHIVE_INSERT_ORDERED = false; // Disable ordered inserts for performance
const CRON_SCHEDULE_DAILY_3AM = '0 3 * * *'; // Daily at 3:00 AM
const CRON_TIMEZONE = 'UTC'; // Timezone for cron jobs

// Environment-based configuration with defaults
const ANALYTICS_HOT_DATA_DAYS = parseInt(process.env.ANALYTICS_HOT_DATA_DAYS) || DEFAULT_ANALYTICS_HOT_DATA_DAYS;
const ANALYTICS_RETENTION_DAYS = parseInt(process.env.ANALYTICS_RETENTION_DAYS) || DEFAULT_ANALYTICS_RETENTION_DAYS;
const ANALYTICS_CACHE_RETENTION_DAYS = parseInt(process.env.ANALYTICS_CACHE_RETENTION_DAYS) || DEFAULT_ANALYTICS_CACHE_RETENTION_DAYS;

const archiveOldAnalytics = async () => {
  const startTime = Date.now();
  
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - ANALYTICS_HOT_DATA_DAYS);

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - ANALYTICS_RETENTION_DAYS);

    logger.info('Starting analytics archival process', {
      archiveThreshold: ninetyDaysAgo.toISOString(),
      deleteThreshold: oneYearAgo.toISOString()
    });

    const analyticsToArchive = await Analytics.find({
      createdAt: {
        $gte: oneYearAgo,
        $lt: ninetyDaysAgo
      }
    }).lean();

    if (analyticsToArchive.length > 0) {
      // Insert into archive collection
      const ArchiveModel = mongoose.model(
        ARCHIVE_MODEL_NAME,
        Analytics.schema,
        ANALYTICS_ARCHIVE_COLLECTION
      );
      
      await ArchiveModel.insertMany(analyticsToArchive, { ordered: ARCHIVE_INSERT_ORDERED });
      
      // Delete from main collection
      const analyticsIds = analyticsToArchive.map(a => a._id);
      await Analytics.deleteMany({ _id: { $in: analyticsIds } });
      
      logger.info('Archived analytics records', { count: analyticsToArchive.length });
    } else {
      logger.debug('No analytics records to archive');
    }

    // Step 2: Delete data older than 365 days from archive
    const deletedCount = await Analytics.deleteMany({
      createdAt: { $lt: oneYearAgo }
    });
    
    if (deletedCount.deletedCount > 0) {
      logger.info('Deleted old analytics records', { count: deletedCount.deletedCount });
    }

    // ❌ REMOVED: Template Analytics archival - TemplateAnalytics model doesn't exist
    // Template usage stats are now stored in Template model's usage field
    logger.debug('Template analytics archival skipped (uses Template.usage field)');

    const processingTime = Date.now() - startTime;
    
    logger.info('Analytics archival process completed successfully', {
      processingTime: processingTime + 'ms'
    });
    
    return {
      success: true,
      archivedAnalytics: analyticsToArchive.length,
      archivedTemplateAnalytics: 0,
      deletedOldRecords: deletedCount.deletedCount,
      deletedCacheRecords: 0,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Error during analytics archival', { 
      error: error.message,
      processingTime: processingTime + 'ms'
    });
    
    return {
      success: false,
      error: error.message,
      processingTime
    };
  }
};

/**
 * Query archived analytics (helper function for reports)
 */
const queryArchivedAnalytics = async (query, options = {}) => {
  try {
    const ArchiveModel = mongoose.model(
      ARCHIVE_MODEL_NAME,
      Analytics.schema,
      ANALYTICS_ARCHIVE_COLLECTION
    );
    
    return await ArchiveModel.find(query, null, options).lean();
  } catch (error) {
    logger.error('Error querying archived analytics', { error: error.message });
    return [];
  }
};

const getAnalyticsCountWithArchive = async (businessId, startDate, endDate) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - ANALYTICS_HOT_DATA_DAYS);

    let count = 0;

    if (endDate >= ninetyDaysAgo) {
      count += await Analytics.countDocuments({
        businessId,
        createdAt: {
          $gte: startDate > ninetyDaysAgo ? startDate : ninetyDaysAgo,
          $lte: endDate
        }
      });
    }

    // Query archive if date range includes old data
    if (startDate < ninetyDaysAgo) {
      const ArchiveModel = mongoose.model(
        ARCHIVE_MODEL_NAME,
        Analytics.schema,
        ANALYTICS_ARCHIVE_COLLECTION
      );
      
      count += await ArchiveModel.countDocuments({
        businessId,
        createdAt: {
          $gte: startDate,
          $lt: endDate < ninetyDaysAgo ? endDate : ninetyDaysAgo
        }
      });
    }

    return count;
  } catch (error) {
    logger.error('Error counting analytics with archive', { error: error.message });
    return 0;
  }
};

/**
 * Schedule the archival job
 * Runs daily at 3:00 AM
 */
const scheduleAnalyticsArchival = () => {
  // Run every day at 3:00 AM
  cron.schedule(CRON_SCHEDULE_DAILY_3AM, async () => {
    logger.info('Starting scheduled analytics archival job');
    await archiveOldAnalytics();
  }, {
    timezone: CRON_TIMEZONE
  });

  logger.info('Analytics archival scheduled', {
    schedule: CRON_SCHEDULE_DAILY_3AM,
    timezone: CRON_TIMEZONE
  });
};

module.exports = {
  archiveOldAnalytics,
  queryArchivedAnalytics,
  getAnalyticsCountWithArchive,
  scheduleAnalyticsArchival
};
