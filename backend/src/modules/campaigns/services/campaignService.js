/**
 * Campaign Service
 * Handles campaign operations with CampaignRecipient model for scalability
 * @module services/campaignService
 */

const logger = require('../../../common/helpers/logger');
const { Campaign, CampaignRecipient, Template, Contact, Conversation } = require('../../../core/database/models');
const whatsappService = require('../../../integrations/whatsapp/whatsappService');
const { ERROR_CODES } = require('../../../common/constants');

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_DELAY_BETWEEN_BATCHES_MS = 60000; // 1 minute
const MAX_RETRY_COUNT = 3;
const CAMPAIGN_STATUS_RUNNING = 'active';  // Match Campaign model enum
const CAMPAIGN_STATUS_COMPLETED = 'completed';
const CAMPAIGN_STATUS_FAILED = 'failed';
const CAMPAIGN_STATUS_DRAFT = 'draft';
const CAMPAIGN_STATUS_SCHEDULED = 'scheduled';
const TEMPLATE_STATUS_APPROVED = 'approved';
const RECIPIENT_STATUS_PENDING = 'pending';
const RECIPIENT_STATUS_SENT = 'sent';
const RECIPIENT_STATUS_FAILED = 'failed';
const RECIPIENT_STATUS_QUEUED = 'queued';
const RECIPIENT_STATUS_DELIVERED = 'delivered';
const RECIPIENT_STATUS_READ = 'read';
const SCHEDULE_TYPE_IMMEDIATE = 'immediate';
const SCHEDULE_TYPE_SCHEDULED = 'scheduled';
const DEFAULT_RECIPIENT_QUERY_LIMIT = 100;
const DEFAULT_FAILED_RECIPIENTS_LIMIT = 100;

// ============================================
// SERVICE CLASS
// ============================================

class CampaignService {
  
