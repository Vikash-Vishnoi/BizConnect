const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness, requireBusinessPermission } = require('../../../core/middlewares/authorization');
const ScheduledMessage = require('../../../core/database/models/ScheduledMessage');
const Campaign = require('../../../core/database/models/Campaign');
const Conversation = require('../../../core/database/models/Conversation');
const { asyncHandler, NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const logger = require('../../../common/helpers/logger');

/**
 * Create scheduled message
 * POST /api/scheduled/messages
 */
router.post('/messages', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  logger.info('[Schedule Message] Request received', {
    userId: req.userId?.toString(),
    businessId: req.businessId?.toString(),
    business: req.business ? { id: req.business._id?.toString(), name: req.business.name } : null
  });
  
  const businessId = req.business._id;
  const { 
    conversationId,
    scheduledFor,
    messageType,
    text,
    templateId,
    mediaUrl,
    mediaId,
    mediaType,
    caption,
    filename
  } = req.body;

  // Validate required fields
  if (!scheduledFor || !messageType) {
    throw new ValidationError('scheduledFor and messageType are required');
  }

  // Validate scheduledFor is in the future
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    throw new ValidationError('Scheduled time must be in the future');
  }

  // Validate conversation exists and belongs to business  
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId: req.userId,
    isDeleted: false
  });

  if (!conversation) {
    throw new NotFoundError('The specified conversation does not exist or you do not have access to it');
  }

  // Create scheduled message
  const scheduledMessage = new ScheduledMessage({
    businessId,
    userId: req.userId,
    phoneNumber: conversation.contact?.phoneNumber || '',
    conversationId,
    scheduledFor: scheduledDate,
    messageType,
    text: text || '',
    templateId: templateId || null,
    mediaUrl: mediaUrl || '',
    mediaId: mediaId || '',
    mediaType: mediaType || '',
    caption: caption || '',
    filename: filename || '',
    status: 'pending'
  });

  await scheduledMessage.save();
  logger.info('[Schedule Message] Message saved', { messageId: String(scheduledMessage._id) });

  // Populate conversation details
  await scheduledMessage.populate('conversationId', 'contact.name contact.phoneNumber');
  
  // Manually construct response to avoid ObjectId serialization issues
  const responseData = {
    _id: String(scheduledMessage._id),
    businessId: String(scheduledMessage.businessId),
    userId: String(scheduledMessage.userId),
    phoneNumber: scheduledMessage.phoneNumber,
    conversationId: scheduledMessage.conversationId ? {
      _id: String(scheduledMessage.conversationId._id),
      contact: scheduledMessage.conversationId.contact
    } : null,
    scheduledFor: scheduledMessage.scheduledFor,
    messageType: scheduledMessage.messageType,
    text: scheduledMessage.text,
    status: scheduledMessage.status,
    createdAt: scheduledMessage.createdAt,
    updatedAt: scheduledMessage.updatedAt
  };
  
  logger.info('[Schedule Message] Sending response');
  return res.created(responseData, 'Scheduled message created successfully');
}));

/**
 * Get scheduled items statistics (messages & campaigns)
 * GET /api/scheduled/stats/summary
 */
