const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// @route   GET /api/campaigns
// @desc    Get all campaigns for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('templateId', 'name category status')
      .exec();

    const count = await Campaign.countDocuments(query);

    res.json({
      campaigns,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get campaign by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('templateId');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// @route   POST /api/campaigns
// @desc    Create new campaign
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, templateId, message, scheduledAt, recipients, settings } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    // Format recipients
    const formattedRecipients = recipients.map(r => ({
      phoneNumber: whatsappService.formatPhoneNumber(r.phoneNumber),
      name: r.name || null,
      variables: r.variables || {},
      status: 'pending'
    }));

    const campaign = new Campaign({
      name,
      description,
      templateId: templateId || null,
      message,
      scheduledAt: scheduledAt || null,
      recipients: formattedRecipients,
      settings: settings || {},
      userId: req.userId,
      status: scheduledAt ? 'scheduled' : 'draft'
    });

    await campaign.save();

    // If not scheduled, can start immediately if requested
    if (!scheduledAt && req.body.startNow) {
      // Start campaign in background
      startCampaign(campaign._id, req.app.get('io'));
    }

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// @route   PUT /api/campaigns/:id
// @desc    Update campaign
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Can't update active or completed campaigns
    if (['active', 'completed'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot update ${campaign.status} campaign` });
    }

    const { name, description, templateId, message, scheduledAt, recipients, settings } = req.body;

    if (name) campaign.name = name;
    if (description !== undefined) campaign.description = description;
    if (templateId !== undefined) campaign.templateId = templateId;
    if (message !== undefined) campaign.message = message;
    if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt;
    if (settings) campaign.settings = { ...campaign.settings, ...settings };
    
    if (recipients) {
      campaign.recipients = recipients.map(r => ({
        phoneNumber: whatsappService.formatPhoneNumber(r.phoneNumber),
        name: r.name || null,
        variables: r.variables || {},
        status: 'pending'
      }));
    }

    await campaign.save();

    res.json({
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// @route   POST /api/campaigns/:id/start
// @desc    Start a campaign
// @access  Private
router.post('/:id/start', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'active') {
      return res.status(400).json({ error: 'Campaign is already active' });
    }

    if (campaign.status === 'completed') {
      return res.status(400).json({ error: 'Campaign is already completed' });
    }

    campaign.status = 'active';
    campaign.startedAt = new Date();
    await campaign.save();

    // Start sending messages in background
    startCampaign(campaign._id, req.app.get('io'));

    res.json({
      message: 'Campaign started successfully',
      campaign
    });
  } catch (error) {
    console.error('Start campaign error:', error);
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

// @route   POST /api/campaigns/:id/pause
// @desc    Pause a campaign
// @access  Private
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ error: 'Only active campaigns can be paused' });
    }

    campaign.status = 'paused';
    await campaign.save();

    res.json({
      message: 'Campaign paused successfully',
      campaign
    });
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

// @route   DELETE /api/campaigns/:id
// @desc    Delete campaign
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Can't delete active campaigns
    if (campaign.status === 'active') {
      return res.status(400).json({ error: 'Cannot delete active campaign. Pause it first.' });
    }

    await campaign.deleteOne();

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Background function to send campaign messages
async function startCampaign(campaignId, io) {
  try {
    const campaign = await Campaign.findById(campaignId).populate('templateId');
    if (!campaign) return;

    const sendRate = campaign.settings.sendRate || 10; // messages per minute
    const delayMs = (60 * 1000) / sendRate; // delay between messages

    for (let i = 0; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i];

      // Skip if not pending
      if (recipient.status !== 'pending') continue;

      // Check if campaign was paused
      const currentCampaign = await Campaign.findById(campaignId);
      if (currentCampaign.status === 'paused') break;

      try {
        let result;

        if (campaign.templateId) {
          // Send template message
          const template = campaign.templateId;
          
          // Build components with variables (convert to plain objects to avoid circular references)
          let components = [];
          
          // Only add components if there are actual variables to send
          if (recipient.variables && Object.keys(recipient.variables).length > 0) {
            const templateComponents = template.components ? JSON.parse(JSON.stringify(template.components)) : [];
            const bodyComponent = templateComponents.find(c => c.type === 'BODY');
            
            if (bodyComponent) {
              const parameters = Object.values(recipient.variables).map(value => ({
                type: 'text',
                text: String(value)
              }));
              
              if (parameters.length > 0) {
                components.push({
                  type: 'body',
                  parameters
                });
              }
            }
          }
          // If no variables, send empty array (hello_world template doesn't need parameters)
          components = components.length > 0 ? components : [];

          result = await whatsappService.sendTemplateMessage(
            recipient.phoneNumber,
            String(template.name),
            String(template.language),
            components
          );
        } else {
          // Send text message
          result = await whatsappService.sendTextMessage(
            recipient.phoneNumber,
            campaign.message
          );
        }

        // Update recipient status
        if (result.success) {
          campaign.recipients[i].status = 'sent';
          campaign.recipients[i].sentAt = new Date();
          campaign.recipients[i].whatsappMessageId = result.messageId;

          // Create message record
          await Message.create({
            conversationId: await getOrCreateConversation(recipient.phoneNumber, campaign.userId),
            whatsappMessageId: result.messageId,
            from: process.env.WHATSAPP_PHONE_NUMBER_ID,
            to: recipient.phoneNumber,
            direction: 'outgoing',
            type: campaign.templateId ? 'template' : 'text',
            content: {
              text: campaign.message,
              templateName: campaign.templateId?.name
            },
            status: 'sent',
            campaignId: campaign._id,
            userId: campaign.userId
          });
        } else {
          campaign.recipients[i].status = 'failed';
          campaign.recipients[i].failedReason = result.error?.message || 'Unknown error';
          console.error(`❌ WhatsApp API Error for ${recipient.phoneNumber}:`, result.error);
        }

        await campaign.save();

        // Emit progress update via Socket.io
        io.to(`user:${campaign.userId}`).emit('campaign:progress', {
          campaignId: campaign._id,
          progress: campaign.getProgress(),
          stats: campaign.stats
        });

      } catch (error) {
        console.error(`Error sending to ${recipient.phoneNumber}:`, error);
        campaign.recipients[i].status = 'failed';
        campaign.recipients[i].failedReason = error.message;
        await campaign.save();
      }

      // Wait before next message
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Mark campaign as completed
    campaign.status = 'completed';
    campaign.completedAt = new Date();
    await campaign.save();

    // Emit completion event
    io.to(`user:${campaign.userId}`).emit('campaign:completed', {
      campaignId: campaign._id,
      stats: campaign.stats
    });

  } catch (error) {
    console.error('Campaign execution error:', error);
  }
}

// Helper function to get or create conversation
async function getOrCreateConversation(phoneNumber, userId) {
  let conversation = await Conversation.findOne({ phoneNumber, userId });
  
  if (!conversation) {
    conversation = await Conversation.create({
      phoneNumber,
      userId,
      name: phoneNumber,
      metadata: { source: 'campaign' }
    });
  }
  
  return conversation._id;
}

module.exports = router;
