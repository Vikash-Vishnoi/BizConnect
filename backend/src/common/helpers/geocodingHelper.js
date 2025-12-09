/**
 * Geocoding Utility Helper
 * Internal utility functions for geocoding and reverse geocoding
 * Moved from public API endpoints (Phase 3 Part 3 consolidation)
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

  return {
    valid: errors.length === 0,
    errors
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
async function geocodeAddress(address) {
  if (!address || address.trim() === '') {
    throw new Error('Address is required');
  }

  // Mock implementation - replace with actual Google Maps API call
  return {
    success: false,
    message: 'Geocoding requires Google Maps API integration',
    data: {
      address: address,
      latitude: null,
      longitude: null,
      requiresManualInput: true,
      note: 'Please set coordinates manually or integrate Google Maps Geocoding API'
    }
  };
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
async function reverseGeocodeCoordinates(latitude, longitude) {
  // Validate coordinates first
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Mock implementation - replace with actual Google Maps API call
  return {
    success: false,
    message: 'Reverse geocoding requires Google Maps API integration',
    data: {
      latitude,
      longitude,
      address: '',
      requiresManualInput: true,
      note: 'Please enter address manually or integrate Google Maps Geocoding API'
    }
  };
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
  const R = unit === 'miles' ? 3959 : 6371; // Earth's radius in km or miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 * @private
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  validateCoordinates,
  geocodeAddress,
  reverseGeocodeCoordinates,
  calculateDistance
};