router.get('/stats/summary', auth, requireBusiness, asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  
  logger.info('[Scheduled Stats] Fetching stats for business:', businessId);

  // Get scheduled messages stats
  const messageStats = await ScheduledMessage.aggregate([
    { $match: { businessId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  logger.info('[Scheduled Stats] Message stats:', messageStats);

  // Get scheduled campaigns stats
  const now = new Date();
  const campaignStats = await Campaign.aggregate([
    { 
      $match: { 
        businessId,
        $or: [
          { status: 'scheduled' },
          { 
            'schedule.scheduledFor': { $gt: now },
            status: { $in: ['draft', 'scheduled'] }
          }
        ]
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ]);
  
  logger.info('[Scheduled Stats] Campaign stats:', campaignStats);

  const summary = {
    pending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0
  };

  // Add message stats
  messageStats.forEach(stat => {
    summary[stat._id] = stat.count;
  });

  // Add scheduled campaigns to pending
  if (campaignStats.length > 0) {
    summary.pending += campaignStats[0].count;
  }

  summary.total = Object.values(summary).reduce((a, b) => a + b, 0);
  
  logger.info('[Scheduled Stats] Final summary:', summary);

  return res.success(summary, 'Scheduled items statistics retrieved');
}));

/**
 * List scheduled items (messages & campaigns)
 * GET /api/scheduled
 */
router.get('/', auth, requireBusiness, asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const defaultLimit = parseInt(process.env.SCHEDULED_MESSAGES_DEFAULT_LIMIT || '20');
  const maxLimit = parseInt(process.env.SCHEDULED_MESSAGES_MAX_LIMIT || '100');
  const {
    status,
    conversationId,
    startDate,
    endDate,
    page = 1,
    limit = defaultLimit
  } = req.query;
  const finalLimit = Math.min(parseInt(limit), maxLimit);
  
  // Prevent caching for this endpoint
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  console.log('========================================');
  console.log('[Scheduled List] REQUEST RECEIVED');
  console.log('[Scheduled List] Business ID:', businessId);
  console.log('[Scheduled List] Business ID type:', typeof businessId, businessId?.constructor?.name);
  console.log('[Scheduled List] Query params:', { status, page, limit });
  console.log('========================================');

  // Build query
  const query = { businessId };

  if (status) {
    query.status = status;
  }

  if (conversationId) {
    query.conversationId = conversationId;
  }

  if (startDate || endDate) {
    query.scheduledFor = {};
    if (startDate) {
      query.scheduledFor.$gte = new Date(startDate);
    }
    if (endDate) {
      query.scheduledFor.$lte = new Date(endDate);
    }
  }

  // Fetch scheduled messages
  const skip = (parseInt(page) - 1) * finalLimit;
  
  console.log('[Scheduled List] Fetching messages with query:', query);
  logger.info('[Scheduled List] Fetching messages with query:', query);
  const scheduledMessages = await ScheduledMessage.find(query)
    .populate('conversationId', 'contact.name contact.phoneNumber')
    .populate('templateId', 'name category')
    .sort({ scheduledFor: 1 })
    .skip(skip)
    .limit(finalLimit)
    .lean();
  
  console.log('[Scheduled List] Found messages:', scheduledMessages.length);
  logger.info('[Scheduled List] Found messages:', scheduledMessages.length);

  // Fetch scheduled campaigns
  const now = new Date();
  const campaignQuery = { 
    businessId,
    $or: [
      { status: 'scheduled' },
      { 
        'schedule.scheduledFor': { $gt: now },
        status: { $in: ['draft', 'scheduled'] }
      }
    ]
  };
  console.log('[Scheduled List] ==================');
  console.log('[Scheduled List] Campaign Query businessId:', businessId);
  console.log('[Scheduled List] Campaign Query:', JSON.stringify(campaignQuery, null, 2));
  console.log('[Scheduled List] ==================');
  logger.info('[Scheduled List] Fetching campaigns with query:', JSON.stringify(campaignQuery, null, 2));
  
  const scheduledCampaigns = await Campaign.find(campaignQuery)
    .populate('templateId', 'name category')
    .sort({ 'schedule.scheduledFor': 1 })
    .lean();
  
  console.log('[Scheduled List] Found campaigns:', scheduledCampaigns.length);
  console.log('[Scheduled List] Campaign details:', scheduledCampaigns.map(c => ({ 
    id: c._id, 
    name: c.name, 
    status: c.status,
    scheduleType: c.schedule?.type,
    scheduledFor: c.schedule?.scheduledFor,
    hasScheduledFor: !!c.schedule?.scheduledFor
  })));
  logger.info('[Scheduled List] Found campaigns:', scheduledCampaigns.length);
  logger.info('[Scheduled List] Campaign details:', scheduledCampaigns.map(c => ({ 
    id: c._id, 
    name: c.name, 
    status: c.status,
    scheduleType: c.schedule?.type,
    scheduledFor: c.schedule?.scheduledFor,
    hasScheduledFor: !!c.schedule?.scheduledFor
  })));

  // Transform campaigns to match scheduled message format
  const transformedCampaigns = scheduledCampaigns.map(campaign => ({
    _id: campaign._id,
    businessId: campaign.businessId,
    scheduledFor: campaign.schedule?.scheduledFor,
    status: campaign.status, // Use actual campaign status (scheduled, active, paused, etc.)
    messageType: 'campaign',
    name: campaign.name, // Add name field
    text: campaign.name,
    description: campaign.description || '', // Add description field
    caption: campaign.description || '',
    templateId: campaign.templateId,
    campaignId: campaign._id,
    conversationId: null,
    phoneNumber: `${campaign.stats?.total || 0} recipients`,
    stats: {
      pending: campaign.stats?.pending || 0,
      sent: campaign.stats?.sent || 0,
      delivered: campaign.stats?.delivered || 0,
      read: campaign.stats?.read || 0,
      failed: campaign.stats?.failed || 0,
      total: campaign.stats?.total || 0
    },
    recipients: campaign.recipients || [],
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt
  }));
  
  logger.info('[Scheduled List] Transformed campaigns:', transformedCampaigns.length);

  // Combine and sort by scheduledFor
  const allItems = [...scheduledMessages, ...transformedCampaigns]
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  
  logger.info('[Scheduled List] Total combined items:', allItems.length);
  logger.info('[Scheduled List] Combined items preview:', allItems.map(i => ({
    id: i._id,
    type: i.messageType,
    scheduledFor: i.scheduledFor,
    text: i.text?.substring(0, 30)
  })));

  const messageCount = await ScheduledMessage.countDocuments(query);
  const campaignCount = await Campaign.countDocuments(campaignQuery);
  const total = messageCount + campaignCount;
  
  logger.info('[Scheduled List] Final counts - messages:', messageCount, 'campaigns:', campaignCount, 'total:', total);
  
  const responseData = {
    scheduledMessages: allItems,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / finalLimit)
  };
  
  logger.info('[Scheduled List] Response data structure:', {
    scheduledMessagesCount: responseData.scheduledMessages.length,
    total: responseData.total,
    page: responseData.page,
    pages: responseData.pages
  });

  return res.success(responseData, 'Scheduled items retrieved');
}));

/**
 * Get scheduled item by ID
 * GET /api/scheduled/:id
 */
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const { id } = req.params;

  const scheduledMessage = await ScheduledMessage.findOne({
    _id: id,
    businessId
  })
    .populate('conversationId', 'contact.name contact.phoneNumber')
    .populate('templateId', 'name category language content');

  if (!scheduledMessage) {
    throw new NotFoundError('The specified scheduled message does not exist');
  }

  return res.success(scheduledMessage, 'Scheduled message retrieved');
}));

