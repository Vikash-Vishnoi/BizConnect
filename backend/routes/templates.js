const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const { auth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// @route   GET /api/templates
// @desc    Get all templates for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    const query = { userId: req.userId };
    if (status) query.status = status;
    if (category) query.category = category;

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Template.countDocuments(query);

    res.json({
      templates,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// @route   GET /api/templates/:id
// @desc    Get template by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// @route   POST /api/templates
// @desc    Create new template
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, language, components, variables } = req.body;

    if (!name || !category || !language || !components) {
      return res.status(400).json({ error: 'Name, category, language, and components are required' });
    }

    const template = new Template({
      name,
      category,
      language,
      components,
      variables: variables || [],
      status: 'draft',
      userId: req.userId
    });

    await template.save();

    res.status(201).json({
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// @route   PUT /api/templates/:id
// @desc    Update template
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Can't update approved templates
    if (template.status === 'approved') {
      return res.status(400).json({ error: 'Cannot update approved template' });
    }

    const { name, category, language, components, variables } = req.body;

    if (name) template.name = name;
    if (category) template.category = category;
    if (language) template.language = language;
    if (components) template.components = components;
    if (variables !== undefined) template.variables = variables;

    await template.save();

    res.json({
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// @route   POST /api/templates/:id/submit
// @desc    Submit template for WhatsApp approval
// @access  Private
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft templates can be submitted' });
    }

    // Format components for WhatsApp API
    const whatsappComponents = template.components.map(comp => {
      const component = {
        type: comp.type,
        format: comp.format
      };

      if (comp.text) {
        component.text = comp.text;
      }

      if (comp.example) {
        component.example = comp.example;
      }

      if (comp.buttons) {
        component.buttons = comp.buttons;
      }

      return component;
    });

    // Submit to WhatsApp
    const result = await whatsappService.createTemplate(
      template.name.toLowerCase().replace(/\s+/g, '_'),
      template.category,
      template.language,
      whatsappComponents
    );

    if (result.success) {
      template.status = 'pending';
      template.whatsappTemplateId = result.templateId;
      template.whatsappStatus = result.status;
      await template.save();

      res.json({
        message: 'Template submitted for approval',
        template
      });
    } else {
      res.status(400).json({
        error: 'Failed to submit template to WhatsApp',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Submit template error:', error);
    res.status(500).json({ error: 'Failed to submit template' });
  }
});

// @route   GET /api/templates/:id/status
// @desc    Check template approval status from WhatsApp
// @access  Private
router.get('/:id/status', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!template.whatsappTemplateId) {
      return res.status(400).json({ error: 'Template not submitted to WhatsApp yet' });
    }

    // Get status from WhatsApp
    const result = await whatsappService.getTemplateStatus(template.whatsappTemplateId);

    if (result.success) {
      template.whatsappStatus = result.status;
      
      if (result.status === 'APPROVED') {
        template.status = 'approved';
      } else if (result.status === 'REJECTED') {
        template.status = 'rejected';
        template.rejectionReason = result.data?.rejection_reason || 'Unknown reason';
      }
      
      await template.save();

      res.json({
        status: result.status,
        template
      });
    } else {
      res.status(400).json({
        error: 'Failed to get template status',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Get template status error:', error);
    res.status(500).json({ error: 'Failed to get template status' });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete template
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Can't delete approved templates that are in use
    if (template.status === 'approved' && template.usage.campaigns > 0) {
      return res.status(400).json({ error: 'Cannot delete template that is being used in campaigns' });
    }

    await template.deleteOne();

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
