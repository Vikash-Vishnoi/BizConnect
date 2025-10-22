/**
 * Application Constants
 * Centralized place for all magic numbers and strings
 */

export const TIMEOUTS = {
  /** API request timeout in milliseconds */
  API_REQUEST: 10000,
  
  /** Short delay for UI animations */
  SHORT_DELAY: 100,
  
  /** Medium delay for smooth transitions */
  MEDIUM_DELAY: 300,
  
  /** Debounce delay for search inputs */
  SEARCH_DEBOUNCE: 500,
  
  /** Toast auto-dismiss duration */
  TOAST_DURATION: 3000,
  
  /** Retry delay for failed requests */
  RETRY_DELAY: 2000,
} as const;

export const LIMITS = {
  /** Maximum items to show in recent activity */
  RECENT_ACTIVITY_MAX: 10,
  
  /** Maximum length for template preview */
  TEMPLATE_PREVIEW_LENGTH: 80,
  
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 6,
  
  /** Maximum file upload size (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /** Items per page for pagination */
  ITEMS_PER_PAGE: 20,
} as const;

export const ANIMATION_DURATION = {
  /** Fast animations (button press, etc) */
  FAST: 150,
  
  /** Standard animations (most UI transitions) */
  STANDARD: 300,
  
  /** Slow animations (modal open/close) */
  SLOW: 500,
  
  /** Shimmer/skeleton animation cycle */
  SHIMMER: 1000,
} as const;

export const SOCKET_EVENTS = {
  // Client events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Message events
  NEW_MESSAGE: 'new_message',
  MESSAGE_STATUS: 'message_status',
  
  // Campaign events
  CAMPAIGN_UPDATE: 'campaign_update',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  
  // Template events
  TEMPLATE_STATUS: 'template_status',
  
  // Analytics events
  QUALITY_SCORE_UPDATE: 'quality_score_update',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  REMEMBER_ME: 'rememberMe',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  
  // Campaigns
  CAMPAIGNS: '/campaigns',
  CAMPAIGN: (id: string) => `/campaigns/${id}`,
  CAMPAIGN_START: (id: string) => `/campaigns/${id}/start`,
  CAMPAIGN_PAUSE: (id: string) => `/campaigns/${id}/pause`,
  
  // Templates
  TEMPLATES: '/templates',
  TEMPLATE: (id: string) => `/templates/${id}`,
  TEMPLATE_SUBMIT: (id: string) => `/templates/${id}/submit`,
  
  // Conversations
  CONVERSATIONS: '/conversations',
  CONVERSATION: (id: string) => `/conversations/${id}`,
  MESSAGES: (id: string) => `/conversations/${id}/messages`,
  
  // Analytics
  ANALYTICS: '/analytics',
  DAILY_METRICS: '/analytics/daily',
  CAMPAIGN_ANALYTICS: '/analytics/campaigns',
} as const;

export const DATE_FORMATS = {
  /** Display date: Jan 1, 2025 */
  DISPLAY_DATE: 'MMM d, yyyy',
  
  /** Display date with time: Jan 1, 2025 at 10:30 AM */
  DISPLAY_DATETIME: 'MMM d, yyyy \'at\' h:mm a',
  
  /** ISO format for API */
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
  
  /** Short date: 01/01/25 */
  SHORT_DATE: 'MM/dd/yy',
  
  /** Time only: 10:30 AM */
  TIME_ONLY: 'h:mm a',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  FORBIDDEN: 'You don\'t have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  REGISTER_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  CAMPAIGN_CREATED: 'Campaign created successfully!',
  CAMPAIGN_STARTED: 'Campaign started successfully!',
  CAMPAIGN_PAUSED: 'Campaign paused successfully!',
  TEMPLATE_CREATED: 'Template created successfully!',
  TEMPLATE_SUBMITTED: 'Template submitted for approval!',
  MESSAGE_SENT: 'Message sent successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
} as const;

export default {
  TIMEOUTS,
  LIMITS,
  ANIMATION_DURATION,
  SOCKET_EVENTS,
  STORAGE_KEYS,
  API_ENDPOINTS,
  DATE_FORMATS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