/**
 * Update scheduled item
 * PUT /api/scheduled/:id
 */
router.put('/:id', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const { id } = req.params;
  const { scheduledFor, text, mediaUrl, mediaId, mediaType, caption, filename } = req.body;

  // Find scheduled message
  const scheduledMessage = await ScheduledMessage.findOne({
    _id: id,
    businessId
  });

  if (!scheduledMessage) {
    throw new NotFoundError('The specified scheduled message does not exist');
  }

  // Only allow updates if status is pending
  if (scheduledMessage.status !== 'pending') {
    throw new ValidationError(`Cannot update scheduled message with status: ${scheduledMessage.status}`);
  }

  // Update fields
  if (scheduledFor) {
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      throw new ValidationError('Scheduled time must be in the future');
    }
    scheduledMessage.scheduledFor = scheduledDate;
  }

  if (text !== undefined) scheduledMessage.text = text;
  if (mediaUrl !== undefined) scheduledMessage.mediaUrl = mediaUrl;
  if (mediaId !== undefined) scheduledMessage.mediaId = mediaId;
  if (mediaType !== undefined) scheduledMessage.mediaType = mediaType;
  if (caption !== undefined) scheduledMessage.caption = caption;
  if (filename !== undefined) scheduledMessage.filename = filename;

  await scheduledMessage.save();
  await scheduledMessage.populate('conversationId', 'contact.name contact.phoneNumber');
  await scheduledMessage.populate('templateId', 'name category');

  return res.success(scheduledMessage, 'Scheduled message updated successfully');
}));

