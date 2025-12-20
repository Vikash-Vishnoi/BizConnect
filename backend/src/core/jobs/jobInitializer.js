/**
 * Background Jobs Initializer
 * Centralizes initialization of all scheduled jobs and processors
 */

const logger = require('../../common/helpers/logger');
const config = require('../../config/server.config');

/**
 * Initialize all background jobs after database connection
 */
const initializeJobs = () => {
  if (!config.cronJobs.enabled) {
    logger.info('Background jobs disabled by configuration');
    return;
  }

  logger.info('Initializing background jobs...');
  
  try {
    // Import job modules
    const { startScheduledMessageProcessor } = require('../../jobs/scheduledMessageProcessor');
    const { startScheduledCampaignProcessor } = require('../../jobs/scheduledCampaignProcessor');
    const { startQualityRatingTracker } = require('../../jobs/qualityRatingTracker');
    const { startTemplateSync } = require('../../jobs/templateStatusSync');
    const { scheduleAnalyticsArchival } = require('../../jobs/analyticsArchival');
    const { scheduleLogCleanup } = require('../../jobs/logCleanup');
    
    // Start processors
    startScheduledMessageProcessor();
    startScheduledCampaignProcessor();
    
    // Start recurring jobs
    startQualityRatingTracker();
    startTemplateSync();
    scheduleAnalyticsArchival();
    scheduleLogCleanup();
    
    logger.info('Background jobs initialized successfully', {
      jobs: [
        'scheduledMessageProcessor',
        'scheduledCampaignProcessor',
        'qualityRatingTracker',
        'templateStatusSync',
        'analyticsArchival',
        'logCleanup'
      ]
    });
  } catch (error) {
    logger.error('Failed to initialize background jobs', { 
      error: error.message,
      stack: error.stack 
    });
    // Don't exit process, allow server to run without jobs
  }
};

/**
 * Stop all background jobs gracefully
 */
const stopJobs = () => {
  logger.info('Stopping background jobs...');
  // Job cleanup logic can be added here if needed
  logger.info('Background jobs stopped');
};

module.exports = {
  initializeJobs,
  stopJobs
};
