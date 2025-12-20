const cron = require('node-cron');
const logger = require('../common/helpers/logger');
const { Campaign } = require('../core/database/models');
const campaignService = require('../modules/campaigns/services/campaignService');

// Constants for scheduled campaign processing
const CRON_SCHEDULE_EVERY_MINUTE = '* * * * *'; // Run every minute
const CAMPAIGN_STATUS_SCHEDULED = 'scheduled'; // Scheduled campaign status
const CAMPAIGN_STATUS_FAILED = 'failed'; // Failed campaign status
const CAMPAIGN_SCHEDULE_TYPE_SCHEDULED = 'scheduled'; // Scheduled type
const DEFAULT_CAMPAIGN_BATCH_SIZE = 50; // Default batch size for processing campaigns
const CRON_TIMEZONE = 'UTC'; // Timezone for cron jobs

let isProcessing = false;

/** 
 * Process scheduled campaigns
 * Runs every minute to check for campaigns that need to be started
 */
const processScheduledCampaigns = async () => {
  // Prevent concurrent processing
  if (isProcessing) {
    logger.debug('Scheduled campaign processor already running, skipping');
    return;
  } 

  isProcessing = true;
  const startTime = Date.now();

  try {
    const now = new Date();
    logger.info('Processing scheduled campaigns', { timestamp: now.toISOString() });

    // Find scheduled campaigns that are due to start
    const campaigns = await Campaign.find({
      status: CAMPAIGN_STATUS_SCHEDULED,
      'schedule.type': CAMPAIGN_SCHEDULE_TYPE_SCHEDULED,
      'schedule.scheduledFor': { $lte: now }
    }).limit(DEFAULT_CAMPAIGN_BATCH_SIZE);

    if (campaigns.length === 0) {
      logger.debug('No scheduled campaigns to process');
      isProcessing = false;
      return;
    }

    logger.info('Found scheduled campaigns to start', { count: campaigns.length });

    let successCount = 0;
    let failCount = 0;

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        logger.info('Starting scheduled campaign', {
          campaignId: campaign._id,
          name: campaign.name,
          businessId: campaign.businessId?.toString()
        });
        
        // Validate campaign has required data
        if (!campaign.businessId) {
          throw new Error('Campaign missing businessId');
        }
        
        // Start the campaign
        await campaignService.startCampaign(campaign._id.toString());
        
        successCount++;
        
        logger.info('Campaign started successfully', { 
          campaignId: campaign._id,
          businessId: campaign.businessId?.toString()
        });

      } catch (error) {
        logger.error('Failed to start campaign', {
          campaignId: campaign._id,
          businessId: campaign.businessId?.toString(),
          error: error.message
        });
        
        // Update campaign status to failed
        try {
          campaign.status = CAMPAIGN_STATUS_FAILED;
          campaign.error = error.message;
          await campaign.save();
        } catch (saveError) {
          logger.error('Failed to update campaign status', {
            campaignId: campaign._id,
            error: saveError.message
          });
        }
        
        failCount++;
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info('Processed scheduled campaigns', {
      total: campaigns.length,
      started: successCount,
      failed: failCount,
      processingTime: processingTime + 'ms'
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error in scheduled campaign processor', { 
      error: error.message,
      processingTime: processingTime + 'ms'
    });
  } finally {
    isProcessing = false;
  }
};

/**
 * Start the cron job
 */
const startScheduledCampaignProcessor = () => {
  logger.info('Starting scheduled campaign processor', {
    schedule: CRON_SCHEDULE_EVERY_MINUTE,
    timezone: CRON_TIMEZONE
  });

  // Run every minute
  cron.schedule(CRON_SCHEDULE_EVERY_MINUTE, () => {
    processScheduledCampaigns();
  }, {
    timezone: CRON_TIMEZONE
  });

  logger.info('Scheduled campaign processor started successfully');
};

module.exports = {
  startScheduledCampaignProcessor,
  processScheduledCampaigns
};
