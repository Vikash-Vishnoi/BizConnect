/**
 * Campaign Management Routes - CRUD operations
 * @module routes/campaigns/campaignManagementRoutes
 */

const express = require('express');
const router = express.Router();
const { Campaign, Template, Contact, CampaignRecipient } = require('../../../core/database/models');
const campaignService = require('../services/campaignService');
const { validateCreateCampaign, validateUpdateCampaign, validateCampaignId, validatePagination } = require('../../../core/middlewares/validation');
const {  
  checkMessagingLimits,
  validateTemplateApproval 
} = require('../../../core/middlewares/authorization');
const { NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_CAMPAIGNS_LIMIT = 20;
const MAX_CAMPAIGNS_LIMIT = 100;
const DEFAULT_RECIPIENT_LIMIT = 100;
const DEFAULT_SKIP = 0;
const MAX_CONTACTS_LIMIT = 100000;
const STRING_TRUE = 'true';
const SORT_CREATED_DESC = '-createdAt';
const STATUS_RUNNING = 'running';

// GET / - Get all campaigns
router.get('/', validatePagination, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const defaultLimit = parseInt(process.env.CAMPAIGNS_DEFAULT_LIMIT || DEFAULT_CAMPAIGNS_LIMIT);
    const maxLimit = parseInt(process.env.CAMPAIGNS_MAX_LIMIT || MAX_CAMPAIGNS_LIMIT);
    const { page = DEFAULT_PAGE, limit = defaultLimit, status, sort = SORT_CREATED_DESC } = req.query;
    const finalLimit = Math.min(parseInt(limit), maxLimit);

    const query = { businessId: req.businessId };
    if (status) query.status = status;

    const campaigns = await Campaign.find(query)
      .populate('templateId', 'name category')
      .sort(sort)
      .limit(finalLimit)
      .skip((parseInt(page) - 1) * finalLimit);

    const total = await Campaign.countDocuments(query);

    const processingTime = Date.now() - startTime;
    logger.info('Campaigns retrieved', {
      ...context,
      businessId: req.businessId.toString(),
      count: campaigns.length,
      total,
      page: parseInt(page),
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: campaigns.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / finalLimit),
        campaigns
      },
      message: 'Campaigns retrieved'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrieving campaigns', {
      ...context,
      businessId: req.businessId.toString(),
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// GET /:id - Get campaign by ID
router.get('/:id', validateCampaignId, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  console.log('🔍 GET Campaign by ID - START', {
    campaignId: req.params.id,
    businessId: req.businessId,
    query: req.query
  });

  try {
    const defaultRecipientLimit = parseInt(process.env.CAMPAIGN_RECIPIENTS_DEFAULT_LIMIT || DEFAULT_RECIPIENT_LIMIT);
    const { includeRecipients, status, limit = defaultRecipientLimit, skip = DEFAULT_SKIP } = req.query;
    
    console.log('📝 Query params processed:', { includeRecipients, status, limit, skip });

    if (includeRecipients === STRING_TRUE) {
      console.log('📦 Fetching campaign WITH recipients...');
      // Get campaign with recipients (paginated)
      const result = await campaignService.getCampaignWithRecipients(req.params.id, {
        status,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      if (result.campaign.businessId.toString() !== req.businessId) {
        throw new ValidationError('Access denied', ERROR_CODES.ACCESS_DENIED);
      }

      const processingTime = Date.now() - startTime;
      logger.info('Campaign with recipients retrieved', {
        ...context,
        businessId: req.businessId.toString(),
        campaignId: req.params.id,
        recipientCount: result.recipients.length,
        processingTime
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          campaign: result.campaign,
          recipients: result.recipients,
          pagination: result.pagination
        },
        message: 'Campaign with recipients retrieved'
      });
    }

    // Just get campaign metadata (lightweight)
    console.log('🔎 Fetching campaign metadata only...');
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    }).populate('templateId');

    console.log('✅ Campaign found:', campaign ? 'YES' : 'NO');

    if (!campaign) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.CAMPAIGN_NOT_FOUND);
    }

    console.log('📊 Checking usesSeparateRecipients:', campaign.usesSeparateRecipients);

    // Get fresh stats if using separate recipients
    if (campaign.usesSeparateRecipients) {
      console.log('⏳ Fetching campaign stats...');
      try {
        campaign.stats = await Promise.race([
          campaignService.getCampaignStats(campaign._id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Stats fetch timeout')), 5000))
        ]);
        console.log('✅ Stats fetched:', campaign.stats);
      } catch (err) {
        console.error('⚠️ Failed to fetch stats, using default:', err.message);
        campaign.stats = campaign.stats || { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      }
    }

    console.log('📤 Sending response...');
    const processingTime = Date.now() - startTime;
    logger.info('Campaign retrieved', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { campaign },
      message: 'Campaign retrieved'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrieving campaign', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// POST / - Create new campaign
router.post('/', 
  validateCreateCampaign,
  validateTemplateApproval,     // SECURITY: Block unapproved templates
  async (req, res) => {
    const startTime = Date.now();
    const context = req.businessContext || {};

    try {
      logger.info('📝 Campaign creation started', { 
        businessId: req.businessId?.toString(), 
        userId: req.userId?.toString(),
        userIdType: typeof req.userId,
        businessIdType: typeof req.businessId
      });
      
      const { name, description, templateId, contactIds, targetAudience, schedule, settings, status } = req.body;
      
      logger.info('📝 Request body parsed', { name, templateId, status });

      logger.info('📝 Extracting contacts...', { 
        hasContactIds: !!contactIds,
        hasTargetAudience: !!targetAudience,
        targetAudienceType: targetAudience?.type,
        targetAudienceContactsLength: targetAudience?.contacts?.length
      });

      // Get contacts (either by IDs, query targetAudience, or raw recipient data)
      let contacts = [];
      
      if (contactIds && contactIds.length > 0) {
        // Specific contact IDs provided
        contacts = await Contact.find({
          _id: { $in: contactIds },
          businessId: req.businessId
        }).lean();
      } else if (targetAudience) {
        // Check if raw recipient data provided (for manual campaign creation)
        if (targetAudience.contacts && Array.isArray(targetAudience.contacts)) {
          // Raw recipient data: { phoneNumber, name, variables }
          logger.info('📝 Processing raw recipient data', { count: targetAudience.contacts.length });
          contacts = targetAudience.contacts.map(recipient => ({
            _id: null, // No contact ID for raw data
            phoneNumber: recipient.phoneNumber,
            name: recipient.name || '',
            variables: recipient.variables || {}
          }));
          logger.info('📝 Mapped contacts:', { count: contacts.length, sample: contacts[0] });
        } else {
          // Target audience query (e.g., tags, segments)
          const query = { businessId: req.businessId };
          
          if (targetAudience.tags && targetAudience.tags.length > 0) {
            query.tags = { $in: targetAudience.tags };
          }
          if (targetAudience.segment) {
            query.segment = targetAudience.segment;
          }
          
          contacts = await Contact.find(query)
            .limit(targetAudience.limit || MAX_CONTACTS_LIMIT)
            .lean();
        }
      }

      if (contacts.length === 0) {
        logger.info('📝 No contacts found, checking if draft...', { status });
        // Allow empty contacts for draft status
        if (status !== 'draft') {
          throw new ValidationError('No contacts found for campaign', ERROR_CODES.NO_CONTACTS_FOUND);
        }
      }

      logger.info('📝 Calling campaign service...', { contactsCount: contacts.length });

      // Prepare campaign data payload
      const campaignPayload = {
        businessId: req.businessId,
        userId: req.userId, // Required field
        name,
        description,
        templateId,
        schedule,
        settings,
        status
      };
      
      logger.info('📝 Campaign payload prepared', {
        hasBusinessId: !!campaignPayload.businessId,
        hasUserId: !!campaignPayload.userId,
        businessIdValue: campaignPayload.businessId?.toString(),
        userIdValue: campaignPayload.userId?.toString()
      });

      // Create campaign using service (handles CampaignRecipient creation)
      const result = await campaignService.createCampaign(campaignPayload, contacts);

      const processingTime = Date.now() - startTime;
      logger.info('Campaign created', {
        ...context,
        businessId: req.businessId.toString(),
        campaignId: result.campaign._id.toString(),
        recipientCount: result.recipientCount,
        processingTime
      });

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          campaign: result.campaign,
          recipientCount: result.recipientCount
        },
        message: `Campaign created successfully with ${result.recipientCount} recipients`
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ FATAL: Campaign creation crashed', {
        ...context,
        businessId: req.businessId?.toString(),
        error: error.message,
        stack: error.stack,
        processingTime
      });
      
      // Send error response if not already sent
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Campaign creation failed',
          details: error.message,
          errorCode: error.code || 'INTERNAL_ERROR'
        });
      }
    }
  });

