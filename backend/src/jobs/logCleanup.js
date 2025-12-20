const cron = require('node-cron');
const logger = require('../common/helpers/logger');
const AuditLog = require('../core/database/models/AuditLog');
const AlertLog = require('../core/database/models/AlertLog');

// Constants for log retention policies
const RETENTION_AUDIT_LOG_DAYS = 90; // 90 days for audit compliance
const RETENTION_ALERT_LOG_DAYS = 30; // 30 days (includes message errors)
const STATS_PERIOD_30_DAYS = 30; // 30 days period for statistics
const STATS_PERIOD_60_DAYS = 60; // 60 days period for statistics
const STATS_PERIOD_90_DAYS = 90; // 90 days period for statistics
const CRON_SCHEDULE_DAILY_2AM = '0 2 * * *'; // Run daily at 2:00 AM
const ARCHIVE_DIR_PATH = '../logs/archive'; // Archive directory path
const FILE_ENCODING_UTF8 = 'utf8'; // File encoding
const JSON_INDENT_SPACES = 2; // JSON indentation spaces

/**
 * Log Retention Policy Job
 * 
 * Purpose: Clean up old logs to prevent database bloat
 * Schedule: Runs daily at 2:00 AM
 * 
 * Retention Policy:
 * - AuditLog: Keep 90 days (compliance requirement)
 * - AlertLog: Keep 30 days (includes message errors)
 */

const RETENTION_POLICIES = {
  AuditLog: RETENTION_AUDIT_LOG_DAYS,
  AlertLog: RETENTION_ALERT_LOG_DAYS
};

/**
 * Clean up old logs based on retention policy
 */
const cleanupOldLogs = async () => {
  try {
    logger.info('Starting log cleanup process');

    const results = {
      AuditLog: 0,
      AlertLog: 0
    };

    // Clean up AuditLog (90 days)
    const auditLogThreshold = new Date();
    auditLogThreshold.setDate(auditLogThreshold.getDate() - RETENTION_POLICIES.AuditLog);
    
    const auditLogResult = await AuditLog.deleteMany({
      createdAt: { $lt: auditLogThreshold }
    });
    results.AuditLog = auditLogResult.deletedCount;
    logger.info('Deleted AuditLog records', {
      count: auditLogResult.deletedCount,
      retentionDays: RETENTION_POLICIES.AuditLog
    });

    // Clean up AlertLog (30 days)
    const alertLogThreshold = new Date();
    alertLogThreshold.setDate(alertLogThreshold.getDate() - RETENTION_POLICIES.AlertLog);
    
    const alertLogResult = await AlertLog.deleteMany({
      createdAt: { $lt: alertLogThreshold }
    });
    results.AlertLog = alertLogResult.deletedCount;
    logger.info('Deleted AlertLog records', {
      count: alertLogResult.deletedCount,
      retentionDays: RETENTION_POLICIES.AlertLog
    });

    // Summary
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);
    logger.info('Log cleanup completed successfully', {
      totalDeleted,
      breakdown: results
    });

    return {
      success: true,
      results,
      totalDeleted
    };
  } catch (error) {
    logger.error('Error during log cleanup', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get log statistics (for monitoring)
 */
const getLogStatistics = async () => {
  try {
    const stats = {};

    // Count logs by age
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - STATS_PERIOD_30_DAYS);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - STATS_PERIOD_60_DAYS);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - STATS_PERIOD_90_DAYS);

    // AuditLog stats
    stats.AuditLog = {
      total: await AuditLog.countDocuments(),
      last30Days: await AuditLog.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      last60Days: await AuditLog.countDocuments({ createdAt: { $gte: sixtyDaysAgo } }),
      last90Days: await AuditLog.countDocuments({ createdAt: { $gte: ninetyDaysAgo } }),
      retentionDays: RETENTION_POLICIES.AuditLog
    }; 

    // AlertLog stats
    stats.AlertLog = {
      total: await AlertLog.countDocuments(),
      last30Days: await AlertLog.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      retentionDays: RETENTION_POLICIES.AlertLog
    };
 
    return stats;
  } catch (error) {
    logger.error('Error getting log statistics', { error: error.message });
    return null;
  }
};

/**
 * Archive logs before deletion (optional - for compliance)
 * Exports logs to JSON files before deletion
 */
const archiveLogsBeforeDeletion = async (model, threshold, filename) => {
  try {
    const logsToArchive = await model.find({
      createdAt: { $lt: threshold }
    }).lean();

    if (logsToArchive.length > 0) {
      const fs = require('fs');
      const path = require('path');
      
      const archiveDir = path.join(__dirname, ARCHIVE_DIR_PATH);
      
      // Create archive directory if it doesn't exist
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const archivePath = path.join(archiveDir, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(archivePath, JSON.stringify(logsToArchive, null, JSON_INDENT_SPACES));
      
      logger.info('Archived logs before deletion', {
        count: logsToArchive.length,
        path: archivePath
      });
      return logsToArchive.length;
    }

    return 0;
  } catch (error) {
    logger.error('Error archiving logs', { error: error.message });
    return 0;
  }
};

/**
 * Clean up specific log type with optional archival
 */
const cleanupLogType = async (logType, archiveBeforeDelete = false) => {
  try {
    const models = {
      AuditLog: AuditLog,
      AlertLog: AlertLog
    };

    const model = models[logType];
    if (!model) {
      throw new Error(`Unknown log type: ${logType}`);
    }

    const retentionDays = RETENTION_POLICIES[logType];
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - retentionDays);

    // Archive before deletion if requested
    if (archiveBeforeDelete) {
      await archiveLogsBeforeDeletion(model, threshold, logType.toLowerCase());
    }

    // Delete old logs
    const result = await model.deleteMany({
      createdAt: { $lt: threshold }
    });

    logger.info('Deleted log type records', {
      logType,
      count: result.deletedCount,
      retentionDays
    });
    
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    logger.error('Error cleaning up log type', { logType, error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Schedule the log cleanup job
 * Runs daily at 2:00 AM
 */
const scheduleLogCleanup = () => {
  // Run every day at 2:00 AM
  cron.schedule(CRON_SCHEDULE_DAILY_2AM, async () => {
    logger.info('Starting scheduled log cleanup job');
    await cleanupOldLogs();
  });

  logger.info('Log cleanup scheduled to run daily at 2:00 AM');
};

// Export functions
module.exports = {
  cleanupOldLogs,
  getLogStatistics,
  cleanupLogType,
  archiveLogsBeforeDeletion,
  scheduleLogCleanup,
  RETENTION_POLICIES
};
