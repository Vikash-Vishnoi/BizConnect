const express = require('express');
const router = express.Router();
const workingHoursService = require('../services/workingHoursService');
const { auth } = require('../../../core/middlewares/auth');
const { enforceBusinessIsolation } = require('../../../core/middlewares/businessSecurity');
const logger = require('../../../common/helpers/logger');

/**
 * Working Hours Routes
 * Manage business working hours and auto-reply settings
 * 
 * P1 FIX: After-hours automation
 */

/**
 * GET /api/business/:businessId/working-hours
 * Get working hours configuration
 */
router.get('/:businessId/working-hours', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const Business = require('../../../core/database/models/Business');
    
    const business = await Business.findById(businessId)
      .select('settings.workingHours')
      .populate('settings.workingHours.templateId', 'name category');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      data: business.settings.workingHours || {
        enabled: false,
        schedule: [],
        templateId: null
      }
    });

  } catch (error) {
    logger.error('Get working hours error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/business/:businessId/working-hours
 * Update working hours configuration
 */
router.put('/:businessId/working-hours', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { enabled, templateId, schedule } = req.body;

    logger.info(`Updating working hours for business: ${businessId}`);

    const business = await workingHoursService.updateWorkingHours(businessId, {
      enabled,
      templateId,
      schedule
    });

    res.json({
      success: true,
      data: business.settings.workingHours,
      message: 'Working hours updated successfully'
    });

  } catch (error) {
    logger.error('Update working hours error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/business/:businessId/working-hours/status
 * Check if currently within working hours
 */
router.get('/:businessId/working-hours/status', auth, enforceBusinessIsolation, async (req, res) => {
  try {
    const { businessId } = req.params;
    const Business = require('../../../core/database/models/Business');
    
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const isOpen = workingHoursService.isWithinWorkingHours(business);
    const nextAvailableMessage = isOpen ? null : workingHoursService.getNextAvailableMessage(business);

    res.json({
      success: true,
      data: {
        isOpen,
        message: nextAvailableMessage
      }
    });

  } catch (error) {
    logger.error('Check working hours status error', {
      businessId: req.params.businessId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