// PUT /:id - Update campaign
router.put('/:id', validateUpdateCampaign, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.CAMPAIGN_NOT_FOUND);
    }

    if (campaign.status === STATUS_RUNNING) {
      throw new ValidationError('Cannot update running campaign', ERROR_CODES.CAMPAIGN_RUNNING);
    }

    const { name, description, schedule, settings, addContactIds, targetAudience } = req.body;

    if (name) campaign.name = name;
    if (description) campaign.description = description;
    if (schedule) campaign.schedule = schedule;
    if (settings) campaign.settings = { ...campaign.settings, ...settings };

    // Add new contacts if provided
    let recipientsAdded = 0;
    if (addContactIds && addContactIds.length > 0) {
      const contacts = await Contact.find({
        _id: { $in: addContactIds },
        businessId: req.businessId
      }).lean();

      recipientsAdded = await campaignService.addRecipients(campaign._id, contacts);
    } else if (targetAudience && targetAudience.contacts && Array.isArray(targetAudience.contacts)) {
      // Handle raw recipient data (for draft updates)
      logger.info('📝 Updating campaign with raw recipient data', { count: targetAudience.contacts.length });
      
      // Check current recipient count to avoid unnecessary operations
      const currentCount = await CampaignRecipient.countDocuments({ campaignId: campaign._id });
      
      // Only update recipients if count changed or forced update
      if (currentCount !== targetAudience.contacts.length) {
        logger.info('📝 Recipient count changed, updating...', { 
          before: currentCount, 
          after: targetAudience.contacts.length 
        });
        
        const contacts = targetAudience.contacts.map(recipient => ({
          _id: null,
          phoneNumber: recipient.phoneNumber,
          name: recipient.name || '',
          variables: recipient.variables || {}
        }));
        
        // For large updates (>10K), use efficient bulk operations
        if (currentCount > 10000 || targetAudience.contacts.length > 10000) {
          logger.warn('⚠️ Large recipient update detected, using bulk operations');
          // Delete in chunks to avoid timeout
          const deleteChunkSize = 10000;
          let deletedTotal = 0;
          while (deletedTotal < currentCount) {
            const result = await CampaignRecipient.deleteMany({ campaignId: campaign._id }).limit(deleteChunkSize);
            deletedTotal += result.deletedCount || deleteChunkSize;
            if (result.deletedCount === 0) break;
          }
        } else {
          // For smaller updates, simple delete all
          await CampaignRecipient.deleteMany({ campaignId: campaign._id });
        }
        
        // Add new recipients (service method handles bulk insert efficiently)
        recipientsAdded = await campaignService.addRecipients(campaign._id, contacts);
        
        // Update stats
        campaign.stats.total = recipientsAdded;
        campaign.stats.pending = recipientsAdded;
      } else {
        logger.info('📝 Recipient count unchanged, skipping recipient update');
      }
    }
    
    await campaign.save();

    if (recipientsAdded > 0) {
      const processingTime = Date.now() - startTime;
      logger.info('Campaign updated with recipients', {
        ...context,
        businessId: req.businessId.toString(),
        campaignId: req.params.id,
        recipientsAdded,
        processingTime
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          campaign,
          recipientsAdded
        },
        message: `Campaign updated successfully, added ${recipientsAdded} recipients`
      });
    }

    await campaign.save();

    const processingTime = Date.now() - startTime;
    logger.info('Campaign updated', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error updating campaign', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// GET /:id/recipients - Get campaign recipients (paginated)
router.get('/:id/recipients', validateCampaignId, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const { status, limit = DEFAULT_RECIPIENT_LIMIT, skip = DEFAULT_SKIP } = req.query;

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.CAMPAIGN_NOT_FOUND);
    }

    const query = { campaignId: req.params.id };
    if (status) query.status = status;

    const [recipients, total] = await Promise.all([
      CampaignRecipient.find(query)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      CampaignRecipient.countDocuments(query)
    ]);

    const processingTime = Date.now() - startTime;
    logger.info('Recipients retrieved', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      recipientCount: recipients.length,
      total,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        recipients,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + recipients.length < total
        }
      },
      message: 'Recipients retrieved successfully'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrieving recipients', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// GET /:id/stats - Get campaign statistics
