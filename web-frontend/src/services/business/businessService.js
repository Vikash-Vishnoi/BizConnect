/**
 * Business Service
 * 
 * @module services/business/businessService
 * @description Comprehensive business management service for handling WhatsApp Business
 * API operations including business profiles, credentials, team management, verification,
 * phone health, location management, capabilities, working hours, and profile customization.
 * 
 * @features
 * - Business CRUD operations
 * - Multi-business switching
 * - Credentials and webhook management
 * - Phone health monitoring
 * - Team member management
 * - Business verification workflow
 * - Location management with geocoding
 * - Capability tracking and management (P0)
 * - Working hours automation (P1)
 * - Business profile management (P1)
 * 
 * @api-endpoints
 * Core Business:
 * - GET /business - List all businesses
 * - GET /business/:id - Get business details
 * - POST /business - Create new business
 * - PUT /business/:id - Update business
 * - POST /business/switch - Switch active business
 * 
 * Credentials & Webhooks:
 * - PUT /business/:id/credentials - Update credentials
 * - POST /business/:id/regenerate-verify-token - Regenerate verify token
 * - POST /business/:id/complete-webhook-setup - Complete webhook setup
 * 
 * Health:
 * - GET /business/:id/phone-health - Get phone health status
 * 
 * Team Management:
 * - GET /business/:id/team - Get team members
 * - POST /business/:id/team - Add team member
 * - PUT /business/:id/team/:memberId - Update team member
 * - DELETE /business/:id/team/:memberId - Remove team member
 * 
 * Verification:
 * - GET /business/:id/verification/status - Get verification status
 * - POST /business/:id/verification/request - Request verification
 * - GET /business/:id/verification/requirements - Get requirements
 * 
 * Location:
 * - GET /business/:id/location - Get location
 * - PUT /business/:id/location - Update location
 * - DELETE /business/:id/location - Delete location
 * - POST /business/location/validate - Validate coordinates
 * - POST /business/location/geocode - Geocode address
 * - POST /business/location/reverse-geocode - Reverse geocode
 * 
 * Capabilities (P0):
 * - GET /business/:id/capabilities - Get capabilities
 * - POST /business/:id/capabilities/sync - Sync capabilities
 * - PUT /business/:id/capabilities/payment - Update payment capability
 * - GET /business/:id/payment-config - Get payment config
 * 
 * Working Hours (P1):
 * - GET /business/:id/working-hours - Get working hours
 * - PUT /business/:id/working-hours - Update working hours
 * - GET /business/:id/working-hours/status - Get current status
 * 
 * Profile (P1):
 * - GET /business/:id/profile - Get profile
 * - PUT /business/:id/profile/picture - Update profile picture
 * - PUT /business/:id/profile/display-name - Update display name
 * - PUT /business/:id/profile/about - Update about text
 * - POST /business/:id/profile/websites - Add website
 * - DELETE /business/:id/profile/websites - Remove website
 * 
 * @example
 * import * as businessService from './businessService';
 * 
 * // Get all businesses
 * const businesses = await businessService.getBusinesses();
 * 
 * // Switch active business
 * await businessService.switchBusiness(businessId);
 * 
 * // Update working hours
 * await businessService.updateWorkingHours(businessId, {
 *   monday: { open: '09:00', close: '17:00', enabled: true }
 * });
 */

import { get, post, put, del } from '../api';

/**
 * @constant {Object} BUSINESS_ENDPOINTS - API endpoint paths
 */
const BUSINESS_ENDPOINTS = {
  BASE: '/business',
  SWITCH: '/business/switch',
  CREDENTIALS: '/credentials',
  VERIFY_TOKEN: '/regenerate-verify-token',
  WEBHOOK_COMPLETE: '/complete-webhook-setup',
  PHONE_HEALTH: '/phone-health',
  TEAM: '/team',
  VERIFICATION_STATUS: '/verification/status',
  VERIFICATION_REQUEST: '/verification/request',
  VERIFICATION_REQUIREMENTS: '/verification/requirements',
  LOCATION: '/location',
  LOCATION_VALIDATE: '/business/location/validate',
  LOCATION_GEOCODE: '/business/location/geocode',
  LOCATION_REVERSE: '/business/location/reverse-geocode',
  CAPABILITIES: '/capabilities',
  CAPABILITIES_SYNC: '/capabilities/sync',
  CAPABILITIES_PAYMENT: '/capabilities/payment',
  PAYMENT_CONFIG: '/payment-config',
  WORKING_HOURS: '/working-hours',
  WORKING_HOURS_STATUS: '/working-hours/status',
  PROFILE: '/profile',
  PROFILE_PICTURE: '/profile/picture',
  PROFILE_DISPLAY_NAME: '/profile/display-name',
  PROFILE_ABOUT: '/profile/about',
  PROFILE_WEBSITES: '/profile/websites'
};

