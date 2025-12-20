/**
 * Bulk Utility Routes (validation, stats, export)
 * @module routes/bulk/bulkUtilityRoutes
 */

const express = require('express');
const router = express.Router();
const bulkOperationsService = require('../services/bulkOperationsService');
const { Conversation } = require('../../../core/database/models');
const { asyncHandler } = require('../../../core/middlewares/errorHandler');
const { ValidationError } = require('../../../common/helpers/errorCodes');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// Constants for bulk operations
const EXPORT_FORMATS = ['json', 'csv']; // Supported export formats
const DEFAULT_STATS_PERIOD = '7d'; // Default statistics period
const DEFAULT_EXPORT_FORMAT = 'json'; // Default export format
const VALID_STATS_PERIODS = ['1d', '7d', '30d', '90d']; // Valid period values

// POST /validate - Validate bulk operation
router.post('/validate', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { conversationIds } = req.body;
 
  if (!conversationIds || !Array.isArray(conversationIds)) {
    throw new ValidationError('conversationIds array is required');
  }

  const conversations = await Conversation.find({
    _id: { $in: conversationIds },
    businessId: req.businessId
  });

  const validIds = conversations.map(c => c._id.toString());
  const invalidIds = conversationIds.filter(id => !validIds.includes(id.toString()));

  const processingTime = Date.now() - startTime;

  return res.success({
    validation: {
      total: conversationIds.length,
      valid: validIds.length,
      invalid: invalidIds.length,
      invalidIds
    },
    processingTime
  });
}));

// GET /stats - Get bulk operations statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { period = DEFAULT_STATS_PERIOD } = req.query;

  // Validate period format
  if (!VALID_STATS_PERIODS.includes(period)) {
    throw new ValidationError(`Invalid period. Must be one of: ${VALID_STATS_PERIODS.join(', ')}`);
  }

  const days = parseInt(period) || 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await bulkOperationsService.getBulkOperationStats(
    req.businessId,
    startDate
  );

  const processingTime = Date.now() - startTime;

  return res.success({
    period: `${days} days`,
    stats,
    processingTime
  });
}));

// POST /export/metadata - Export conversation metadata
router.post('/export/metadata', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { conversationIds, format = DEFAULT_EXPORT_FORMAT } = req.body;

  // Validate format
  if (!EXPORT_FORMATS.includes(format)) {
    throw new ValidationError(`Invalid format. Must be one of: ${EXPORT_FORMATS.join(', ')}`);
  }

  if (!conversationIds || !Array.isArray(conversationIds)) {
    throw new ValidationError('conversationIds array is required');
  }

  const conversations = await Conversation.find({
    _id: { $in: conversationIds },
    businessId: req.businessId
  }).select('contactName phoneNumber status tags assignedTo lastMessageAt createdAt');

  if (format === 'csv') {
    const csvHeader = 'ID,Contact Name,Phone Number,Status,Tags,Assigned To,Last Message,Created At\n';
    const csvData = conversations.map(c => 
      `${c._id},${c.contactName},${c.phoneNumber},${c.status},"${c.tags.join(';')}",${c.assignedTo || ''},${c.lastMessageAt},${c.createdAt}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="conversations-${Date.now()}.csv"`);
    return res.send(csvHeader + csvData);
  }

  return res.success({
    count: conversations.length,
    conversations
  });
}));

module.exports = router;
