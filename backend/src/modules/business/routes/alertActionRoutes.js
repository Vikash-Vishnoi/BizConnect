/**
 * Alert Action Routes - Acknowledge, resolve, and update alerts
 * @module routes/alerts/alertActionRoutes
 */
 
const express = require('express');
const router = express.Router();
const { AlertLog } = require('../../../core/database/models');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { HTTP_STATUS, ERROR_CODES } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// Constants
const ALERT_STATUS = {
  UNRESOLVED: 'UNRESOLVED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
};

const VALID_STATUSES = Object.values(ALERT_STATUS);

// PUT /:id/acknowledge - Acknowledge alert
router.put('/:id/acknowledge', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { notes } = req.body;

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Alert not found',
        processingTime
      });
    }

    alert.status = ALERT_STATUS.ACKNOWLEDGED;
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    if (notes) alert.notes = notes;

    await alert.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: { alert },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error acknowledging alert', {
      businessId: req.businessId.toString(),
      alertId: req.params.id,
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message,
      processingTime
    });
  }
});

// PUT /:id/resolve - Resolve alert
router.put('/:id/resolve', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { resolution } = req.body;

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Alert not found',
        processingTime
      });
    }

    alert.status = ALERT_STATUS.RESOLVED;
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();
    if (resolution) alert.resolution = resolution;

    await alert.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Alert resolved successfully',
      data: { alert },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error resolving alert', {
      businessId: req.businessId.toString(),
      alertId: req.params.id,
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message,
      processingTime
    });
  }
});

// PUT /:id/action - Take action on alert
router.put('/:id/action', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { action } = req.body;

    if (!action) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Action is required',
        processingTime
      });
    }

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Alert not found',
        processingTime
      });
    }

    if (!alert.actions) alert.actions = [];
    alert.actions.push({
      action,
      actionBy: req.user._id,
      actionAt: new Date()
    });

    await alert.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Action recorded successfully',
      data: { alert },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error recording action', {
      businessId: req.businessId.toString(),
      alertId: req.params.id,
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to record action',
      error: error.message,
      processingTime
    });
  }
});

// PUT /:id/status - Update alert status
router.put('/:id/status', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        processingTime
      });
    }

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Alert not found',
        processingTime
      });
    }

    alert.status = status;
    alert.statusUpdatedAt = new Date();

    await alert.save();

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Alert status updated successfully',
      data: { alert },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error updating alert status', {
      businessId: req.businessId.toString(),
      alertId: req.params.id,
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update alert status',
      error: error.message,
      processingTime
    });
  }
});

// PUT /bulk/mark-read - Mark multiple alerts as read
router.put('/bulk/mark-read', businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds)) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'alertIds array is required',
        processingTime
      });
    }

    const result = await AlertLog.updateMany(
      {
        _id: { $in: alertIds },
        businessId: req.businessId
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `${result.modifiedCount} alerts marked as read`,
      data: {
        message: `${result.modifiedCount} alerts marked as read`,
        modified: result.modifiedCount
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error marking alerts as read', {
      businessId: req.businessId.toString(),
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to mark alerts as read',
      error: error.message,
      processingTime
    });
  }
});

module.exports = router;
