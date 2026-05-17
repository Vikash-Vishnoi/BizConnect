/**
 * Tracking Service
 * 
 * @module services/analytics/trackingService
 * @description Service for tracking user events, campaign activities, and contact interactions.
 * Provides comprehensive event logging and retrieval for analytics and reporting.
 * 
 * @features
 * - Event tracking for campaigns and contacts
 * - Event statistics and aggregations
 * - Daily event counts and trends
 * - Event filtering by type and date range
 * 
 * @api-endpoints
 * - GET /tracking-events - List all tracking events
 * - GET /tracking-events/by-type - Events grouped by type
 * - GET /tracking-events/daily - Daily event counts
 * - GET /tracking-events/campaign/:campaignId - Campaign-specific events
 * - GET /tracking-events/contact/:contactPhone - Contact-specific events
 * - POST /tracking-events - Create new tracking event
 * - GET /tracking-events/stats - Event statistics
 * 
 * @example
 * import * as trackingService from './trackingService';
 * 
 * // Track a new event
 * await trackingService.createTrackingEvent({
 *   type: 'campaign_sent',
 *   campaignId: '123',
 *   metadata: { recipientCount: 100 }
 * });
 * 
 * // Get campaign events
 * const events = await trackingService.getCampaignEvents('123');
 */

import { get, post } from '../api';

/**
 * @constant {Object} TRACKING_ENDPOINTS - API endpoint paths for tracking service
 */
const TRACKING_ENDPOINTS = {
  BASE: '/tracking-events',
  BY_TYPE: '/tracking-events/by-type',
  DAILY: '/tracking-events/daily',
  CAMPAIGN: '/tracking-events/campaign',
  CONTACT: '/tracking-events/contact',
  STATS: '/tracking-events/stats'
};

/**
 * @constant {number} DEFAULT_EVENT_LIMIT - Default limit for event queries
 */
const DEFAULT_EVENT_LIMIT = 100;

/**
 * Get tracking events with optional filters
 * @param {Object} params - Query parameters (page, limit, type, startDate, endDate)
 * @returns {Promise<Array>} List of tracking events
 */
export const getTrackingEvents = async (params = {}) => {
  return await get(TRACKING_ENDPOINTS.BASE, params);
};

/**
 * Get event counts grouped by type
 * @param {string} startDate - Start date for filtering (ISO format)
 * @param {string} endDate - End date for filtering (ISO format)
 * @returns {Promise<Object>} Event counts by type
 */
export const getEventCountsByType = async (startDate, endDate) => {
  return await get(TRACKING_ENDPOINTS.BY_TYPE, { startDate, endDate });
};

/**
 * Get daily event counts over a date range
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Promise<Array>} Daily event counts
 */
export const getDailyEventCounts = async (startDate, endDate) => {
  return await get(TRACKING_ENDPOINTS.DAILY, { startDate, endDate });
};

/**
 * Get all tracking events for a specific campaign
 * @param {string} campaignId - Campaign identifier
 * @returns {Promise<Array>} Campaign tracking events
 */
export const getCampaignEvents = async (campaignId) => {
  return await get(`${TRACKING_ENDPOINTS.CAMPAIGN}/${campaignId}`);
};

/**
 * Get all tracking events for a specific contact
 * @param {string} contactPhone - Contact phone number
 * @param {number} limit - Maximum number of events (default: 100)
 * @returns {Promise<Array>} Contact tracking events
 */
export const getContactEvents = async (contactPhone, limit = DEFAULT_EVENT_LIMIT) => {
  return await get(`${TRACKING_ENDPOINTS.CONTACT}/${contactPhone}`, { limit });
};

/**
 * Create a new tracking event
 * @param {Object} eventData - Event data to track
 * @param {string} eventData.type - Event type (e.g., 'campaign_sent', 'message_delivered')
 * @param {string} eventData.campaignId - Associated campaign ID (optional)
 * @param {string} eventData.contactPhone - Associated contact phone (optional)
 * @param {Object} eventData.metadata - Additional event metadata
 * @returns {Promise<Object>} Created tracking event
 */
export const createTrackingEvent = async (eventData) => {
  return await post(TRACKING_ENDPOINTS.BASE, eventData);
};

/**
 * Get tracking event statistics and aggregations
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Promise<Object>} Event statistics (total, by type, trends)
 */
export const getTrackingStats = async (startDate, endDate) => {
  return await get(TRACKING_ENDPOINTS.STATS, { startDate, endDate });
};

export default {
  getTrackingEvents,
  getEventCountsByType,
  getDailyEventCounts,
  getCampaignEvents,
  getContactEvents,
  createTrackingEvent,
  getTrackingStats
};

