const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const AutomationRule = require('../models/AutomationRule');
const AutomationLog = require('../models/AutomationLog');

// @route   GET /api/automations
// @desc    Get all automation rules for user
// @access  Private
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rules = await AutomationRule.find({ businessId: req.businessId })
      .populate('actions.templateId', 'name language status')
      .populate('actions.assignTo', 'name email')
      .sort({ priority: -1, createdAt: -1 });
    
    res.json(rules);
  } catch (error) {
    console.error('Get automation rules error:', error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

// @route   GET /api/automations/:id
// @desc    Get single automation rule
// @access  Private
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      businessId: req.businessId
    })
      .populate('actions.templateId', 'name language status category')
      .populate('actions.assignTo', 'name email');
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('Get automation rule error:', error);
    res.status(500).json({ error: 'Failed to fetch automation rule' });
  }
});

// @route   POST /api/automations
// @desc    Create new automation rule
// @access  Private
router.post('/', [
  auth,
  requireBusiness,
  requireBusinessPermission('manage_automations'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars)'),
  body('trigger.type').isIn(['new_conversation', 'keyword', 'after_hours', 'no_response', 'message_received', 'specific_time'])
    .withMessage('Invalid trigger type'),
  body('actions').isArray({ min: 1 }).withMessage('At least one action is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const ruleData = {
      businessId: req.businessId,
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      trigger: req.body.trigger,
      actions: req.body.actions,
      conditions: req.body.conditions,
      priority: req.body.priority || 0,
      stopOnTrigger: req.body.stopOnTrigger || false
    };
    
    // Validate trigger-specific fields
    if (ruleData.trigger.type === 'keyword') {
      if (!ruleData.trigger.keywords || ruleData.trigger.keywords.length === 0) {
        return res.status(400).json({ error: 'Keywords are required for keyword trigger' });
      }
    }
    
    // Validate actions
    for (const action of ruleData.actions) {
      if (action.type === 'send_message' && !action.message) {
        return res.status(400).json({ error: 'Message content required for send_message action' });
      }
      if (action.type === 'send_template' && !action.templateId) {
        return res.status(400).json({ error: 'Template ID required for send_template action' });
      }
      if (action.type === 'add_tag' && (!action.tags || action.tags.length === 0)) {
        return res.status(400).json({ error: 'Tags required for add_tag action' });
      }
    }
    
    const rule = new AutomationRule(ruleData);
    await rule.save();
    
    console.log(`🤖 Created automation rule: ${rule.name}`);
    
    res.status(201).json(rule);
  } catch (error) {
    console.error('Create automation rule error:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// @route   PUT /api/automations/:id
// @desc    Update automation rule
// @access  Private
router.put('/:id', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    // Update fields
    const allowedUpdates = [
      'name', 'description', 'isActive', 'trigger', 'actions',
      'conditions', 'priority', 'stopOnTrigger'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        rule[field] = req.body[field];
      }
    });
    
    await rule.save();
    
    console.log(`🤖 Updated automation rule: ${rule.name}`);
    
    res.json(rule);
  } catch (error) {
    console.error('Update automation rule error:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

// @route   DELETE /api/automations/:id
// @desc    Delete automation rule
// @access  Private
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    console.log(`🤖 Deleted automation rule: ${rule.name}`);
    
    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    console.error('Delete automation rule error:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

// @route   PATCH /api/automations/:id/toggle
// @desc    Toggle automation rule active/inactive
// @access  Private
router.patch('/:id/toggle', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    rule.isActive = !rule.isActive;
    await rule.save();
    
    console.log(`🤖 Toggled automation rule ${rule.name}: ${rule.isActive ? 'active' : 'inactive'}`);
    
    res.json({ isActive: rule.isActive });
  } catch (error) {
    console.error('Toggle automation rule error:', error);
    res.status(500).json({ error: 'Failed to toggle automation rule' });
  }
});

// @route   GET /api/automations/:id/logs
// @desc    Get execution logs for automation rule
// @access  Private
router.get('/:id/logs', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      AutomationLog.find({ automationRuleId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('conversationId', 'contact.name contact.phoneNumber'),
      AutomationLog.countDocuments({ automationRuleId: req.params.id })
    ]);
    
    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get automation logs error:', error);
    res.status(500).json({ error: 'Failed to fetch automation logs' });
  }
});

// @route   GET /api/automations/stats/overview
// @desc    Get automation statistics overview
// @access  Private
router.get('/stats/overview', auth, requireBusiness, requireBusinessPermission('manage_automations'), async (req, res) => {
  try {
    const rules = await AutomationRule.find({ businessId: req.businessId });
    
    const stats = {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      inactiveRules: rules.filter(r => !r.isActive).length,
      totalTriggers: rules.reduce((sum, r) => sum + (r.stats.totalTriggers || 0), 0),
      successfulExecutions: rules.reduce((sum, r) => sum + (r.stats.successfulExecutions || 0), 0),
      failedExecutions: rules.reduce((sum, r) => sum + (r.stats.failedExecutions || 0), 0),
      rulesByType: {}
    };
    
    // Count rules by trigger type
    rules.forEach(rule => {
      const type = rule.trigger.type;
      stats.rulesByType[type] = (stats.rulesByType[type] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Get automation stats error:', error);
    res.status(500).json({ error: 'Failed to fetch automation stats' });
  }
});

module.exports = router;
