const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const WhatsAppService = require('../services/whatsappService');

// @route   GET /api/templates
// @desc    Get all templates for user
// @access  Private
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    const query = { businessId: req.businessId };
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

// @route   GET /api/templates/stats
// @desc    Get template statistics
// @access  Private
router.get('/stats', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const totalTemplates = await Template.countDocuments({ businessId: req.businessId });
    const approvedTemplates = await Template.countDocuments({ 
      businessId: req.businessId, 
      status: 'approved' 
    });
    const pendingTemplates = await Template.countDocuments({ 
      businessId: req.businessId, 
      status: 'pending' 
    });
    const draftTemplates = await Template.countDocuments({ 
      businessId: req.businessId, 
      status: 'draft' 
    });

    // Get most used templates
    const mostUsed = await Template.find({ businessId: req.businessId })
      .sort({ 'usage.messages': -1 })
      .limit(5)
      .select('name category usage status');

    res.json({
      total: totalTemplates,
      approved: approvedTemplates,
      pending: pendingTemplates,
      draft: draftTemplates,
      mostUsed
    });
  } catch (error) {
    console.error('Get template stats error:', error);
    res.status(500).json({ error: 'Failed to fetch template stats' });
  }
});

// @route   GET /api/templates/:id
// @desc    Get template by ID
// @access  Private
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
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
router.post('/', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
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
      userId: req.userId,
      businessId: req.businessId
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
router.put('/:id', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
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
router.post('/:id/submit', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
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

    // Submit to WhatsApp using business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
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
router.get('/:id/status', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!template.whatsappTemplateId) {
      return res.status(400).json({ error: 'Template not submitted to WhatsApp yet' });
    }

    // Get status from WhatsApp using business credentials
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);
    
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
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage_templates'), async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      businessId: req.businessId
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
