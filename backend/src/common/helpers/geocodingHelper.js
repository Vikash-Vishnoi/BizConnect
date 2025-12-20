const logger = require('./logger');
const config = require('../../config/server.config');
const { ERROR_CODES } = require('../constants');

/**
 * Geocoding Constants
 */
const COORDINATE_LIMITS = {
  LATITUDE: { MIN: -90, MAX: 90 },
  LONGITUDE: { MIN: -180, MAX: 180 }
};

const EARTH_RADIUS = {
  KILOMETERS: 6371,
  MILES: 3959
};

const GEOCODING_TIMEOUT = 5000; // 5 seconds

/**
 * Geocoding Utility Helper
 * Internal utility functions for geocoding and reverse geocoding
 * 
 * PURPOSE:
 * Convert addresses to coordinates (geocoding) and coordinates to addresses (reverse geocoding)
 * Used for business location features and location-based messaging
 * 
 * CURRENT STATUS:
 * Mock implementation - requires Google Maps API integration for production
 * 
 * PRODUCTION INTEGRATION:
 * 1. Set up Google Maps API key in environment:
 *    GOOGLE_MAPS_API_KEY=your_api_key
 * 
 * 2. Enable Geocoding API in Google Cloud Console
 * 
 * 3. Replace mock implementations with actual API calls (examples provided)
 * 
 * 4. Add rate limiting and caching for API calls
 * 
 * USAGE:
 * - validateCoordinates(lat, lng) - Validate coordinate values
 * - geocodeAddress(address) - Convert address to coordinates
 * - reverseGeocode(lat, lng) - Convert coordinates to address
 * - calculateDistance(coords1, coords2) - Distance between points
 * 
 * COST CONSIDERATIONS:
 * Google Maps Geocoding API charges per request
 * Implement caching to reduce API calls and costs
 * 
 * @module utils/geocodingHelper
 * @note In production, integrate with Google Maps Geocoding API or similar service
 */
 
/**
 * Validate coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Object} Validation result with valid flag and errors array
 */
