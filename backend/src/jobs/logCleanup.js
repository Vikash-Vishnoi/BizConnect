const cron = require('node-cron');
const AuditLog = require('../core/database/models/AuditLog');
const AlertLog = require('../core/database/models/AlertLog');

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
  AuditLog: 90,      // 90 days for audit compliance
  AlertLog: 30       // 30 days (includes message errors)
};

/**
 * Clean up old logs based on retention policy
 */
const cleanupOldLogs = async () => {
  try {
    console.log('[Log Cleanup] Starting log cleanup process...');

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
    console.log(`[Log Cleanup] Deleted ${auditLogResult.deletedCount} AuditLog records older than ${RETENTION_POLICIES.AuditLog} days`);

    // Clean up AlertLog (30 days)
    const alertLogThreshold = new Date();
    alertLogThreshold.setDate(alertLogThreshold.getDate() - RETENTION_POLICIES.AlertLog);
    
    const alertLogResult = await AlertLog.deleteMany({
      createdAt: { $lt: alertLogThreshold }
    });
    results.AlertLog = alertLogResult.deletedCount;
    console.log(`[Log Cleanup] Deleted ${alertLogResult.deletedCount} AlertLog records older than ${RETENTION_POLICIES.AlertLog} days`);

    // Summary
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);
    console.log(`[Log Cleanup] Total records deleted: ${totalDeleted}`);
    console.log('[Log Cleanup] Cleanup process completed successfully');

    return {
      success: true,
      results,
      totalDeleted
    };
  } catch (error) {
    console.error('[Log Cleanup] Error during cleanup:', error);
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
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

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
    console.error('[Log Cleanup] Error getting log statistics:', error);
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
      
      const archiveDir = path.join(__dirname, '../logs/archive');
      
      // Create archive directory if it doesn't exist
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const archivePath = path.join(archiveDir, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(archivePath, JSON.stringify(logsToArchive, null, 2));
      
      console.log(`[Log Cleanup] Archived ${logsToArchive.length} logs to ${archivePath}`);
      return logsToArchive.length;
    }

    return 0;
  } catch (error) {
    console.error('[Log Cleanup] Error archiving logs:', error);
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

    console.log(`[Log Cleanup] Deleted ${result.deletedCount} ${logType} records older than ${retentionDays} days`);
    
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    console.error(`[Log Cleanup] Error cleaning up ${logType}:`, error);
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
  cron.schedule('0 2 * * *', async () => {
    console.log('[Log Cleanup] Starting scheduled cleanup job...');
    await cleanupOldLogs();
  });

  console.log('[Log Cleanup] Scheduled to run daily at 2:00 AM');
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