/**
 * Get all businesses user has access to
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} List of businesses
 */
export const getBusinesses = async (params) => {
  return await get(BUSINESS_ENDPOINTS.BASE, params);
};

/**
 * Get business by ID
 * @param {string} id - Business identifier
 * @returns {Promise<Object>} Business details
 */
export const getBusinessById = async (id) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${id}`);
};


/**
 * Create a new business
 * @param {Object} data - Business creation payload
 * @returns {Promise<Object>} Created business object
 */
export const createBusiness = async (data) => {
  return await post(BUSINESS_ENDPOINTS.BASE, data);
};


/**
 * Update business details
 * @param {string} id - Business identifier
 * @param {Object} data - Update payload
 * @returns {Promise<Object>} Updated business object
 */
export const updateBusiness = async (id, data) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${id}`, data);
};


/**
 * Switch active business
 * @param {string} id - Business identifier to switch to
 * @returns {Promise<Object>} Switch result
 */
export const switchBusiness = async (id) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.SWITCH}`);
};


/**
 * Update WhatsApp credentials
 * @param {string} id - Business identifier
 * @param {Object} data - Credentials payload
 * @returns {Promise<Object>} Update result
 */
export const updateCredentials = async (id, data) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.CREDENTIALS}`, data);
};


/**
 * Regenerate webhook verify token
 * @param {string} id - Business identifier
 * @param {string|null} [reason=null] - Reason for regeneration
 * @returns {Promise<Object>} Token regeneration result
 */
export const regenerateVerifyToken = async (id, reason = null) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.VERIFY_TOKEN}`, { reason });
};


/**
 * Mark webhook configuration as complete
 * @param {string} id - Business identifier
 * @returns {Promise<Object>} Webhook setup result
 */
export const completeWebhookSetup = async (id) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.WEBHOOK_COMPLETE}`);
};


/**
 * Get phone number health
 * @param {string} id - Business identifier
 * @returns {Promise<Object>} Phone health status
 */
export const getPhoneHealth = async (id) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.PHONE_HEALTH}`);
};


/**
 * Get team members
 * @param {string} id - Business identifier
 * @returns {Promise<Array>} List of team members
 */
export const getTeam = async (id) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.TEAM}`);
};


/**
 * Add team member
 * @param {string} id - Business identifier
 * @param {Object} data - Team member payload
 * @returns {Promise<Object>} Added member
 */
export const addTeamMember = async (id, data) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.TEAM}`, data);
};


/**
 * Update team member
 * @param {string} id - Business identifier
 * @param {string} userId - Team member identifier
 * @param {Object} data - Update payload
 * @returns {Promise<Object>} Updated member
 */
export const updateTeamMember = async (id, userId, data) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.TEAM}/${userId}`, data);
};


/**
 * Remove team member
 * @param {string} id - Business identifier
 * @param {string} userId - Team member identifier
 * @returns {Promise<Object>} Deletion result
 */
export const removeTeamMember = async (id, userId) => {
  return await del(`${BUSINESS_ENDPOINTS.BASE}/${id}${BUSINESS_ENDPOINTS.TEAM}/${userId}`);
};


/**
 * Get verification status
 * @returns {Promise<Object>} Verification status
 */
export const getVerificationStatus = async () => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}${BUSINESS_ENDPOINTS.VERIFICATION_STATUS}`);
};


/**
 * Request business verification
 * @param {Object} data - Verification request payload
 * @returns {Promise<Object>} Verification request result
 */
export const requestVerification = async (data) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}${BUSINESS_ENDPOINTS.VERIFICATION_REQUEST}`, data);
};


/**
 * Get verification requirements
 * @returns {Promise<Object>} Verification requirements
 */
