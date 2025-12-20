/**
 * Consolidated Business Location Routes
 * Reduced from 6 routes to 3 routes
 * Moved to /api/business/:id/location pattern
 * @module routes/business/businessLocationRoutes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const Business = require('../../../core/database/models/Business');
const { asyncHandler, NotFoundError, ValidationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { HTTP_STATUS, ERROR_CODES } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');

// Constants
const VALIDATION_LIMITS = {
  ADDRESS_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 200
};

const COORDINATE_LIMITS = {
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180
};

const DEFAULT_LOCATION = {
  enabled: false,
  address: '',
  latitude: null,
  longitude: null,
  description: '',
  updatedAt: null
};

/**
 * Validate coordinates (internal utility)
 * @private
 */ 
function validateCoordinates(latitude, longitude) {
  const errors = [];

  if (latitude !== null && latitude !== undefined) {
    if (typeof latitude !== 'number' || latitude < COORDINATE_LIMITS.LATITUDE_MIN || latitude > COORDINATE_LIMITS.LATITUDE_MAX) {
      errors.push(`Latitude must be a number between ${COORDINATE_LIMITS.LATITUDE_MIN} and ${COORDINATE_LIMITS.LATITUDE_MAX}`);
    }
  }

  if (longitude !== null && longitude !== undefined) {
    if (typeof longitude !== 'number' || longitude < COORDINATE_LIMITS.LONGITUDE_MIN || longitude > COORDINATE_LIMITS.LONGITUDE_MAX) {
      errors.push(`Longitude must be a number between ${COORDINATE_LIMITS.LONGITUDE_MIN} and ${COORDINATE_LIMITS.LONGITUDE_MAX}`);
    }
  }

  // Both coordinates must be provided together or both null
  const latProvided = latitude !== null && latitude !== undefined;
  const lonProvided = longitude !== null && longitude !== undefined;
  if (latProvided !== lonProvided) {
    errors.push('Both latitude and longitude must be provided together');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * @route   GET /api/business/:id/location
 * @desc    Get business location
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await Business.findById(req.params.id).select('businessLocation');

    if (!business) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Business not found',
        processingTime
      });
    }

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: business.businessLocation || DEFAULT_LOCATION,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error getting business location', {
      businessId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
}));

/**
 * @route   PUT /api/business/:id/location
 * @desc    Update business location (with automatic coordinate validation)
 * @access  Private
 * @note    Consolidates: PUT /, POST /validate-coordinates (now auto-validated)
 */
router.put('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const { enabled, address, latitude, longitude, description } = req.body;

    // Auto-validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      const validation = validateCoordinates(latitude, longitude);
      if (!validation.valid) {
        const processingTime = Date.now() - startTime;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid coordinates',
          errors: validation.errors,
          processingTime
        });
      }
    }

    // Validate address length if provided
    if (address && address.length > VALIDATION_LIMITS.ADDRESS_MAX_LENGTH) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Address cannot exceed ${VALIDATION_LIMITS.ADDRESS_MAX_LENGTH} characters`,
        processingTime
      });
    }

    // Validate description length if provided
    if (description && description.length > VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
        processingTime
      });
    }

    const updateData = {
      'businessLocation.updatedAt': new Date()
    };

    if (enabled !== undefined) updateData['businessLocation.enabled'] = enabled;
    if (address !== undefined) updateData['businessLocation.address'] = address;
    if (latitude !== undefined) updateData['businessLocation.latitude'] = latitude;
    if (longitude !== undefined) updateData['businessLocation.longitude'] = longitude;
    if (description !== undefined) updateData['businessLocation.description'] = description;

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('businessLocation');

    if (!business) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Business not found',
        processingTime
      });
    }

    // Ensure businessLocation exists before reading properties
    const bl = business.businessLocation || { enabled: false, latitude: null, longitude: null };
    logger.info('Business location updated', {
      businessId: req.params.id,
      enabled: bl.enabled,
      hasCoordinates: bl.latitude !== null && bl.longitude !== null
    });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Business location updated successfully',
      data: business.businessLocation,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error updating business location', {
      businessId: req.params.id,
      error: error.message,
      processingTime
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update business location',
      error: error.message,
      processingTime
    });
  }
});

/**
 * @route   DELETE /api/business/:id/location
 * @desc    Disable business location (sets enabled=false, preserves data)
 * @access  Private
 * @note    Data preservation policy - disables instead of deleting
 */
router.delete('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          'businessLocation.enabled': false,
          'businessLocation.updatedAt': new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('businessLocation');

    if (!business) {
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Business not found',
        processingTime
      });
    }

    logger.info('Business location disabled (data preserved)', {
      businessId: req.params.id
    });

    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Business location disabled successfully (data preserved)',
      data: business.businessLocation,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error disabling business location', {
      businessId: req.params.id,
      error: error.message,
      processingTime
    });
    throw error;
  }
}));

module.exports = router;
