/**
 * Campaign Operations Routes - Start, Pause, Resume, Cancel
 * @module routes/campaigns/campaignOperationsRoutes
 */

const express = require('express');
const router = express.Router();
const { Campaign } = require('../../../database/models');
const campaignService = require('../../../services/campaign/campaignService');
const { validateCampaignId } = require('../../../api/middlewares/validation');
const { 
  validateTemplateApproval,
  checkMessagingLimits 
} = require('../../../api/middlewares/businessSecurity');
 
// POST /:id/start - Start campaign
router.post('/:id/start', 
  validateCampaignId,
  validateTemplateApproval,     // SECURITY: Prevent WhatsApp policy violations
  checkMessagingLimits,         // SECURITY: Prevent account suspension
  async (req, res) => {
  try {
    const defaultBatchSize = parseInt(process.env.CAMPAIGN_DEFAULT_BATCH_SIZE || '1000');
    const defaultDelay = parseInt(process.env.CAMPAIGN_DEFAULT_DELAY_MS || '60000');
    const { batchSize, delayBetweenBatches } = req.body;

    const campaign = await campaignService.startCampaign(req.params.id, {
      batchSize: batchSize || defaultBatchSize,
      delayBetweenBatches: delayBetweenBatches || defaultDelay
    });

    res.json({
      success: true,
      message: `Campaign started successfully. Processing ${campaign.stats.total} recipients in background.`,
      campaign
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start campaign',
      error: error.message
    });
  }
});

// POST /:id/pause - Pause campaign
router.post('/:id/pause', validateCampaignId, async (req, res) => {
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

    if (campaign.status !== 'RUNNING') {
      return res.status(400).json({
        success: false,
        message: 'Only running campaigns can be paused'
      });
    }

    campaign.status = 'PAUSED';
    campaign.pausedAt = new Date();
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      campaign
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause campaign',
      error: error.message
    });
  }
});

// POST /:id/resume - Resume paused campaign
router.post('/:id/resume', validateCampaignId, async (req, res) => {
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

    if (campaign.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        message: 'Only paused campaigns can be resumed'
      });
    }

    campaign.status = 'RUNNING';
    campaign.resumedAt = new Date();
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign resumed successfully',
      campaign
    });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume campaign',
      error: error.message
    });
  }
});

// POST /:id/cancel - Cancel campaign
router.post('/:id/cancel', validateCampaignId, async (req, res) => {
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

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Campaign is already finished'
      });
    }

    campaign.status = 'CANCELLED';
    campaign.cancelledAt = new Date();
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign cancelled successfully',
      campaign
    });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel campaign',
      error: error.message
    });
  }
});

module.exports = router;
