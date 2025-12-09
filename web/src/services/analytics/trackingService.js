import { get, post } from '../api';

/**
 * 📈 Tracking Events Service
 * Handles event tracking and analytics
 */

/**
 * Get tracking events
 */
export const getTrackingEvents = async (params = {}) => {
  return await get('/tracking-events', params);
};

/**
 * Get event counts by type
 */
export const getEventCountsByType = async (startDate, endDate) => {
  return await get('/tracking-events/by-type', { startDate, endDate });
};

/**
 * Get daily event counts
 */
export const getDailyEventCounts = async (startDate, endDate) => {
  return await get('/tracking-events/daily', { startDate, endDate });
};

/**
 * Get tracking events for campaign
 */
export const getCampaignEvents = async (campaignId) => {
  return await get(`/tracking-events/campaign/${campaignId}`);
};

/**
 * Get tracking events for contact
 */
export const getContactEvents = async (contactPhone, limit = 100) => {
  return await get(`/tracking-events/contact/${contactPhone}`, { limit });
};

/**
 * Create a tracking event
 */
export const createTrackingEvent = async (eventData) => {
  return await post('/tracking-events', eventData);
};

/**
 * Get tracking event statistics
 */
export const getTrackingStats = async (startDate, endDate) => {
  return await get('/tracking-events/stats', { startDate, endDate });
};

