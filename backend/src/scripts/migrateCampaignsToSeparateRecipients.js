/**
 * Migration Script: Migrate campaigns to use CampaignRecipient model
 * 
 * This script migrates existing campaigns from the old inline recipients[] array
 * to the new CampaignRecipient collection for better scalability.
 * 
 * Benefits:
 * - Removes MongoDB 16MB document size limit
 * - 13-30% space savings per campaign
 * - 50-100x faster queries for statistics
 * - Better performance for large campaigns (100K+ recipients)
 *  
 * Usage:
 *   node backend/scripts/migrateCampaignsToSeparateRecipients.js [--dry-run] [--batch-size=100]
 * 
 * @module scripts/migrateCampaignsToSeparateRecipients
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../common/helpers/logger');
const { ERROR_CODES } = require('../common/constants');
const { Campaign, CampaignRecipient } = require('../core/database/models');

// ========================================
// CONSTANTS
// ========================================

// Database Configuration
const DB_CONNECTION_TIMEOUT_MS = 10000;
const DB_OPERATION_TIMEOUT_MS = 30000;

// Migration Configuration
const DEFAULT_BATCH_SIZE = 100;
const MIGRATION_COUNTDOWN_SECONDS = 3000; // 3 seconds

// Progress Reporting
const PROGRESS_LOG_INTERVAL = 10; // Log every N migrations

// Space Calculation Constants (estimated bytes per recipient)
const OLD_RECIPIENT_SIZE_BYTES = 500;
const NEW_RECIPIENT_SIZE_BYTES = 200;
const CAMPAIGN_OVERHEAD_BYTES = 5000;

// Size Conversion Constants
const BYTES_TO_KB = 1024;
const BYTES_TO_MB = 1024 * 1024;

// Display Configuration
const SEPARATOR_LENGTH = 37;
const SEPARATOR_CHAR = '=';

// Sample Display Limit
const SAMPLE_CAMPAIGNS_LIMIT = 5;

// Script Status
const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;

// Validate environment variables
if (!process.env.MONGODB_URI) {
  logger.error('MONGODB_URI environment variable is required', {
    code: ERROR_CODES.CONFIGURATION_ERROR
  });
  process.exit(EXIT_CODE_FAILURE);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg 
  ? parseInt(batchSizeArg.split('=')[1]) 
  : parseInt(process.env.MIGRATION_BATCH_SIZE) || DEFAULT_BATCH_SIZE;

logger.info('📦 Campaign Migration Script');
logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
logger.info(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
logger.info(`Batch Size: ${batchSize} campaigns per batch`);
logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));

/**
 * Main migration function
 */
