/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 * 
 * @module config/api
 */

import { ENV, API_CONFIG } from './constants';

/**
 * Base API URL
 * @constant {string}
 */
export const API_BASE_URL = ENV.API_URL;

/**
 * WebSocket URL for real-time features
 * @constant {string}
 */
export const WS_URL = ENV.WS_URL;

/**
 * API request timeout in milliseconds
 * @constant {number}
 */
export const API_TIMEOUT = API_CONFIG.TIMEOUT;

/**
 * Number of retry attempts for failed requests
 * @constant {number}
 */
export const API_RETRY_ATTEMPTS = API_CONFIG.RETRY_ATTEMPTS;

/**
 * Delay between retry attempts in milliseconds
 * @constant {number}
 */
export const API_RETRY_DELAY = API_CONFIG.RETRY_DELAY;

/**
 * API endpoint paths
 * @constant {Object}
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  
  // Business
  BUSINESS: {
    LIST: '/businesses',
    DETAIL: (id) => `/businesses/${id}`,
    CREATE: '/businesses',
    UPDATE: (id) => `/businesses/${id}`,
    CAPABILITIES: (id) => `/businesses/${id}/capabilities`,
    HEALTH: (id) => `/businesses/${id}/health`,
  },
  
  // Contacts
  CONTACTS: {
    LIST: '/contacts',
    DETAIL: (id) => `/contacts/${id}`,
    CREATE: '/contacts',
    UPDATE: (id) => `/contacts/${id}`,
    DELETE: (id) => `/contacts/${id}`,
    IMPORT: '/contacts/import',
    EXPORT: '/contacts/export',
  },
  
  // Messages
  MESSAGES: {
    SEND: '/messages/send',
    LIST: '/messages',
    DETAIL: (id) => `/messages/${id}`,
    INBOX: '/messages/inbox',
  },
  
  // Templates
  TEMPLATES: {
    LIST: '/templates',
    DETAIL: (id) => `/templates/${id}`,
    CREATE: '/templates',
    UPDATE: (id) => `/templates/${id}`,
    DELETE: (id) => `/templates/${id}`,
    ANALYTICS: (id) => `/templates/${id}/analytics`,
  },
  
  // Campaigns
  CAMPAIGNS: {
    LIST: '/campaigns',
    DETAIL: (id) => `/campaigns/${id}`,
    CREATE: '/campaigns',
    UPDATE: (id) => `/campaigns/${id}`,
    DELETE: (id) => `/campaigns/${id}`,
    START: (id) => `/campaigns/${id}/start`,
    PAUSE: (id) => `/campaigns/${id}/pause`,
    ANALYTICS: (id) => `/campaigns/${id}/analytics`,
  },
  
  // Automations
  AUTOMATIONS: {
    FLOWS: '/flows',
    FLOW_DETAIL: (id) => `/flows/${id}`,
    SAVED_REPLIES: '/saved-replies',
    SCHEDULED_MESSAGES: '/scheduled',
  },
  
  // Analytics
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    CONVERSATIONS: '/analytics/conversations',
    TEMPLATES: '/analytics/templates',
  },
};

export default {
  API_BASE_URL,
  WS_URL,
  API_TIMEOUT,
  API_RETRY_ATTEMPTS,
  API_RETRY_DELAY,
  API_ENDPOINTS,
};