  /**
   * Create campaign with recipients
   * @param {Object} campaignData - Campaign details
   * @param {Array} contactIds - Array of contact IDs or contact objects
   * @returns {Promise<Object>} Created campaign and recipient count
   */
  async createCampaign(campaignData, contacts = []) {
    const startTime = Date.now();
    const { businessId, userId, name, description, templateId, settings, schedule, status } = campaignData;
    
    try {
      logger.info('Creating campaign', {
        businessId: businessId.toString(),
        name,
        contactCount: contacts.length
      });
      
      // Validate template
      const template = await Template.findOne({
        _id: templateId,
        businessId
      });
      
      if (!template) {
        const error = new Error('Template not found');
        error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      
      if (template.status !== TEMPLATE_STATUS_APPROVED) {
        const error = new Error('Template must be approved before creating campaign');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      
      // Determine campaign status
      let campaignStatus = status || CAMPAIGN_STATUS_DRAFT;
      
      // If not explicitly set as draft and schedule is provided
      if (!status && schedule && schedule.type === SCHEDULE_TYPE_SCHEDULED && schedule.scheduledFor) {
        campaignStatus = CAMPAIGN_STATUS_SCHEDULED;
      }
      
      // Create campaign (lightweight - no recipients array)
      const campaign = await Campaign.create({
        businessId,
        userId,
        name,
        description,
        templateId,
        schedule: schedule || { type: SCHEDULE_TYPE_IMMEDIATE },
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
          contactId: contact._id || null, // Allow null for raw recipient data
          phoneNumber: contact.phoneNumber,
          name: contact.name,
          variables: contact.variables || {},
          status: RECIPIENT_STATUS_PENDING
        }));
        
        // Bulk insert (fast even for 100K recipients)
        await CampaignRecipient.insertMany(recipientDocs, { ordered: false });
      }
      
      const processingTime = Date.now() - startTime;
      logger.info('Campaign created successfully', {
        businessId: businessId.toString(),
        campaignId: campaign._id.toString(),
        recipientCount: contacts.length,
        processingTime
      });
      
      return {
        campaign,
        recipientCount: contacts.length
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to create campaign', {
        businessId: businessId.toString(),
        name,
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Add recipients to existing campaign
   * @param {String} campaignId - Campaign ID
   * @param {Array} contacts - Array of contact objects
   */
  async addRecipients(campaignId, contacts) {
    const startTime = Date.now();
    
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        const error = new Error('Campaign not found');
        error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      
      if (campaign.status === CAMPAIGN_STATUS_RUNNING || campaign.status === CAMPAIGN_STATUS_COMPLETED) {
        const error = new Error('Cannot add recipients to running or completed campaign');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      
      const recipientDocs = contacts.map(contact => ({
        campaignId: campaign._id,
        businessId: campaign.businessId,
        contactId: contact._id,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        variables: contact.variables || {},
        status: RECIPIENT_STATUS_PENDING
      }));
      
      await CampaignRecipient.insertMany(recipientDocs, { ordered: false });
      
      // Update campaign stats
      await campaign.updateStats();
      
      const processingTime = Date.now() - startTime;
      logger.info('Recipients added to campaign', {
        businessId: campaign.businessId.toString(),
        campaignId: campaignId.toString(),
        addedCount: recipientDocs.length,
        processingTime
      });
      
      return recipientDocs.length;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to add recipients to campaign', {
        campaignId: campaignId.toString(),
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Start campaign - processes recipients in batches
   * @param {String} campaignId - Campaign ID
   * @param {Object} options - Processing options
   */
  async startCampaign(campaignId, options = {}) {
    const startTime = Date.now();
    
    try {
      const { 
        batchSize = DEFAULT_BATCH_SIZE, 
        delayBetweenBatches = DEFAULT_DELAY_BETWEEN_BATCHES_MS
      } = options;
      
      const campaign = await Campaign.findById(campaignId).populate('templateId');
      
      if (!campaign) {
        const error = new Error('Campaign not found');
        error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      
      if (campaign.status === CAMPAIGN_STATUS_RUNNING) {
        const error = new Error('Campaign is already running');
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
      }
      
      // Update campaign status
      campaign.status = CAMPAIGN_STATUS_RUNNING;
      campaign.startedAt = new Date();
      await campaign.save();
      
      const processingTime = Date.now() - startTime;
      logger.info('Campaign started', {
        businessId: campaign.businessId.toString(),
        campaignId: campaignId.toString(),
        batchSize,
        delayBetweenBatches,
        processingTime
      });
      
      // Start background processing (non-blocking)
      this.processCampaignInBackground(campaign, batchSize, delayBetweenBatches);
      
      return campaign;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to start campaign', {
        campaignId: campaignId.toString(),
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
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
          status: RECIPIENT_STATUS_PENDING
        })
        .limit(batchSize)
        .lean();
        
        if (recipients.length === 0) {
          // All done!
          campaign.status = CAMPAIGN_STATUS_COMPLETED;
          campaign.completedAt = new Date();
          await campaign.save();
          break;
        }
        
        // Process batch
        await this.processBatch(campaign, recipients);
        
        processedCount += recipients.length;
        logger.info('Campaign batch processed', {
          businessId: campaign.businessId.toString(),
          campaignId: campaign._id.toString(),
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
        businessId: campaign.businessId.toString(),
        campaignId: campaign._id.toString(),
        totalProcessed: processedCount
      });
      
    } catch (error) {
      logger.error('Campaign processing failed', {
        businessId: campaign.businessId.toString(),
        campaignId: campaign._id.toString(),
        error: error.message,
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
        stack: error.stack
      });
      campaign.status = CAMPAIGN_STATUS_FAILED;
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
              status: RECIPIENT_STATUS_QUEUED,
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
            status: RECIPIENT_STATUS_SENT,
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
                direction: 'out',
                status: RECIPIENT_STATUS_SENT,
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
          businessId: campaign.businessId.toString(),
          campaignId: campaign._id.toString(),
          recipientId: recipient._id.toString(),
          phoneNumber: recipient.phoneNumber,
          error: error.message,
          errorCode: error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR
        });
        
        // Mark as failed
        await CampaignRecipient.updateOne(
          { _id: recipient._id },
          {
            status: RECIPIENT_STATUS_FAILED,
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
    const startTime = Date.now();
    
    try {
      const { 
        status, 
        limit = DEFAULT_RECIPIENT_QUERY_LIMIT, 
        skip = 0 
      } = options;
      
      const campaign = await Campaign.findById(campaignId).populate('templateId');
      
      if (!campaign) {
        const error = new Error('Campaign not found');
        error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      
      // Get recipients
      const query = { campaignId };
      if (status) query.status = status;
      
      const [recipients, total] = await Promise.all([
        CampaignRecipient.find(query)
          .populate('contactId', 'phoneNumber name')
          .limit(limit)
          .skip(skip)
          .lean(),
        CampaignRecipient.countDocuments(query)
      ]);
      
      const processingTime = Date.now() - startTime;
      logger.info('Retrieved campaign with recipients', {
        businessId: campaign.businessId.toString(),
        campaignId: campaignId.toString(),
        recipientCount: recipients.length,
        total,
        processingTime
      });
      
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
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get campaign with recipients', {
        campaignId: campaignId.toString(),
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Get campaign statistics
   * @param {String} campaignId - Campaign ID
   */
  async getCampaignStats(campaignId) {
    const startTime = Date.now();
    
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        const error = new Error('Campaign not found');
        error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      
      let stats;
      if (campaign.usesSeparateRecipients) {
        // Get fresh stats from CampaignRecipient collection
        stats = await CampaignRecipient.getCampaignStats(campaignId);
      } else {
        // Legacy: return stats from campaign document
        stats = campaign.stats;
      }
      
      const processingTime = Date.now() - startTime;
      logger.info('Retrieved campaign stats', {
        businessId: campaign.businessId.toString(),
        campaignId: campaignId.toString(),
        processingTime
      });
      
      return stats;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get campaign stats', {
        campaignId: campaignId.toString(),
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Get failed recipients
   * @param {String} campaignId - Campaign ID
   */
  async getFailedRecipients(campaignId, limit = DEFAULT_FAILED_RECIPIENTS_LIMIT) {
    const startTime = Date.now();
    
    try {
      const recipients = await CampaignRecipient.find({
        campaignId,
        status: RECIPIENT_STATUS_FAILED
      })
      .limit(limit)
      .lean();
      
      const processingTime = Date.now() - startTime;
      logger.info('Retrieved failed recipients', {
        campaignId: campaignId.toString(),
        count: recipients.length,
        processingTime
      });
      
      return recipients;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get failed recipients', {
        campaignId: campaignId.toString(),
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Retry failed recipients
   * @param {String} campaignId - Campaign ID
   */
  async retryFailedRecipients(campaignId) {
    const startTime = Date.now();
    
    try {
      const campaign = await Campaign.findById(campaignId).populate('templateId');
      
      if (!campaign) {
        const error = new Error('Campaign not found');
        error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
        throw error;
      }
      
      // Reset failed recipients to pending
      const result = await CampaignRecipient.updateMany(
        {
          campaignId,
          status: RECIPIENT_STATUS_FAILED,
          retryCount: { $lt: MAX_RETRY_COUNT }
        },
        {
          $set: { status: RECIPIENT_STATUS_PENDING },
          $inc: { retryCount: 1 }
        }
      );
      
      const processingTime = Date.now() - startTime;
      logger.info('Campaign recipients reset for retry', {
        businessId: campaign.businessId.toString(),
        campaignId: campaignId.toString(),
        resetCount: result.modifiedCount,
        processingTime
      });
      
      // Start processing again
      if (campaign.status !== CAMPAIGN_STATUS_RUNNING) {
        await this.startCampaign(campaignId);
      }
      
      return result.modifiedCount;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to retry failed recipients', {
        campaignId: campaignId.toString(),
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Update recipient status (called from webhook)
   * @param {String} whatsappMessageId - WhatsApp message ID
   * @param {String} status - New status (delivered, read, failed)
   * @param {Object} metadata - Additional metadata
   */
  async updateRecipientStatus(whatsappMessageId, status, metadata = {}) {
    const startTime = Date.now();
    
    try {
      const recipient = await CampaignRecipient.findOne({ whatsappMessageId });
      
      if (!recipient) {
        return null; // Not a campaign message
      }
      
      const update = { status };
      
      if (status === RECIPIENT_STATUS_DELIVERED) update.deliveredAt = new Date();
      if (status === RECIPIENT_STATUS_READ) update.readAt = new Date();
      if (status === RECIPIENT_STATUS_FAILED) {
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
      
      const processingTime = Date.now() - startTime;
      logger.info('Recipient status updated', {
        businessId: recipient.businessId.toString(),
        campaignId: recipient.campaignId.toString(),
        recipientId: recipient._id.toString(),
        newStatus: status,
        processingTime
      });
      
      return recipient;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to update recipient status', {
        whatsappMessageId,
        status,
        error: error.message,
        errorCode: error.code,
        processingTime
      });
      throw error;
    }
  }
  
  /**
   * Helper: Check rate limit for contact
   * @private
   */
  async checkRateLimit(phoneNumber) {
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
    
    // P0 FIX: Add button components for FLOW and CATALOG types
    if (template.components) {
      template.components.forEach(component => {
        if (component.type === 'BUTTONS' && component.buttons) {
          const buttonParams = [];
          
          component.buttons.forEach(btn => {
            // Flow button support
            if (btn.type === 'FLOW' && btn.flowId) {
              buttonParams.push({
                type: 'button',
                sub_type: 'flow',
                index: btn.index || 0,
                parameters: [{
                  type: 'action',
                  action: {
                    flow_token: btn.flowToken || 'unused',
                    flow_action_data: btn.flowActionData || {}
                  }
                }]
              });
            }
            
            // Catalog button support
            if (btn.type === 'CATALOG' && btn.catalogId) {
              buttonParams.push({
                type: 'button',
                sub_type: 'catalog',
                index: btn.index || 0,
                parameters: [{
                  type: 'action',
                  action: {
                    thumbnail_product_retailer_id: btn.thumbnailProductId || ''
                  }
                }]
              });
            }
            
            // P3 FIX: MPM (Multi-Product Message) button support
            if (btn.type === 'MPM' && btn.catalogId) {
              buttonParams.push({
                type: 'button',
                sub_type: 'mpm',
                index: btn.index || 0,
                parameters: [{
                  type: 'action',
                  action: {
                    catalog_id: btn.catalogId,
                    sections: btn.sections || []
                  }
                }]
              });
            }
          });
          
          if (buttonParams.length > 0) {
            components.push(...buttonParams);
          }
        }
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
