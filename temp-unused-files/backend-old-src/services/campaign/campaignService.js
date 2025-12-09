/**
 * Campaign Service
 * Handles campaign operations with CampaignRecipient model for scalability
 * @module services/campaignService
 */

const logger = require('../../utils/helpers/logger');
const { Campaign, CampaignRecipient, Template, Contact, Conversation } = require('../../database/models');
const whatsappService = require('../whatsapp/whatsappService');

class CampaignService {
  
  /**
   * Create campaign with recipients
   * @param {Object} campaignData - Campaign details
   * @param {Array} contactIds - Array of contact IDs or contact objects
   * @returns {Promise<Object>} Created campaign and recipient count
   */
  async createCampaign(campaignData, contacts = []) {
    const { businessId, name, description, templateId, settings, schedule, status } = campaignData;
    
    // Validate template
    const template = await Template.findOne({
      _id: templateId,
      businessId
    });
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    if (template.status !== 'approved') {
      throw new Error('Template must be approved before creating campaign');
    }
    
    // Determine campaign status
    let campaignStatus = status || 'draft'; // Use provided status or default to draft
    
    // If not explicitly set as draft and schedule is provided
    if (!status && schedule && schedule.type === 'scheduled' && schedule.scheduledFor) {
      campaignStatus = 'scheduled';
    }
    
    // Create campaign (lightweight - no recipients array)
    const campaign = await Campaign.create({
      businessId,
      name,
      description,
      templateId,
      schedule: schedule || { type: 'immediate' },
      settings: settings || {},
      status: campaignStatus,
      usesSeparateRecipients: true,
      stats: {
        total: contacts.length,
        pending: contacts.length,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      }
    });
    
    // Create recipients in bulk (efficient for 100K+)
    if (contacts.length > 0) {
      const recipientDocs = contacts.map(contact => ({
        campaignId: campaign._id,
        businessId,
        contactId: contact._id,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        variables: contact.variables || {},
        status: 'pending'
      }));
      
      // Bulk insert (fast even for 100K recipients)
      await CampaignRecipient.insertMany(recipientDocs, { ordered: false });
    }
    
    return {
      campaign,
      recipientCount: contacts.length
    };
  }
  
  /**
   * Add recipients to existing campaign
   * @param {String} campaignId - Campaign ID
   * @param {Array} contacts - Array of contact objects
   */
  async addRecipients(campaignId, contacts) {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.status === 'running' || campaign.status === 'completed') {
      throw new Error('Cannot add recipients to running or completed campaign');
    }
    
    const recipientDocs = contacts.map(contact => ({
      campaignId: campaign._id,
      businessId: campaign.businessId,
      contactId: contact._id,
      phoneNumber: contact.phoneNumber,
      name: contact.name,
      variables: contact.variables || {},
      status: 'pending'
    }));
    
    await CampaignRecipient.insertMany(recipientDocs, { ordered: false });
    
    // Update campaign stats
    await campaign.updateStats();
    