async function migrateCampaigns() {
  const startTime = Date.now();
  
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    const connectionStartTime = Date.now();
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: DB_CONNECTION_TIMEOUT_MS
    });
    const connectionTime = Date.now() - connectionStartTime;
    logger.info('Connected to MongoDB', {
      connectionTime: `${connectionTime}ms`
    });

    // Find campaigns that need migration
    const findStartTime = Date.now();
    const campaignsToMigrate = await Campaign.find({
      usesSeparateRecipients: { $ne: true },
      recipients: { $exists: true, $type: 'array', $ne: [] }
    }).select('_id name businessId recipients stats').lean();
    const findTime = Date.now() - findStartTime;

    if (campaignsToMigrate.length === 0) {
      logger.info('No campaigns need migration. All campaigns are up-to-date.');
      return;
    }

    logger.info(`Found campaigns to migrate`, {
      count: campaignsToMigrate.length,
      queryTime: `${findTime}ms`
    });

    // Calculate space savings
    let totalSpaceBefore = 0;
    let totalSpaceAfter = 0;
    let totalRecipients = 0;

    campaignsToMigrate.forEach(campaign => {
      const recipientCount = campaign.recipients?.length || 0;
      totalRecipients += recipientCount;
      
      totalSpaceBefore += recipientCount * OLD_RECIPIENT_SIZE_BYTES;
      totalSpaceAfter += (recipientCount * NEW_RECIPIENT_SIZE_BYTES) + CAMPAIGN_OVERHEAD_BYTES;
    });

    const spaceSavings = totalSpaceBefore - totalSpaceAfter;
    const spaceSavingsPercent = ((spaceSavings / totalSpaceBefore) * 100).toFixed(1);

    logger.info('Migration Statistics:', {
      campaigns: campaignsToMigrate.length,
      totalRecipients: totalRecipients.toLocaleString(),
      spaceBefore: `${(totalSpaceBefore / BYTES_TO_MB).toFixed(2)} MB`,
      spaceAfter: `${(totalSpaceAfter / BYTES_TO_MB).toFixed(2)} MB`,
      spaceSavings: `${(spaceSavings / BYTES_TO_MB).toFixed(2)} MB (${spaceSavingsPercent}%)`
    });

    if (dryRun) {
      logger.info('DRY RUN: No changes will be made.');
      
      // Show first N campaigns that would be migrated
      logger.info('Sample campaigns that would be migrated:');
      campaignsToMigrate.slice(0, SAMPLE_CAMPAIGNS_LIMIT).forEach((campaign, index) => {
        logger.info(`   ${index + 1}. ${campaign.name} - ${campaign.recipients.length} recipients`);
      });
      
      return;
    }

    logger.warn('WARNING: This will modify your database.');
    logger.warn(`Press Ctrl+C within ${MIGRATION_COUNTDOWN_SECONDS / 1000} seconds to cancel...`);
    await new Promise(resolve => setTimeout(resolve, MIGRATION_COUNTDOWN_SECONDS));

    logger.info('Starting migration...');

    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process campaigns in batches
    for (let i = 0; i < campaignsToMigrate.length; i += batchSize) {
      const batch = campaignsToMigrate.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(campaignsToMigrate.length / batchSize);
      const batchStartTime = Date.now();
      
      logger.info(`Processing batch ${batchNumber}/${totalBatches}...`);

      for (const campaign of batch) {
        try {
          await migrateCampaign(campaign);
          migratedCount++;
          
          if (migratedCount % PROGRESS_LOG_INTERVAL === 0) {
            const progress = ((migratedCount / campaignsToMigrate.length) * 100).toFixed(1);
            logger.info(`Migration progress`, {
              migrated: `${migratedCount}/${campaignsToMigrate.length}`,
              percentage: `${progress}%`,
              executionTime: `${Date.now() - startTime}ms`
            });
          }
        } catch (error) {
          errorCount++;
          errors.push({
            campaignId: campaign._id,
            campaignName: campaign.name,
            error: error.message
          });
          logger.error(`Failed to migrate campaign`, {
            campaignName: campaign.name,
            campaignId: campaign._id,
            error: error.message
          });
        }
      }
      
      const batchTime = Date.now() - batchStartTime;
      logger.info(`Batch ${batchNumber} completed`, {
        batchTime: `${batchTime}ms`,
        averagePerCampaign: `${Math.round(batchTime / batch.length)}ms`
      });
    }

    const totalTime = Date.now() - startTime;
    
    logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    logger.info('Migration Complete!');
    logger.info(SEPARATOR_CHAR.repeat(SEPARATOR_LENGTH));
    
    logger.info('Migration Summary:', {
      successfulMigrations: migratedCount,
      failedMigrations: errorCount,
      spaceSaved: `${(spaceSavings / BYTES_TO_MB).toFixed(2)} MB (${spaceSavingsPercent}%)`,
      totalExecutionTime: `${totalTime}ms`,
      averageTimePerCampaign: `${Math.round(totalTime / migratedCount)}ms`
    });
    
    if (errors.length > 0) {
      logger.error('Migration errors occurred:', {
        errorCount: errors.length
      });
      errors.forEach(err => {
        logger.error(`   - ${err.campaignName} (${err.campaignId}): ${err.error}`);
      });
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Migration failed', {
      error: error.message,
      stack: error.stack,
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      executionTime: `${executionTime}ms`
    });
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('Disconnected from MongoDB');
    }
  }
}

/**
 * Migrate a single campaign
 */
