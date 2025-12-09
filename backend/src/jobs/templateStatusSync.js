/**
 * Template Status Sync Job
 * Syncs template approval status from Meta's WhatsApp API
 * Runs every 15 minutes to keep template statuses current
 * 
 * CRITICAL: Without this job, rejected templates can be used in campaigns,
 * leading to WhatsApp policy violations and account suspension
 */
 
const cron = require('node-cron');
const axios = require('axios');
const { Template, Business } = require('../core/database/models');

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
      `https://graph.facebook.com/${credentials.apiVersion}/${credentials.wabaId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        },
        params: {
          name: templateName
        },
        timeout: parseInt(process.env.TEMPLATE_SYNC_TIMEOUT) || 10000
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
    console.error(`Error fetching template status for ${templateName}:`, error.message);
    return null;
  }
}

/**
 * Sync all pending templates with Meta
 */
async function syncTemplateStatuses() {
  console.log('\n🔄 Starting template status sync...');
  
  try {
    // Get all templates that are pending or need status update
    const templates = await Template.find({
      status: { $in: ['pending', 'approved', 'paused'] } // Check pending, approved, and paused
    }).populate('businessId');

    if (templates.length === 0) {
      console.log('✅ No templates to sync');
      return;
    }

    console.log(`📋 Found ${templates.length} templates to sync`);
    
    let updated = 0;
    let errors = 0;
    const delayBetweenCalls = parseInt(process.env.TEMPLATE_SYNC_DELAY) || 2000;

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCalls));
        }
        
        if (!template.businessId) {
          console.log(`⚠️ Template ${template.name} has no business - skipping`);
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
              reason: 'Automated sync from WhatsApp API'
            });
          }

          // Update WhatsApp template ID if not set
          if (apiData.id && !template.whatsappTemplateId) {
            template.whatsappTemplateId = apiData.id;
            await template.save();
          }

          if (oldStatus !== newStatus) {
            console.log(`✅ Updated ${template.name}: ${oldStatus} → ${newStatus}`);
            updated++;

            if (newStatus === 'REJECTED') {
              console.error(`🚨 TEMPLATE REJECTED: ${template.name} (${template.businessId.name})`);
              if (apiData.rejection_reason) {
                console.error(`   Reason: ${apiData.rejection_reason}`);
              }
            }

            const stats = await Template.getHealthStats(template.businessId._id);
            await template.businessId.updateTemplateHealth(stats);
          } else {
            console.log(`   ${template.name}: ${newStatus} (no change)`);
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing template ${template.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Template sync complete: ${updated} updated, ${errors} errors\n`);
  } catch (error) {
    console.error('❌ Template sync failed:', error);
  }
}

/**
 * Initialize the cron job
 */
function startTemplateSync() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    syncTemplateStatuses();
  });

  console.log('✅ Template status sync job started (runs every 15 minutes)');
  
  const startupDelay = parseInt(process.env.TEMPLATE_SYNC_STARTUP_DELAY) || 5000;
  setTimeout(() => {
    syncTemplateStatuses();
  }, startupDelay);
}

module.exports = { startTemplateSync, syncTemplateStatuses };
