const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const AlertLog = require('../models/AlertLog');

// @route   GET /api/alerts
// @desc    Get all alerts for user with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status, // UNREAD, READ, ACKNOWLEDGED, RESOLVED, IGNORED
      severity, // LOW, MEDIUM, HIGH, CRITICAL
      alertType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      userId: req.user.id,
      isDeleted: false
    };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (severity) {
      query.severity = severity.toUpperCase();
    }

    if (alertType) {
      query.alertType = alertType.toUpperCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [alerts, total] = await Promise.all([
      AlertLog.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AlertLog.countDocuments(query)
    ]);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/alerts/stats
// @desc    Get alert statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await AlertLog.getStats(
      req.user.id,
      startDate,
      endDate
    );

    // Get unresolved critical alerts
    const criticalAlerts = await AlertLog.getUnresolvedCritical(req.user.id);

    res.json({
      stats,
      unresolvedCritical: criticalAlerts.length,
      criticalAlerts: criticalAlerts.slice(0, 5) // Top 5
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/alerts/unresolved
// @desc    Get all unresolved alerts
// @access  Private
router.get('/unresolved', auth, async (req, res) => {
  try {
    const alerts = await AlertLog.find({
      userId: req.user.id,
      status: { $in: ['UNREAD', 'READ', 'ACKNOWLEDGED'] },
      isDeleted: false
    })
    .sort({ severity: -1, createdAt: -1 })
    .lean();

    res.json({ alerts });
  } catch (error) {
    console.error('Get unresolved alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/alerts/critical
// @desc    Get unresolved critical/high alerts
// @access  Private
router.get('/critical', auth, async (req, res) => {
  try {
    const alerts = await AlertLog.getUnresolvedCritical(req.user.id);
    
    res.json({ 
      alerts,
      count: alerts.length,
      hasUrgentAlerts: alerts.length > 0
    });
  } catch (error) {
    console.error('Get critical alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get single alert by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false
    })
    .populate('resolvedBy', 'name email')
    .populate('actionsTaken.takenBy', 'name email')
    .lean();

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Mark as read if unread
    if (alert.status === 'UNREAD') {
      await AlertLog.updateOne(
        { _id: req.params.id },
        { status: 'READ' }
      );
      alert.status = 'READ';
    }

    res.json(alert);
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Private
router.put('/:id/acknowledge', [
  auth,
  check('notes', 'Notes are required').optional().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.acknowledge(req.user.id, req.body.notes);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user.id}`).emit('alert:acknowledged', {
      alertId: alert._id,
      status: alert.status
    });

    res.json({ 
      message: 'Alert acknowledged',
      alert
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/:id/resolve
// @desc    Resolve an alert
// @access  Private
router.put('/:id/resolve', [
  auth,
  check('resolutionNotes', 'Resolution notes are required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.resolve(req.user.id, req.body.resolutionNotes);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user.id}`).emit('alert:resolved', {
      alertId: alert._id,
      status: alert.status
    });

    res.json({ 
      message: 'Alert resolved',
      alert
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/:id/action
// @desc    Add action to alert
// @access  Private
router.put('/:id/action', [
  auth,
  check('action', 'Action is required').notEmpty(),
  check('notes', 'Notes are required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.addAction(req.body.action, req.user.id, req.body.notes);

    res.json({ 
      message: 'Action added',
      alert
    });
  } catch (error) {
    console.error('Add action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/:id/status
// @desc    Update alert status
// @access  Private
router.put('/:id/status', [
  auth,
  check('status', 'Status is required').isIn(['UNREAD', 'READ', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.status = req.body.status;
    await alert.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user:${req.user.id}`).emit('alert:status_changed', {
      alertId: alert._id,
      status: alert.status
    });

    res.json({ 
      message: 'Alert status updated',
      alert
    });
  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete alert (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const alert = await AlertLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.isDeleted = true;
    alert.deletedAt = new Date();
    await alert.save();

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/bulk/mark-read
// @desc    Mark multiple alerts as read
// @access  Private
router.put('/bulk/mark-read', [
  auth,
  check('alertIds', 'Alert IDs array is required').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await AlertLog.updateMany(
      {
        _id: { $in: req.body.alertIds },
        userId: req.user.id,
        status: 'UNREAD',
        isDeleted: false
      },
      {
        status: 'READ'
      }
    );

    res.json({ 
      message: `${result.modifiedCount} alerts marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/alerts/bulk/delete
// @desc    Delete multiple alerts
// @access  Private
router.delete('/bulk/delete', [
  auth,
  check('alertIds', 'Alert IDs array is required').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await AlertLog.updateMany(
      {
        _id: { $in: req.body.alertIds },
        userId: req.user.id,
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedAt: new Date()
      }
    );

    res.json({ 
      message: `${result.modifiedCount} alerts deleted`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