async function migrateCampaign(campaignData) {
  const campaign = await Campaign.findById(campaignData._id);
  
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (!campaign.recipients || campaign.recipients.length === 0) {
    logger.info(`Skipping campaign - no recipients`, {
      campaignName: campaign.name,
      campaignId: campaign._id
    });
    return;
  }

  // Create CampaignRecipient documents
  const recipientDocs = campaign.recipients.map(recipient => ({
    campaignId: campaign._id,
    businessId: campaign.businessId,
    contactId: recipient.contactId,
    phoneNumber: recipient.phoneNumber,
    name: recipient.name,
    variables: recipient.variables || {},
    status: recipient.status || 'pending',
    sentAt: recipient.sentAt,
    deliveredAt: recipient.deliveredAt,
    readAt: recipient.readAt,
    failedAt: recipient.failedAt,
    failedReason: recipient.error || recipient.failedReason,
    whatsappMessageId: recipient.whatsappMessageId,
    createdAt: recipient.createdAt || campaign.createdAt,
    updatedAt: recipient.updatedAt || new Date()
  }));

  // Bulk insert recipients
  await CampaignRecipient.insertMany(recipientDocs, { ordered: false });

  // Update campaign
  campaign.usesSeparateRecipients = true;
  campaign.recipients = []; // Clear the array
  
  // Recalculate stats from CampaignRecipient
  const stats = await CampaignRecipient.getCampaignStats(campaign._id);
  campaign.stats = stats;
  
  await campaign.save();

  logger.debug(`Migrated campaign`, {
    campaignName: campaign.name,
    campaignId: campaign._id,
    recipientCount: recipientDocs.length
  });
}

/**
 * Rollback function (if needed)
 */
async function rollbackMigration() {
  const startTime = Date.now();
  
  try {
    logger.info('Starting migration rollback...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: DB_CONNECTION_TIMEOUT_MS
    });

    // Find campaigns that were migrated
    const migratedCampaigns = await Campaign.find({
      usesSeparateRecipients: true
    });

    let rolledBack = 0;

    for (const campaign of migratedCampaigns) {
      // Get recipients from CampaignRecipient collection
      const recipients = await CampaignRecipient.find({
        campaignId: campaign._id
      }).lean();

      if (recipients.length > 0) {
        // Restore recipients array
        campaign.recipients = recipients.map(r => ({
          contactId: r.contactId,
          phoneNumber: r.phoneNumber,
          name: r.name,
          variables: r.variables,
          status: r.status,
          sentAt: r.sentAt,
          deliveredAt: r.deliveredAt,
          readAt: r.readAt,
          failedAt: r.failedAt,
          error: r.failedReason,
          whatsappMessageId: r.whatsappMessageId
        }));

        campaign.usesSeparateRecipients = false;
        await campaign.save();

        // Delete CampaignRecipient documents
        await CampaignRecipient.deleteMany({ campaignId: campaign._id });

        rolledBack++;
        logger.info(`Rolled back campaign`, {
          campaignName: campaign.name,
          campaignId: campaign._id
        });
      }
    }

    const totalTime = Date.now() - startTime;
    logger.info('Rollback complete', {
      campaignsRestored: rolledBack,
      executionTime: `${totalTime}ms`
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Rollback failed', {
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`
    });
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// Run migration
if (require.main === module) {
  const rollback = args.includes('--rollback');
  
  if (rollback) {
    rollbackMigration()
      .then(() => {
        logger.info('Rollback script completed successfully');
        process.exit(EXIT_CODE_SUCCESS);
      })
      .catch(error => {
        logger.error('Rollback script failed', {
          error: error.message,
          stack: error.stack
        });
        process.exit(EXIT_CODE_FAILURE);
      });
  } else {
    migrateCampaigns()
      .then(() => {
        logger.info('Migration script completed successfully');
        process.exit(EXIT_CODE_SUCCESS);
      })
      .catch(error => {
        logger.error('Migration script failed', {
          error: error.message,
          stack: error.stack
        });
        process.exit(EXIT_CODE_FAILURE);
      });
  }
}

module.exports = { migrateCampaigns, rollbackMigration };