function validateCoordinates(latitude, longitude) {
  const errors = [];

  // Validate latitude
  if (latitude === null || latitude === undefined) {
    errors.push('Latitude is required');
  } else if (typeof latitude !== 'number' || isNaN(latitude)) {
    errors.push('Latitude must be a valid number');
  } else if (latitude < COORDINATE_LIMITS.LATITUDE.MIN || latitude > COORDINATE_LIMITS.LATITUDE.MAX) {
    errors.push(`Latitude must be between ${COORDINATE_LIMITS.LATITUDE.MIN} and ${COORDINATE_LIMITS.LATITUDE.MAX}`);
  }

  // Validate longitude
  if (longitude === null || longitude === undefined) {
    errors.push('Longitude is required');
  } else if (typeof longitude !== 'number' || isNaN(longitude)) {
    errors.push('Longitude must be a valid number');
  } else if (longitude < COORDINATE_LIMITS.LONGITUDE.MIN || longitude > COORDINATE_LIMITS.LONGITUDE.MAX) {
    errors.push(`Longitude must be between ${COORDINATE_LIMITS.LONGITUDE.MIN} and ${COORDINATE_LIMITS.LONGITUDE.MAX}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    code: errors.length > 0 ? ERROR_CODES.VALIDATION_ERROR : null
  };
}

/**
 * Get coordinates from address (geocoding)
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} Geocoding result with coordinates
 * 
 * @example
 * const result = await geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA');
 * // Returns: { latitude: 37.4224764, longitude: -122.0842499, formatted_address: '...' }
 * 
 * @note MOCK IMPLEMENTATION - Integrate with Google Maps Geocoding API in production:
 * const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
 *   params: {
 *     address: address,
 *     key: process.env.GOOGLE_MAPS_API_KEY
 *   }
 * });
 * return {
 *   latitude: response.data.results[0].geometry.location.lat,
 *   longitude: response.data.results[0].geometry.location.lng,
 *   formatted_address: response.data.results[0].formatted_address
 * };
 */
async function geocodeAddress(address, businessId = null) {
  try {
    // Validate input
    if (!address || typeof address !== 'string' || address.trim() === '') {
      const error = new Error('Valid address is required');
      error.code = ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }

    const trimmedAddress = address.trim();

    // Log geocoding attempt
    logger.info('Geocoding address', { 
      address: trimmedAddress.substring(0, 50),
      businessId,
      service: 'geocoding'
    });

    // Check if Google Maps API key is configured
    const apiKey = config.integrations?.googleMaps?.apiKey || process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      logger.warn('Google Maps API not configured', { businessId });
      return {
        success: false,
        message: 'Geocoding requires Google Maps API integration',
        data: {
          address: trimmedAddress,
          latitude: null,
          longitude: null,
          requiresManualInput: true,
          note: 'Please set coordinates manually or configure Google Maps API'
        }
      };
    }

    // TODO: Implement actual Google Maps API call
    // const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    //   params: { address: trimmedAddress, key: apiKey },
    //   timeout: GEOCODING_TIMEOUT
    // });

    // Mock implementation - replace with actual API call
    return {
      success: false,
      message: 'Geocoding API integration pending',
      data: {
        address: trimmedAddress,
        latitude: null,
        longitude: null,
        requiresManualInput: true,
        note: 'Please set coordinates manually or integrate Google Maps Geocoding API'
      }
    };
  } catch (error) {
    logger.error('Geocoding error', { 
      error: error.message,
      address: address?.substring(0, 50),
      businessId 
    });
    throw error;
  }
}

/**
 * Get address from coordinates (reverse geocoding)
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Reverse geocoding result with address
 * 
 * @example
 * const result = await reverseGeocodeCoordinates(37.4224764, -122.0842499);
 * // Returns: { address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA', ... }
 * 
 * @note MOCK IMPLEMENTATION - Integrate with Google Maps Reverse Geocoding API in production:
 * const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
 *   params: {
 *     latlng: `${latitude},${longitude}`,
 *     key: process.env.GOOGLE_MAPS_API_KEY
 *   }
 * });
 * return {
 *   address: response.data.results[0].formatted_address,
 *   components: response.data.results[0].address_components
 * };
 */
async function reverseGeocodeCoordinates(latitude, longitude, businessId = null) {
  try {
    // Validate coordinates first
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) {
      const error = new Error(validation.errors.join(', '));
      error.code = validation.code;
      throw error;
    }

    // Log reverse geocoding attempt
    logger.info('Reverse geocoding coordinates', { 
      latitude,
      longitude,
      businessId,
      service: 'reverse-geocoding'
    });

    // Check if Google Maps API key is configured
    const apiKey = config.integrations?.googleMaps?.apiKey || process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      logger.warn('Google Maps API not configured', { businessId });
      return {
        success: false,
        message: 'Reverse geocoding requires Google Maps API integration',
        data: {
          latitude,
          longitude,
          address: '',
          requiresManualInput: true,
          note: 'Please enter address manually or configure Google Maps API'
        }
      };
    }

    // TODO: Implement actual Google Maps API call
    // const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    //   params: { latlng: `${latitude},${longitude}`, key: apiKey },
    //   timeout: GEOCODING_TIMEOUT
    // });

    // Mock implementation - replace with actual API call
    return {
      success: false,
      message: 'Reverse geocoding API integration pending',
      data: {
        latitude,
        longitude,
        address: '',
        requiresManualInput: true,
        note: 'Please enter address manually or integrate Google Maps Geocoding API'
      }
    };
  } catch (error) {
    logger.error('Reverse geocoding error', { 
      error: error.message,
      latitude,
      longitude,
      businessId 
    });
    throw error;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @param {string} unit - Unit of measurement ('km' or 'miles')
 * @returns {number} Distance between coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2, unit = 'km') {
  // Validate all coordinates
  const validation1 = validateCoordinates(lat1, lon1);
  const validation2 = validateCoordinates(lat2, lon2);
  
  if (!validation1.valid || !validation2.valid) {
    const errors = [...validation1.errors, ...validation2.errors];
    const error = new Error(`Invalid coordinates: ${errors.join(', ')}`);
    error.code = ERROR_CODES.VALIDATION_ERROR;
    throw error;
  }

  // Validate unit
  if (!['km', 'kilometers', 'miles'].includes(unit.toLowerCase())) {
    const error = new Error('Unit must be "km", "kilometers", or "miles"');
    error.code = ERROR_CODES.VALIDATION_ERROR;
    throw error;
  }

  // Get Earth's radius based on unit
  const R = unit.toLowerCase() === 'miles' ? EARTH_RADIUS.MILES : EARTH_RADIUS.KILOMETERS;
  
  // Haversine formula
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
}

/**
 * Convert degrees to radians
 * @private
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Format coordinates for display
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} precision - Decimal places (default: 6)
 * @returns {string} Formatted coordinates
 */
function formatCoordinates(latitude, longitude, precision = 6) {
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Parse coordinate string (e.g., "37.4224764, -122.0842499")
 * @param {string} coordinateString - Coordinate string
 * @returns {Object|null} Parsed coordinates or null if invalid
 */
function parseCoordinateString(coordinateString) {
  if (!coordinateString || typeof coordinateString !== 'string') {
    return null;
  }

  const parts = coordinateString.split(',').map(p => p.trim());
  if (parts.length !== 2) {
    return null;
  }

  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);

  const validation = validateCoordinates(latitude, longitude);
  if (!validation.valid) {
    return null;
  }

  return { latitude, longitude };
}

module.exports = {
  validateCoordinates,
  geocodeAddress,
  reverseGeocodeCoordinates,
  calculateDistance,
  formatCoordinates,
  parseCoordinateString,
  COORDINATE_LIMITS,
  EARTH_RADIUS
};