export const getVerificationRequirements = async () => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}${BUSINESS_ENDPOINTS.VERIFICATION_REQUIREMENTS}`);
};


/**
 * Get business location
 * @returns {Promise<Object>} Business location
 */
export const getBusinessLocation = async () => {
  return await get(BUSINESS_ENDPOINTS.LOCATION);
};


/**
 * Update business location
 * @param {Object} data - Location update payload
 * @returns {Promise<Object>} Updated location
 */
export const updateBusinessLocation = async (data) => {
  return await put(BUSINESS_ENDPOINTS.LOCATION, data);
};


/**
 * Delete business location
 * @returns {Promise<Object>} Deletion result
 */
export const deleteBusinessLocation = async () => {
  return await del(BUSINESS_ENDPOINTS.LOCATION);
};


/**
 * Validate GPS coordinates
 * @param {Object} data - Coordinates payload
 * @returns {Promise<Object>} Validation result
 */
export const validateCoordinates = async (data) => {
  return await post(BUSINESS_ENDPOINTS.LOCATION_VALIDATE, data);
};


/**
 * Geocode address to coordinates
 * @param {string} address - Address string
 * @returns {Promise<Object>} Geocoded coordinates
 */
export const geocodeAddress = async (address) => {
  return await post(BUSINESS_ENDPOINTS.LOCATION_GEOCODE, { address });
};


/**
 * Reverse geocode coordinates to address
 * @param {Object} data - Coordinates payload
 * @returns {Promise<Object>} Address result
 */
export const reverseGeocode = async (data) => {
  return await post(BUSINESS_ENDPOINTS.LOCATION_REVERSE, data);
};

// ============================================
// P0 FEATURE: Business Capabilities Management
// ============================================


/**
 * Get business capabilities
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Capabilities object
 */
export const getCapabilities = async (businessId) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.CAPABILITIES}`);
};


/**
 * Sync capabilities from WhatsApp
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Sync result
 */
export const syncCapabilities = async (businessId) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.CAPABILITIES_SYNC}`);
};


/**
 * Update payment capability
 * @param {string} businessId - Business identifier
 * @param {boolean} enable - Enable or disable payment
 * @returns {Promise<Object>} Update result
 */
export const updatePaymentCapability = async (businessId, enable) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.CAPABILITIES_PAYMENT}`, { enable });
};


/**
 * Get payment configuration
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Payment config
 */
export const getPaymentConfig = async (businessId) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PAYMENT_CONFIG}`);
};

// ============================================
// P1 FEATURE: Working Hours Auto-Reply
// ============================================


/**
 * Get working hours configuration
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Working hours config
 */
export const getWorkingHours = async (businessId) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.WORKING_HOURS}`);
};


/**
 * Update working hours schedule
 * @param {string} businessId - Business identifier
 * @param {Object} schedule - Working hours schedule
 * @returns {Promise<Object>} Update result
 */
export const updateWorkingHours = async (businessId, schedule) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.WORKING_HOURS}`, schedule);
};


/**
 * Get working hours status (currently open/closed)
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Working hours status
 */
export const getWorkingHoursStatus = async (businessId) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.WORKING_HOURS_STATUS}`);
};

// ============================================
// P1 FEATURE: Business Profile Management
// ============================================


/**
 * Get business profile
 * @param {string} businessId - Business identifier
 * @returns {Promise<Object>} Business profile
 */
export const getProfile = async (businessId) => {
  return await get(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PROFILE}`);
};


/**
 * Update profile picture
 * @param {string} businessId - Business identifier
 * @param {string} imageUrl - New profile image URL
 * @returns {Promise<Object>} Update result
 */
export const updateProfilePicture = async (businessId, imageUrl) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PROFILE_PICTURE}`, { imageUrl });
};


/**
 * Update display name
 * @param {string} businessId - Business identifier
 * @param {string} displayName - New display name
 * @returns {Promise<Object>} Update result
 */
export const updateDisplayName = async (businessId, displayName) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PROFILE_DISPLAY_NAME}`, { displayName });
};


/**
 * Update about text
 * @param {string} businessId - Business identifier
 * @param {string} about - New about text
 * @returns {Promise<Object>} Update result
 */
export const updateAbout = async (businessId, about) => {
  return await put(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PROFILE_ABOUT}`, { about });
};


/**
 * Add website to profile
 * @param {string} businessId - Business identifier
 * @param {string} website - Website URL
 * @returns {Promise<Object>} Add result
 */
export const addWebsite = async (businessId, website) => {
  return await post(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PROFILE_WEBSITES}`, { website });
};


/**
 * Remove website from profile
 * @param {string} businessId - Business identifier
 * @param {number} index - Website index to remove
 * @returns {Promise<Object>} Remove result
 */
export const removeWebsite = async (businessId, index) => {
  return await del(`${BUSINESS_ENDPOINTS.BASE}/${businessId}${BUSINESS_ENDPOINTS.PROFILE_WEBSITES}/${index}`);
};

