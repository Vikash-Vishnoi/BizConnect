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
  validateRecipientLimit,
  validateTemplateApproval 
} = require('../../../core/middlewares/businessSecurity');

// GET / - Get all campaigns
router.get('/', validatePagination, async (req, res) => {
  try {
    const defaultLimit = parseInt(process.env.CAMPAIGNS_DEFAULT_LIMIT || '20');
    const maxLimit = parseInt(process.env.CAMPAIGNS_MAX_LIMIT || '100');
    const { page = 1, limit = defaultLimit, status, sort = '-createdAt' } = req.query;
    const finalLimit = Math.min(parseInt(limit), maxLimit);

    const query = { businessId: req.businessId };
    if (status) query.status = status;

    const campaigns = await Campaign.find(query)
      .populate('templateId', 'name category')
      .sort(sort)
      .limit(finalLimit)
      .skip((parseInt(page) - 1) * finalLimit);

    const total = await Campaign.countDocuments(query);

    res.json({
      success: true,
      count: campaigns.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / finalLimit),
      campaigns
    });
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaigns',
      error: error.message
    });
  }
});

// GET /:id - Get campaign by ID
router.get('/:id', validateCampaignId, async (req, res) => {
  try {
    const defaultRecipientLimit = parseInt(process.env.CAMPAIGN_RECIPIENTS_DEFAULT_LIMIT || '100');
    const { includeRecipients, status, limit = defaultRecipientLimit, skip = 0 } = req.query;

    if (includeRecipients === 'true') {
      // Get campaign with recipients (paginated)
      const result = await campaignService.getCampaignWithRecipients(req.params.id, {
        status,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      if (result.campaign.businessId.toString() !== req.businessId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      return res.json({
        success: true,
        campaign: result.campaign,
        recipients: result.recipients,
        pagination: result.pagination
      });
    }

    // Just get campaign metadata (lightweight)
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    }).populate('templateId');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get fresh stats if using separate recipients
    if (campaign.usesSeparateRecipients) {
      campaign.stats = await campaignService.getCampaignStats(campaign._id);
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign',
      error: error.message
    });
  }
});

// POST / - Create new campaign
router.post('/', 
  validateCreateCampaign,
  validateRecipientLimit,       // SECURITY: Prevent memory exhaustion
  validateTemplateApproval,     // SECURITY: Block unapproved templates
  async (req, res) => {
  try {
    const { name, description, templateId, contactIds, targetAudience, schedule, settings, status } = req.body;

    // Get contacts (either by IDs or query targetAudience)
    let contacts = [];
    
    if (contactIds && contactIds.length > 0) {
      // Specific contact IDs provided
      contacts = await Contact.find({
        _id: { $in: contactIds },
        businessId: req.businessId
      }).lean();
    } else if (targetAudience) {
      // Target audience query (e.g., tags, segments)
      const query = { businessId: req.businessId };
      
      if (targetAudience.tags && targetAudience.tags.length > 0) {
        query.tags = { $in: targetAudience.tags };
      }
      if (targetAudience.segment) {
        query.segment = targetAudience.segment;
      }
      
      contacts = await Contact.find(query)
        .limit(targetAudience.limit || 100000) // Max 100K
        .lean();
    }

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No contacts found for campaign'
      });
    }

    // Create campaign using service (handles CampaignRecipient creation)
    const result = await campaignService.createCampaign({
      businessId: req.businessId,
      name,
      description,
      templateId,
      schedule,
      settings,
      status
    }, contacts);

    res.status(201).json({
      success: true,
      message: `Campaign created successfully with ${result.recipientCount} recipients`,
      campaign: result.campaign,
      recipientCount: result.recipientCount
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
});

// PUT /:id - Update campaign
router.put('/:id', validateUpdateCampaign, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update running campaign'
      });
    }

    const { name, description, schedule, settings, addContactIds } = req.body;

    if (name) campaign.name = name;
    if (description) campaign.description = description;
    if (schedule) campaign.schedule = schedule;
    if (settings) campaign.settings = { ...campaign.settings, ...settings };

    // Add new contacts if provided
    if (addContactIds && addContactIds.length > 0) {
      const contacts = await Contact.find({
        _id: { $in: addContactIds },
        businessId: req.businessId
      }).lean();

      const added = await campaignService.addRecipients(campaign._id, contacts);
      
      await campaign.save();

      return res.json({
        success: true,
        message: `Campaign updated successfully, added ${added} recipients`,
        campaign,
        recipientsAdded: added
      });
    }

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message
    });
  }
});

// GET /:id/recipients - Get campaign recipients (paginated)
router.get('/:id/recipients', validateCampaignId, async (req, res) => {
  try {
    const { status, limit = 100, skip = 0 } = req.query;

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
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

    res.json({
      success: true,
      recipients,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + recipients.length < total
      }
    });
  } catch (error) {
    console.error('Error getting recipients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recipients',
      error: error.message
    });
  }
});

// GET /:id/stats - Get campaign statistics
router.get('/:id/stats', validateCampaignId, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const stats = await campaignService.getCampaignStats(req.params.id);

    res.json({
      success: true,
      stats,
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

// GET /:id/failed - Get failed recipients
router.get('/:id/failed', validateCampaignId, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const failed = await campaignService.getFailedRecipients(req.params.id, parseInt(limit));

    res.json({
      success: true,
      count: failed.length,
      failed
    });
  } catch (error) {
    console.error('Error getting failed recipients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get failed recipients',
      error: error.message
    });
  }
});

// POST /:id/retry - Retry failed recipients
router.post('/:id/retry', validateCampaignId, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const retriedCount = await campaignService.retryFailedRecipients(req.params.id);

    res.json({
      success: true,
      message: `Retrying ${retriedCount} failed recipients`,
      retriedCount
    });
  } catch (error) {
    console.error('Error retrying recipients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry recipients',
      error: error.message
    });
  }
});

module.exports = router;
