const cron = require('node-cron');
const mongoose = require('mongoose');
const Analytics = require('../core/database/models/Analytics');

const ANALYTICS_HOT_DATA_DAYS = parseInt(process.env.ANALYTICS_HOT_DATA_DAYS) || 90;
const ANALYTICS_RETENTION_DAYS = parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365;
const ANALYTICS_CACHE_RETENTION_DAYS = parseInt(process.env.ANALYTICS_CACHE_RETENTION_DAYS) || 7;
const ARCHIVE_COLLECTION = 'analytics_archive';
const TEMPLATE_ARCHIVE_COLLECTION = 'template_analytics_archive';

const archiveOldAnalytics = async () => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - ANALYTICS_HOT_DATA_DAYS);

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - ANALYTICS_RETENTION_DAYS);

    console.log('[Analytics Archive] Starting archival process...');
    console.log(`[Analytics Archive] Archive threshold: ${ninetyDaysAgo.toISOString()}`);
    console.log(`[Analytics Archive] Delete threshold: ${oneYearAgo.toISOString()}`);

    const analyticsToArchive = await Analytics.find({
      createdAt: {
        $gte: oneYearAgo,
        $lt: ninetyDaysAgo
      }
    }).lean();

    if (analyticsToArchive.length > 0) {
      // Insert into archive collection
      const ArchiveModel = mongoose.model(
        'AnalyticsArchive',
        Analytics.schema,
        ARCHIVE_COLLECTION
      );
      
      await ArchiveModel.insertMany(analyticsToArchive, { ordered: false });
      
      // Delete from main collection
      const analyticsIds = analyticsToArchive.map(a => a._id);
      await Analytics.deleteMany({ _id: { $in: analyticsIds } });
      
      console.log(`[Analytics Archive] Archived ${analyticsToArchive.length} analytics records`);
    } else {
      console.log('[Analytics Archive] No analytics records to archive');
    }

    // Step 2: Delete data older than 365 days from archive
    const deletedCount = await Analytics.deleteMany({
      createdAt: { $lt: oneYearAgo }
    });
    
    if (deletedCount.deletedCount > 0) {
      console.log(`[Analytics Archive] Deleted ${deletedCount.deletedCount} records older than 1 year`);
    }

    // ❌ REMOVED: Template Analytics archival - TemplateAnalytics model doesn't exist
    // Template usage stats are now stored in Template model's usage field
    console.log('[Analytics Archive] Template analytics archival skipped (uses Template.usage field)');

    console.log('[Analytics Archive] Archival process completed successfully');
    
    return {
      success: true,
      archivedAnalytics: analyticsToArchive.length,
      archivedTemplateAnalytics: 0,
      deletedOldRecords: deletedCount.deletedCount,
      deletedCacheRecords: 0
    };
  } catch (error) {
    console.error('[Analytics Archive] Error during archival:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Query archived analytics (helper function for reports)
 */
const queryArchivedAnalytics = async (query, options = {}) => {
  try {
    const ArchiveModel = mongoose.model(
      'AnalyticsArchive',
      Analytics.schema,
      ARCHIVE_COLLECTION
    );
    
    return await ArchiveModel.find(query, null, options).lean();
  } catch (error) {
    console.error('[Analytics Archive] Error querying archive:', error);
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
        'AnalyticsArchive',
        Analytics.schema,
        ARCHIVE_COLLECTION
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
    console.error('[Analytics Archive] Error counting analytics:', error);
    return 0;
  }
};

/**
 * Schedule the archival job
 * Runs daily at 3:00 AM
 */
const scheduleAnalyticsArchival = () => {
  // Run every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Analytics Archive] Starting scheduled archival job...');
    await archiveOldAnalytics();
  });

  console.log('[Analytics Archive] Scheduled to run daily at 3:00 AM');
};

module.exports = {
  archiveOldAnalytics,
  queryArchivedAnalytics,
  getAnalyticsCountWithArchive,
  scheduleAnalyticsArchival
};