router.get('/:id/stats', validateCampaignId, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.CAMPAIGN_NOT_FOUND);
    }

    const stats = await campaignService.getCampaignStats(req.params.id);

    const processingTime = Date.now() - startTime;
    logger.info('Campaign stats retrieved', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        stats,
        campaign: {
          _id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          createdAt: campaign.createdAt,
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt
        }
      },
      message: 'Campaign stats retrieved successfully'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrieving campaign stats', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// GET /:id/failed - Get failed recipients
router.get('/:id/failed', validateCampaignId, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const { limit = DEFAULT_RECIPIENT_LIMIT } = req.query;

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.CAMPAIGN_NOT_FOUND);
    }

    const failed = await campaignService.getFailedRecipients(req.params.id, parseInt(limit));

    const processingTime = Date.now() - startTime;
    logger.info('Failed recipients retrieved', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      failedCount: failed.length,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        count: failed.length,
        failed
      },
      message: 'Failed recipients retrieved successfully'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrieving failed recipients', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// POST /:id/retry - Retry failed recipients
router.post('/:id/retry', validateCampaignId, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.CAMPAIGN_NOT_FOUND);
    }

    const retriedCount = await campaignService.retryFailedRecipients(req.params.id);

    const processingTime = Date.now() - startTime;
    logger.info('Retrying failed recipients', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      retriedCount,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: `Retrying ${retriedCount} failed recipients`,
        retriedCount
      },
      message: `Retrying ${retriedCount} failed recipients`
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error retrying failed recipients', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

// DELETE /:id - Delete campaign (typically for draft campaigns)
router.delete('/:id', validateCampaignId, async (req, res) => {
  const startTime = Date.now();
  const context = req.businessContext || {};

  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Only allow deletion of draft campaigns
    if (campaign.status !== 'draft') {
      throw new ValidationError('Only draft campaigns can be deleted');
    }

    // Delete associated campaign recipients
    await CampaignRecipient.deleteMany({ campaignId: campaign._id });

    // Delete the campaign
    await Campaign.deleteOne({ _id: campaign._id });

    const processingTime = Date.now() - startTime;
    logger.info('Campaign deleted', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      campaignName: campaign.name,
      processingTime
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error deleting campaign', {
      ...context,
      businessId: req.businessId.toString(),
      campaignId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
});

module.exports = router;
