const cron = require('node-cron');
const { Campaign } = require('../database/models');
const campaignService = require('../services/campaign/campaignService');

let isProcessing = false;

/** 
 * Process scheduled campaigns
 * Runs every minute to check for campaigns that need to be started
 */
const processScheduledCampaigns = async () => {
  // Prevent concurrent processing
  if (isProcessing) {
    console.log('⏳ Scheduled campaign processor already running, skipping...');
    return;
  } 

  isProcessing = true;

  try {
    const now = new Date();
    console.log(`🕐 [${now.toISOString()}] Processing scheduled campaigns...`);

    // Find scheduled campaigns that are due to start
    const campaigns = await Campaign.find({
      status: 'scheduled',
      'schedule.type': 'scheduled',
      'schedule.scheduledFor': { $lte: now }
    }).limit(50); // Process 50 campaigns at a time

    if (campaigns.length === 0) {
      console.log('✅ No scheduled campaigns to process');
      isProcessing = false;
      return;
    }

    console.log(`📢 Found ${campaigns.length} scheduled campaigns to start`);

    let successCount = 0;
    let failCount = 0;

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        console.log(`🚀 Starting campaign: ${campaign.name} (${campaign._id})`);
        
        // Validate campaign has required data
        if (!campaign.businessId) {
          throw new Error('Campaign missing businessId');
        }
        
        // Start the campaign
        await campaignService.startCampaign(campaign._id.toString());
        
        successCount++;
        
        console.log(`✅ Campaign ${campaign._id} started successfully`);

      } catch (error) {
        console.error(`❌ Failed to start campaign ${campaign._id}:`, error.message);
        
        // Update campaign status to failed
        try {
          campaign.status = 'failed';
          campaign.error = error.message;
          await campaign.save();
        } catch (saveError) {
          console.error(`❌ Failed to update campaign status:`, saveError.message);
        }
        
        failCount++;
      }
    }

    console.log(`✅ Processed ${campaigns.length} campaigns: ${successCount} started, ${failCount} failed`);

  } catch (error) {
    console.error('❌ Error in scheduled campaign processor:', error);
  } finally {
    isProcessing = false;
  }
};

/**
 * Start the cron job
 */
const startScheduledCampaignProcessor = () => {
  console.log('🚀 Starting scheduled campaign processor (runs every minute)...');

  // Run every minute: '* * * * *'
  cron.schedule('* * * * *', () => {
    processScheduledCampaigns();
  });

  console.log('✅ Scheduled campaign processor started');
};

module.exports = {
  startScheduledCampaignProcessor,
  processScheduledCampaigns
};
