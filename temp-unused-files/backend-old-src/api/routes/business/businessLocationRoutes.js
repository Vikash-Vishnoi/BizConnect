/**
 * Consolidated Business Location Routes
 * Reduced from 6 routes to 3 routes
 * Moved to /api/business/:id/location pattern
 * @module routes/business/businessLocationRoutes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const Business = require('../../../database/models/Business');

/**
 * Validate coordinates (internal utility)
 * @private
 */ 
function validateCoordinates(latitude, longitude) {
  const errors = [];

  if (latitude !== null && latitude !== undefined) {
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      errors.push('Latitude must be a number between -90 and 90');
    }
  }

  if (longitude !== null && longitude !== undefined) {
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      errors.push('Longitude must be a number between -180 and 180');
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
router.get('/', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).select('businessLocation');

    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    res.json({
      success: true,
      data: business.businessLocation || {
        enabled: false,
        address: '',
        latitude: null,
        longitude: null,
        description: '',
        updatedAt: null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching business location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business location',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/business/:id/location
 * @desc    Update business location (with automatic coordinate validation)
 * @access  Private
 * @note    Consolidates: PUT /, POST /validate-coordinates (now auto-validated)
 */
router.put('/', async (req, res) => {
  try {
    const { enabled, address, latitude, longitude, description } = req.body;

    // Auto-validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      const validation = validateCoordinates(latitude, longitude);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates',
          errors: validation.errors
        });
      }
    }

    // Validate address length if provided
    if (address && address.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Address cannot exceed 500 characters'
      });
    }

    // Validate description length if provided
    if (description && description.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 200 characters'
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
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Ensure businessLocation exists before reading properties
    const bl = business.businessLocation || { enabled: false, latitude: null, longitude: null };
    console.log('✅ Business location updated:', {
      businessId: req.params.id,
      enabled: bl.enabled,
      hasCoordinates: bl.latitude !== null && bl.longitude !== null
    });

    res.json({
      success: true,
      message: 'Business location updated successfully',
      data: business.businessLocation
    });
  } catch (error) {
    console.error('❌ Error updating business location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business location',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/business/:id/location
 * @desc    Disable business location (sets enabled=false, preserves data)
 * @access  Private
 * @note    Data preservation policy - disables instead of deleting
 */
router.delete('/', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    console.log('✅ Business location disabled (data preserved):', {
      businessId: req.params.id
    });

    res.json({
      success: true,
      message: 'Business location disabled successfully (data preserved)',
      data: business.businessLocation
    });
  } catch (error) {
    console.error('❌ Error disabling business location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable business location',
      error: error.message
    });
  }
});

module.exports = router;
