/**
 * Alert Action Routes - Acknowledge, resolve, and update alerts
 * @module routes/alerts/alertActionRoutes
 */
 
const express = require('express');
const router = express.Router();
const { AlertLog } = require('../../../core/database/models');

// PUT /:id/acknowledge - Acknowledge alert
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { notes } = req.body;

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    if (notes) alert.notes = notes;

    await alert.save();

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
});

// PUT /:id/resolve - Resolve alert
router.put('/:id/resolve', async (req, res) => {
  try {
    const { resolution } = req.body;

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'RESOLVED';
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();
    if (resolution) alert.resolution = resolution;

    await alert.save();

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alert
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
});

// PUT /:id/action - Take action on alert
router.put('/:id/action', async (req, res) => {
  try {
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (!alert.actions) alert.actions = [];
    alert.actions.push({
      action,
      actionBy: req.user._id,
      actionAt: new Date()
    });

    await alert.save();

    res.json({
      success: true,
      message: 'Action recorded successfully',
      alert
    });
  } catch (error) {
    console.error('Error recording action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record action',
      error: error.message
    });
  }
});

// PUT /:id/status - Update alert status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['UNRESOLVED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const alert = await AlertLog.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = status;
    alert.statusUpdatedAt = new Date();

    await alert.save();

    res.json({
      success: true,
      message: 'Alert status updated successfully',
      alert
    });
  } catch (error) {
    console.error('Error updating alert status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert status',
      error: error.message
    });
  }
});

// PUT /bulk/mark-read - Mark multiple alerts as read
router.put('/bulk/mark-read', async (req, res) => {
  try {
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({
        success: false,
        message: 'alertIds array is required'
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

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts marked as read`,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking alerts as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alerts as read',
      error: error.message
    });
  }
});

module.exports = router;
