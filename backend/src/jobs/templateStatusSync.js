/**
 * Template Status Sync Job
 * Syncs template approval status from Meta's WhatsApp API
 * Runs every 15 minutes to keep template statuses current
 * 
 * CRITICAL: Without this job, rejected templates can be used in campaigns,
 * leading to WhatsApp policy violations and account suspension
 */
 
const cron = require('node-cron');
const logger = require('../common/helpers/logger');
const axios = require('axios');
const { Template, Business } = require('../core/database/models');

// Constants for template status sync
const CRON_SCHEDULE_15_MINUTES = '*/15 * * * *'; // Run every 15 minutes
const CRON_TIMEZONE = 'UTC'; // Timezone for cron jobs
const DEFAULT_SYNC_TIMEOUT = 10000; // Default API timeout in ms
const DEFAULT_SYNC_DELAY = 2000; // Default delay between API calls in ms
const DEFAULT_STARTUP_DELAY = 5000; // Default startup delay in ms
const TEMPLATE_STATUS_PENDING = 'pending'; // Pending template status
const TEMPLATE_STATUS_APPROVED = 'approved'; // Approved template status
const TEMPLATE_STATUS_PAUSED = 'paused'; // Paused template status
const TEMPLATE_STATUS_REJECTED = 'REJECTED'; // Rejected by WhatsApp
const TEMPLATE_STATUS_DISABLED = 'DISABLED'; // Disabled by WhatsApp
const API_BASE_URL = 'https://graph.facebook.com'; // Facebook Graph API base URL
const SYNC_REASON_AUTOMATED = 'Automated sync from WhatsApp API'; // Automated sync reason

/**
 * Fetch template status from WhatsApp API
 */
async function fetchTemplateStatus(business, templateName) {
  try {
    if (!business.whatsappConfig?.wabaId || !business.whatsappConfig?.accessToken) {
      throw new Error('Business missing WhatsApp credentials');
    }
    
    const credentials = await business.getWhatsAppCredentials();
     
    const response = await axios.get(
      `${API_BASE_URL}/${credentials.apiVersion}/${credentials.wabaId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        },
        params: {
          name: templateName
        },
        timeout: parseInt(process.env.TEMPLATE_SYNC_TIMEOUT) || DEFAULT_SYNC_TIMEOUT
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      const templateData = response.data.data[0];
      return {
        status: templateData.status, // APPROVED, PENDING, REJECTED, PAUSED, DISABLED
        quality_score: templateData.quality_score,
        id: templateData.id,
        category: templateData.category,
        rejection_reason: templateData.rejection_reason
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching template status', {
      templateName,
      businessId: business._id?.toString(),
      error: error.message
    });
    return null;
  }
}

/**
 * Sync all pending templates with Meta
 */
async function syncTemplateStatuses() {
  const startTime = Date.now();
  
  logger.info('Starting template status sync');
  
  try {
    // Get all templates that are pending or need status update
    const templates = await Template.find({
      status: { $in: [TEMPLATE_STATUS_PENDING, TEMPLATE_STATUS_APPROVED, TEMPLATE_STATUS_PAUSED] }
    }).populate('businessId');

    if (templates.length === 0) {
      logger.debug('No templates to sync');
      return;
    }

    logger.info('Found templates to sync', { count: templates.length });
    
    let updated = 0;
    let errors = 0;
    const delayBetweenCalls = parseInt(process.env.TEMPLATE_SYNC_DELAY) || DEFAULT_SYNC_DELAY;

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCalls));
        }
        
        if (!template.businessId) {
          logger.warn('Template has no business - skipping', {
            templateId: template._id,
            name: template.name
          });
          continue;
        }

        const apiData = await fetchTemplateStatus(
          template.businessId, 
          template.name
        );

        if (apiData) {
          const oldStatus = template.whatsappStatus;
          const newStatus = apiData.status;

          // Update template with new status
          await template.updateStatus({
            whatsappStatus: newStatus,
            reason: apiData.rejection_reason || `Status updated from ${oldStatus} to ${newStatus}`
          });

          // Update quality score if available
          if (apiData.quality_score) {
            await template.updateQualityScore({
              score: apiData.quality_score,
              reason: SYNC_REASON_AUTOMATED
            });
          }

          // Update WhatsApp template ID if not set
          if (apiData.id && !template.whatsappTemplateId) {
            template.whatsappTemplateId = apiData.id;
            await template.save();
          }

          if (oldStatus !== newStatus) {
            logger.info('Template status updated', {
              templateId: template._id,
              name: template.name,
              businessId: template.businessId._id?.toString(),
              oldStatus,
              newStatus
            });
            updated++;

            if (newStatus === TEMPLATE_STATUS_REJECTED) {
              logger.error('Template rejected by WhatsApp', {
                templateId: template._id,
                name: template.name,
                business: template.businessId.name,
                businessId: template.businessId._id?.toString(),
                reason: apiData.rejection_reason
              });
            }

            const stats = await Template.getHealthStats(template.businessId._id);
            await template.businessId.updateTemplateHealth(stats);
          } else {
            logger.debug('Template status unchanged', {
              name: template.name,
              businessId: template.businessId._id?.toString(),
              status: newStatus
            });
          }
        }
      } catch (error) {
        logger.error('Error syncing template', {
          templateId: template._id,
          name: template.name,
          businessId: template.businessId?._id?.toString(),
          error: error.message
        });
        errors++;
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info('Template sync complete', { 
      updated, 
      errors,
      processingTime: processingTime + 'ms'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Template sync failed', { 
      error: error.message,
      processingTime: processingTime + 'ms'
    });
  }
}

/**
 * Initialize the cron job
 */
function startTemplateSync() {
  // Run every 15 minutes
  cron.schedule(CRON_SCHEDULE_15_MINUTES, () => {
    syncTemplateStatuses();
  }, {
    timezone: CRON_TIMEZONE
  });

  logger.info('Template status sync job started', {
    schedule: CRON_SCHEDULE_15_MINUTES,
    timezone: CRON_TIMEZONE
  });
  
  const startupDelay = parseInt(process.env.TEMPLATE_SYNC_STARTUP_DELAY) || DEFAULT_STARTUP_DELAY;
  setTimeout(() => {
    syncTemplateStatuses();
  }, startupDelay);
}

module.exports = { startTemplateSync, syncTemplateStatuses };
