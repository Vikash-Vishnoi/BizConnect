/**
 * 🏢 Business Service
 * Handles all business-related API calls
 */

import { get, post, put, del } from '../api';

/**
 * Get all businesses user has access to
 */
export const getBusinesses = async (params) => {
  return await get('/business', params);
};

/**
 * Get business by ID
 */
export const getBusinessById = async (id) => {
  return await get(`/business/${id}`);
};

/**
 * Create new business
 */
export const createBusiness = async (data) => {
  return await post('/business', data);
};

/**
 * Update business
 */
export const updateBusiness = async (id, data) => {
  return await put(`/business/${id}`, data);
};

/**
 * Switch active business
 */
export const switchBusiness = async (id) => {
  return await post(`/business/${id}/switch`);
};

/**
 * Update WhatsApp credentials
 */
export const updateCredentials = async (id, data) => {
  return await put(`/business/${id}/credentials`, data);
};

/**
 * Regenerate webhook verify token
 */
export const regenerateVerifyToken = async (id, reason = null) => {
  return await post(`/business/${id}/regenerate-verify-token`, { reason });
};

/**
 * Mark webhook configuration as complete
 */
export const completeWebhookSetup = async (id) => {
  return await post(`/business/${id}/webhook/complete`);
};

/**
 * Get phone number health
 */
export const getPhoneHealth = async (id) => {
  return await get(`/business/${id}/health`);
};

/**
 * Get team members
 */
export const getTeam = async (id) => {
  return await get(`/business/${id}/team`);
};

/**
 * Add team member
 */
export const addTeamMember = async (id, data) => {
  return await post(`/business/${id}/team`, data);
};

/**
 * Update team member
 */
export const updateTeamMember = async (id, userId, data) => {
  return await put(`/business/${id}/team/${userId}`, data);
};

/**
 * Remove team member
 */
export const removeTeamMember = async (id, userId) => {
  return await del(`/business/${id}/team/${userId}`);
};

/**
 * Get verification status
 */
export const getVerificationStatus = async () => {
  return await get('/business/verification');
};

/**
 * Request business verification
 */
export const requestVerification = async (data) => {
  return await post('/business/verification/request', data);
};

/**
 * Get verification requirements
 */
export const getVerificationRequirements = async () => {
  return await get('/business/verification/requirements');
};

/**
 * Get business location
 */
export const getBusinessLocation = async () => {
  return await get('/business/location');
};

/**
 * Update business location
 */
export const updateBusinessLocation = async (data) => {
  return await put('/business/location', data);
};

/**
 * Delete business location
 */
export const deleteBusinessLocation = async () => {
  return await del('/business/location');
};

/**
 * Validate GPS coordinates
 */
export const validateCoordinates = async (data) => {
  return await post('/business/location/validate-coordinates', data);
};

/**
 * Geocode address to coordinates
 */
export const geocodeAddress = async (address) => {
  return await post('/business/location/geocode', { address });
};

/**
 * Reverse geocode coordinates to address
 */
export const reverseGeocode = async (data) => {
  return await post('/business/location/reverse-geocode', data);
};

// ============================================
// P0 FEATURE: Business Capabilities Management
// ============================================

/**
 * Get business capabilities
 */
export const getCapabilities = async (businessId) => {
  return await get(`/business/${businessId}/capabilities`);
};

/**
 * Sync capabilities from WhatsApp
 */
export const syncCapabilities = async (businessId) => {
  return await post(`/business/${businessId}/capabilities/sync`);
};

/**
 * Update payment capability
 */
export const updatePaymentCapability = async (businessId, enable) => {
  return await put(`/business/${businessId}/capabilities/payment`, { enable });
};

/**
 * Get payment configuration
 */
export const getPaymentConfig = async (businessId) => {
  return await get(`/business/${businessId}/capabilities/payment/config`);
};

// ============================================
// P1 FEATURE: Working Hours Auto-Reply
// ============================================

/**
 * Get working hours configuration
 */
export const getWorkingHours = async (businessId) => {
  return await get(`/business/${businessId}/working-hours`);
};

/**
 * Update working hours schedule
 */
export const updateWorkingHours = async (businessId, schedule) => {
  return await put(`/business/${businessId}/working-hours`, schedule);
};

/**
 * Get working hours status (currently open/closed)
 */
export const getWorkingHoursStatus = async (businessId) => {
  return await get(`/business/${businessId}/working-hours/status`);
};

// ============================================
// P1 FEATURE: Business Profile Management
// ============================================

/**
 * Get business profile
 */
export const getProfile = async (businessId) => {
  return await get(`/business/${businessId}/profile`);
};

/**
 * Update profile picture
 */
export const updateProfilePicture = async (businessId, imageUrl) => {
  return await put(`/business/${businessId}/profile/picture`, { imageUrl });
};

/**
 * Update display name
 */
export const updateDisplayName = async (businessId, displayName) => {
  return await put(`/business/${businessId}/profile/display-name`, { displayName });
};

/**
 * Update about text
 */
export const updateAbout = async (businessId, about) => {
  return await put(`/business/${businessId}/profile/about`, { about });
};

/**
 * Add website to profile
 */
export const addWebsite = async (businessId, website) => {
  return await post(`/business/${businessId}/profile/websites`, { website });
};

/**
 * Remove website from profile
 */
export const removeWebsite = async (businessId, index) => {
  return await del(`/business/${businessId}/profile/websites/${index}`);
};

