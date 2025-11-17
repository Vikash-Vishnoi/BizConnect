const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

/**
 * @route   GET /api/business-location
 * @desc    Get business location for current user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('businessLocation');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user.businessLocation || {
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
 * @route   PUT /api/business-location
 * @desc    Update business location
 * @access  Private
 */
router.put('/', auth, async (req, res) => {
  try {
    const { enabled, address, latitude, longitude, description } = req.body;

    // Validate coordinates if provided
    if (latitude !== null && latitude !== undefined) {
      if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be a number between -90 and 90'
        });
      }
    }

    if (longitude !== null && longitude !== undefined) {
      if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be a number between -180 and 180'
        });
      }
    }

    // Both coordinates must be provided together or both null
    if ((latitude === null || latitude === undefined) !== (longitude === null || longitude === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Both latitude and longitude must be provided together'
      });
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

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('businessLocation');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Business location updated:', {
      userId: req.user.userId,
      enabled: user.businessLocation.enabled,
      hasCoordinates: user.businessLocation.latitude !== null
    });

    res.json({
      success: true,
      message: 'Business location updated successfully',
      data: user.businessLocation
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
 * @route   DELETE /api/business-location
 * @desc    Clear business location
 * @access  Private
 */
router.delete('/', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          'businessLocation.enabled': false,
          'businessLocation.address': '',
          'businessLocation.latitude': null,
          'businessLocation.longitude': null,
          'businessLocation.description': '',
          'businessLocation.updatedAt': new Date()
        }
      },
      { new: true }
    ).select('businessLocation');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Business location cleared:', {
      userId: req.user.userId
    });

    res.json({
      success: true,
      message: 'Business location cleared successfully',
      data: user.businessLocation
    });
  } catch (error) {
    console.error('❌ Error clearing business location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear business location',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/business-location/validate-coordinates
 * @desc    Validate coordinates without saving
 * @access  Private
 */
router.post('/validate-coordinates', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const errors = [];

    if (latitude === null || latitude === undefined) {
      errors.push('Latitude is required');
    } else if (typeof latitude !== 'number') {
      errors.push('Latitude must be a number');
    } else if (latitude < -90 || latitude > 90) {
      errors.push('Latitude must be between -90 and 90');
    }

    if (longitude === null || longitude === undefined) {
      errors.push('Longitude is required');
    } else if (typeof longitude !== 'number') {
      errors.push('Longitude must be a number');
    } else if (longitude < -180 || longitude > 180) {
      errors.push('Longitude must be between -180 and 180');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        errors
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Coordinates are valid',
      data: { latitude, longitude }
    });
  } catch (error) {
    console.error('❌ Error validating coordinates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coordinates',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/business-location/geocode
 * @desc    Get coordinates from address (mock implementation)
 * @access  Private
 * @note    In production, integrate with Google Maps Geocoding API or similar service
 */
router.post('/geocode', auth, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || address.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    // Mock geocoding response
    // In production, integrate with Google Maps Geocoding API:
    // const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    //   params: {
    //     address: address,
    //     key: process.env.GOOGLE_MAPS_API_KEY
    //   }
    // });

    // For now, return a mock response
    res.json({
      success: true,
      message: 'Geocoding requires Google Maps API integration',
      data: {
        address: address,
        latitude: null,
        longitude: null,
        requiresManualInput: true,
        note: 'Please set coordinates manually or integrate Google Maps Geocoding API'
      }
    });
  } catch (error) {
    console.error('❌ Error geocoding address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/business-location/reverse-geocode
 * @desc    Get address from coordinates (mock implementation)
 * @access  Private
 * @note    In production, integrate with Google Maps Reverse Geocoding API
 */
router.post('/reverse-geocode', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both latitude and longitude are required'
      });
    }

    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude'
      });
    }

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude'
      });
    }

    // Mock reverse geocoding response
    // In production, integrate with Google Maps Reverse Geocoding API:
    // const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    //   params: {
    //     latlng: `${latitude},${longitude}`,
    //     key: process.env.GOOGLE_MAPS_API_KEY
    //   }
    // });

    res.json({
      success: true,
      message: 'Reverse geocoding requires Google Maps API integration',
      data: {
        latitude,
        longitude,
        address: '',
        requiresManualInput: true,
        note: 'Please enter address manually or integrate Google Maps Geocoding API'
      }
    });
  } catch (error) {
    console.error('❌ Error reverse geocoding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reverse geocode',
      error: error.message
    });
  }
});

module.exports = router;