/**
 * Cancel scheduled message
 * DELETE /api/scheduled/:id
 */
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const { id } = req.params;

  const scheduledMessage = await ScheduledMessage.findOne({
    _id: id,
    businessId
  });

  if (!scheduledMessage) {
    throw new NotFoundError('The specified scheduled message does not exist');
  }

  // Only allow cancellation if status is pending
  if (scheduledMessage.status !== 'pending') {
    throw new ValidationError(`Cannot cancel scheduled message with status: ${scheduledMessage.status}`);
  }

  // Update status to cancelled
  scheduledMessage.status = 'cancelled';
  scheduledMessage.cancelledAt = new Date();
  await scheduledMessage.save();

  return res.success(scheduledMessage, 'Scheduled message cancelled successfully');
}));

/**
 * Pause scheduled campaign
 * POST /api/scheduled/campaigns/:id/pause
 */
router.post('/campaigns/:id/pause', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const { id } = req.params;

  const campaign = await Campaign.findOne({
    _id: id,
    businessId
  });

  if (!campaign) {
    throw new NotFoundError('The specified campaign does not exist');
  }

  // Only allow pausing if status is scheduled or active
  if (!['scheduled', 'active'].includes(campaign.status)) {
    throw new ValidationError(`Cannot pause campaign with status: ${campaign.status}`);
  }

  // Update status to paused
  campaign.status = 'paused';
  await campaign.save();

  return res.success(campaign, 'Campaign paused successfully');
}));

/**
 * Resume scheduled campaign
 * POST /api/scheduled/campaigns/:id/resume
 */
router.post('/campaigns/:id/resume', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const { id } = req.params;

  const campaign = await Campaign.findOne({
    _id: id,
    businessId
  });

  if (!campaign) {
    throw new NotFoundError('The specified campaign does not exist');
  }

  // Only allow resuming if status is paused
  if (campaign.status !== 'paused') {
    throw new ValidationError(`Cannot resume campaign with status: ${campaign.status}`);
  }

  // Determine the correct status to resume to
  const now = new Date();
  const scheduledFor = campaign.schedule?.scheduledFor;
  
  if (scheduledFor && scheduledFor > now) {
    campaign.status = 'scheduled';
  } else {
    campaign.status = 'active';
  }
  
  await campaign.save();

  return res.success(campaign, 'Campaign resumed successfully');
}));

/**
 * Cancel scheduled campaign
 * POST /api/scheduled/campaigns/:id/cancel
 */
router.post('/campaigns/:id/cancel', auth, requireBusiness, requireBusinessPermission('manage', 'conversations'), asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const { id } = req.params;

  const campaign = await Campaign.findOne({
    _id: id,
    businessId
  });

  if (!campaign) {
    throw new NotFoundError('The specified campaign does not exist');
  }

  // Only allow cancellation if status is scheduled or paused
  if (!['scheduled', 'paused'].includes(campaign.status)) {
    throw new ValidationError(`Cannot cancel campaign with status: ${campaign.status}`);
  }

  // Update status to failed (as there's no 'cancelled' status for campaigns)
  campaign.status = 'failed';
  campaign.completedAt = new Date();
  await campaign.save();

  return res.success(campaign, 'Campaign cancelled successfully');
}));

module.exports = router;
