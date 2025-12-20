/**
 * Campaign Operations Routes - Start, Pause, Resume, Cancel
 * @module routes/campaigns/campaignOperationsRoutes
 */

const express = require('express');
const router = express.Router();
const { Campaign } = require('../../../core/database/models');
const campaignService = require('../services/campaignService');
const { validateCampaignId } = require('../../../core/middlewares/validation');
const { 
  validateTemplateApproval,
  checkMessagingLimits 
} = require('../../../core/middlewares/authorization');
const { asyncHandler, NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// Constants
const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_DELAY_MS = 60000;
// Campaign status values match Campaign model enum
const CAMPAIGN_STATUS_ACTIVE = 'active';
const CAMPAIGN_STATUS_PAUSED = 'paused';
const CAMPAIGN_STATUS_COMPLETED = 'completed';
const CAMPAIGN_STATUS_DRAFT = 'draft';
 
// POST /:id/start - Start campaign
router.post('/:id/start', 
  validateCampaignId,
  businessContext,
  validateTemplateApproval,     // SECURITY: Prevent WhatsApp policy violations
  checkMessagingLimits,         // SECURITY: Prevent account suspension
  async (req, res) => {
    console.log('🚀 START CAMPAIGN ROUTE - Request received', req.params.id);
    const startTime = Date.now();
    try {
      const { batchSize, delayBetweenBatches } = req.body;
      console.log('📝 Starting campaign with options:', { batchSize, delayBetweenBatches });

      const campaign = await campaignService.startCampaign(req.params.id, {
        batchSize: batchSize || DEFAULT_BATCH_SIZE,
        delayBetweenBatches: delayBetweenBatches || DEFAULT_DELAY_MS
      });

      console.log('✅ Campaign started successfully');
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: campaign,
        message: `Campaign started successfully. Processing ${campaign.stats.total} recipients in background.`,
        processingTime
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Campaign start failed', { 
        businessId: req.businessId?.toString(), 
        campaignId: req.params.id,
        error: error.message,
        processingTime
      });
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || 'Failed to start campaign',
        errorCode: error.code || ERROR_CODES.INTERNAL_ERROR
      });
    }
  });

// POST /:id/pause - Pause campaign
router.post('/:id/pause', validateCampaignId, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== CAMPAIGN_STATUS_RUNNING) {
      throw new ValidationError('Only running campaigns can be paused');
    }

    campaign.status = CAMPAIGN_STATUS_PAUSED;
    campaign.pausedAt = new Date();
    await campaign.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: campaign,
      message: 'Campaign paused successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Campaign pause failed', { 
      businessId: req.businessId.toString(), 
      campaignId: req.params.id,
      error: error.message 
    });
    throw error;
  }
});

// POST /:id/resume - Resume paused campaign
router.post('/:id/resume', validateCampaignId, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== CAMPAIGN_STATUS_PAUSED) {
      throw new ValidationError('Only paused campaigns can be resumed');
    }

    campaign.status = CAMPAIGN_STATUS_RUNNING;
    campaign.resumedAt = new Date();
    await campaign.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: campaign,
      message: 'Campaign resumed successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Campaign resume failed', { 
      businessId: req.businessId.toString(), 
      campaignId: req.params.id,
      error: error.message 
    });
    throw error;
  }
});

// POST /:id/cancel - Cancel campaign
router.post('/:id/cancel', validateCampaignId, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status === CAMPAIGN_STATUS_COMPLETED || campaign.status === CAMPAIGN_STATUS_CANCELLED) {
      throw new ValidationError('Campaign is already finished');
    }

    campaign.status = CAMPAIGN_STATUS_CANCELLED;
    campaign.cancelledAt = new Date();
    await campaign.save();

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: campaign,
      message: 'Campaign cancelled successfully',
      processingTime
    });
  } catch (error) {
    logger.error('Campaign cancel failed', { 
      businessId: req.businessId.toString(), 
      campaignId: req.params.id,
      error: error.message 
    });
    throw error;
  }
});

module.exports = router;