    return recipientDocs.length;
  }
  
  /**
   * Start campaign - processes recipients in batches
   * @param {String} campaignId - Campaign ID
   * @param {Object} options - Processing options
   */
  async startCampaign(campaignId, options = {}) {
    const { 
      batchSize = 1000, 
      delayBetweenBatches = 60000 // 1 minute
    } = options;
    
    const campaign = await Campaign.findById(campaignId).populate('templateId');
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.status === 'running') {
      throw new Error('Campaign is already running');
    }
    
    // Update campaign status
    campaign.status = 'running';
    campaign.startedAt = new Date();
    await campaign.save();
    
    // Start background processing (non-blocking)
    this.processCampaignInBackground(campaign, batchSize, delayBetweenBatches);
    
    return campaign;
  }
  
  /**
   * Process campaign in background (async)
   * @private
   */
  async processCampaignInBackground(campaign, batchSize, delayBetweenBatches) {
    try {
      let processedCount = 0;
      
      while (true) {
        // Get next batch of pending recipients
        const recipients = await CampaignRecipient.find({
          campaignId: campaign._id,
          status: 'pending'
        })
        .limit(batchSize)
        .lean();
        
        if (recipients.length === 0) {
          // All done!
          campaign.status = 'completed';
          campaign.completedAt = new Date();
          await campaign.save();
          break;
        }
        
        // Process batch
        await this.processBatch(campaign, recipients);
        
        processedCount += recipients.length;
        logger.info('Campaign batch processed', {
          campaignId: campaign._id,
          processedCount,
          batchSize: recipients.length
        });
        
        // Update stats
        await campaign.updateStats();
        
        // Rate limiting delay
        if (recipients.length === batchSize) {
          await this.delay(delayBetweenBatches);
        }
      }
      
      logger.info('Campaign completed successfully', {
        campaignId: campaign._id,
        totalProcessed: processedCount
      });
      
    } catch (error) {
      logger.error('Campaign processing failed', {
        campaignId: campaign._id,
        error: error.message,
        stack: error.stack
      });
      campaign.status = 'failed';
      await campaign.save();
    }
  }
  
  /**
   * Process a batch of recipients
   * @private
   */
  async processBatch(campaign, recipients) {
    const template = campaign.templateId;
    
    for (const recipient of recipients) {
      try {
        // Check rate limit
        const rateLimit = await this.checkRateLimit(recipient.phoneNumber);
        
        if (!rateLimit.allowed) {
          // Queue for later
          await CampaignRecipient.updateOne(
            { _id: recipient._id },
            {
              status: 'queued',
              queuedForRateLimit: true,
              scheduledSendAt: rateLimit.windowResetAt,
              queuedAt: new Date()
            }
          );
          continue;
        }
        
        // Build message with variables
        let messageText = template.content;
        if (recipient.variables) {
          Object.keys(recipient.variables).forEach((key, index) => {
            messageText = messageText.replace(`{{${index + 1}}}`, recipient.variables[key]);
          });
        }
        
        // Send via WhatsApp
        const result = await whatsappService.sendTemplate({
          businessId: campaign.businessId,
          to: recipient.phoneNumber,
          templateName: template.name,
          templateLanguage: template.language,
          components: this.buildTemplateComponents(template, recipient.variables)
        });
        
        // Update recipient status
        await CampaignRecipient.updateOne(
          { _id: recipient._id },
          {
            status: 'sent',
            sentAt: new Date(),
            whatsappMessageId: result.messageId
          }
        );
        
        // Store minimal reference in conversation
        await Conversation.updateOne(
          {
            businessId: campaign.businessId,
            phoneNumber: recipient.phoneNumber
          },
          {
            $push: {
              messages: {
                campaignId: campaign._id,
                recipientId: recipient._id,
                type: 'campaign',
                direction: 'outgoing',
                status: 'sent',
                timestamp: new Date(),
                whatsappMessageId: result.messageId
              }
            },
            $set: { lastMessageAt: new Date() }
          },
          { upsert: true }
        );
        
        // Increment rate limit counter
        await this.incrementRateLimit(recipient.phoneNumber);
        
      } catch (error) {
        logger.error('Failed to send campaign message to recipient', {
          campaignId: campaign._id,
          recipientId: recipient._id,
          phoneNumber: recipient.phoneNumber,
          error: error.message
        });
        
        // Mark as failed
        await CampaignRecipient.updateOne(
          { _id: recipient._id },
          {
            status: 'failed',
            failedAt: new Date(),
            failedReason: error.message,
            errorCode: error.code
          }
        );
      }
    }
  }
  
  /**
   * Get campaign with recipient details
   * @param {String} campaignId - Campaign ID
   * @param {Object} options - Query options
   */
  async getCampaignWithRecipients(campaignId, options = {}) {
    const { 
      status, 
      limit = 100, 
      skip = 0 
    } = options;
    
    const campaign = await Campaign.findById(campaignId).populate('templateId');
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Get recipients
    const query = { campaignId };
    if (status) query.status = status;
    
    const [recipients, total] = await Promise.all([
      CampaignRecipient.find(query)
        .limit(limit)
        .skip(skip)
        .lean(),
      CampaignRecipient.countDocuments(query)
    ]);
    
    return {
      campaign,
      recipients,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + recipients.length < total
      }
    };
  }
  
  /**
   * Get campaign statistics
   * @param {String} campaignId - Campaign ID
   */
  async getCampaignStats(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.usesSeparateRecipients) {
      // Get fresh stats from CampaignRecipient collection
      return await CampaignRecipient.getCampaignStats(campaignId);
    } else {
      // Legacy: return stats from campaign document
      return campaign.stats;
    }
  }
  
  /**
   * Get failed recipients
   * @param {String} campaignId - Campaign ID
   */
  async getFailedRecipients(campaignId, limit = 100) {
    return await CampaignRecipient.find({
      campaignId,
      status: 'failed'
    })
    .limit(limit)
    .lean();
  }
  
  /**
   * Retry failed recipients
   * @param {String} campaignId - Campaign ID
   */
  async retryFailedRecipients(campaignId) {
    const campaign = await Campaign.findById(campaignId).populate('templateId');
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Reset failed recipients to pending
    const result = await CampaignRecipient.updateMany(
      {
        campaignId,
        status: 'failed',
        retryCount: { $lt: 3 }  // Max 3 retries
      },
      {
        $set: { status: 'pending' },
        $inc: { retryCount: 1 }
      }
    );
    
    logger.info('Campaign recipients reset for retry', {
      campaignId,
      resetCount: result.modifiedCount
    });
    
    // Start processing again
    if (campaign.status !== 'running') {
      await this.startCampaign(campaignId);
    }
    
    return result.modifiedCount;
  }
  
  /**
   * Update recipient status (called from webhook)
   * @param {String} whatsappMessageId - WhatsApp message ID
   * @param {String} status - New status (delivered, read, failed)
   * @param {Object} metadata - Additional metadata
   */
  async updateRecipientStatus(whatsappMessageId, status, metadata = {}) {
    const recipient = await CampaignRecipient.findOne({ whatsappMessageId });
    
    if (!recipient) {
      return null; // Not a campaign message
    }
    
    const update = { status };
    
    if (status === 'delivered') update.deliveredAt = new Date();
    if (status === 'read') update.readAt = new Date();
    if (status === 'failed') {
      update.failedAt = new Date();
      update.failedReason = metadata.error || 'Unknown error';
      update.errorCode = metadata.errorCode;
    }
    
    await CampaignRecipient.updateOne({ _id: recipient._id }, update);
    
    // Update campaign stats
    const campaign = await Campaign.findById(recipient.campaignId);
    if (campaign && campaign.usesSeparateRecipients) {
      await campaign.updateStats();
    }
    
    return recipient;
  }
  
  /**
   * Helper: Check rate limit for contact
   * @private
   */
  async checkRateLimit(phoneNumber) {
    // This would integrate with your rate limiting service
    // Returning mock data for now
    return { allowed: true, messageCount: 0, windowResetAt: null };
  }
  
  /**
   * Helper: Increment rate limit counter
   * @private
   */
  async incrementRateLimit(phoneNumber) {
    // Integrate with rate limiting service
    // Implementation depends on your rate limiting logic
  }
  
  /**
   * Helper: Build template components for WhatsApp
   * @private
   */
  buildTemplateComponents(template, variables) {
    const components = [];
    
    if (variables && Object.keys(variables).length > 0) {
      const parameters = Object.keys(variables).map((key, index) => ({
        type: 'text',
        text: variables[key]
      }));
      
      components.push({
        type: 'body',
        parameters
      });
    }
    
    return components;
  }
  
  /**
   * Helper: Delay promise
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CampaignService();
