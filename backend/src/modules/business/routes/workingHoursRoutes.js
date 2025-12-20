const express = require('express');
const router = express.Router();
const workingHoursService = require('../services/workingHoursService');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { requireBusiness } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { asyncHandler, NotFoundError, ValidationError, ConflictError } = require('../../../core/middlewares/errorHandler');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WORKING_HOURS = {
  enabled: false,
  schedule: [],
  templateId: null
};

const ERROR_MESSAGES = {
  BUSINESS_NOT_FOUND: 'Business not found'
};

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
router.get('/:businessId/working-hours', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;
    const Business = require('../../../core/database/models/Business');
    
    const business = await Business.findById(businessId)
      .select('settings.workingHours')
      .populate('settings.workingHours.templateId', 'name category');

    if (!business) {
      throw new NotFoundError(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: business.settings.workingHours || DEFAULT_WORKING_HOURS,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error getting working hours', {
      error: error.message,
      businessId: req.params.businessId,
      processingTime
    });
    throw error;
  }
});

/**
 * PUT /api/business/:businessId/working-hours
 * Update working hours configuration
 */
router.put('/:businessId/working-hours', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;
    const { enabled, templateId, schedule } = req.body;

    logger.info('Updating working hours for business', { businessId });

    const business = await workingHoursService.updateWorkingHours(businessId, {
      enabled,
      templateId,
      schedule
    });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: business.settings.workingHours,
      message: 'Working hours updated successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error updating working hours', {
      error: error.message,
      businessId: req.params.businessId,
      processingTime
    });
    throw error;
  }
});

/**
 * GET /api/business/:businessId/working-hours/status
 * Check if currently within working hours
 */
router.get('/:businessId/working-hours/status', auth, requireBusiness, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const { businessId } = req.params;
    const business = await validateBusiness(businessId);

    const isOpen = workingHoursService.isWithinWorkingHours(business);
    const nextAvailableMessage = isOpen ? null : workingHoursService.getNextAvailableMessage(business);

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        isOpen,
        message: nextAvailableMessage
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error checking working hours status', {
      error: error.message,
      businessId: req.params.businessId,
      processingTime
    });
    throw error;
  }
});

module.exports = router;
