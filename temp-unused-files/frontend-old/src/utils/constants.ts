

export const TIMEOUTS = {

  API_REQUEST: 10000,


  SHORT_DELAY: 100,


  MEDIUM_DELAY: 300,


  SEARCH_DEBOUNCE: 500,


  TOAST_DURATION: 3000,


  RETRY_DELAY: 2000,
} as const;

export const LIMITS = {

  RECENT_ACTIVITY_MAX: 10,


  TEMPLATE_PREVIEW_LENGTH: 80,


  MIN_PASSWORD_LENGTH: 6,


  MAX_FILE_SIZE: 5 * 1024 * 1024,


  ITEMS_PER_PAGE: 20,
} as const;

export const ANIMATION_DURATION = {

  FAST: 150,


  STANDARD: 300,


  SLOW: 500,


  SHIMMER: 1000,
} as const;

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  NEW_MESSAGE: 'new_message',
  MESSAGE_STATUS: 'message_status',

  CAMPAIGN_UPDATE: 'campaign_update',
  CAMPAIGN_COMPLETED: 'campaign_completed',

  TEMPLATE_STATUS: 'template_status',

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
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',

  CAMPAIGNS: '/campaigns',
  CAMPAIGN: (id: string) => `/campaigns/${id}`,
  CAMPAIGN_START: (id: string) => `/campaigns/${id}/start`,
  CAMPAIGN_PAUSE: (id: string) => `/campaigns/${id}/pause`,

  TEMPLATES: '/templates',
  TEMPLATE: (id: string) => `/templates/${id}`,
  TEMPLATE_SUBMIT: (id: string) => `/templates/${id}/submit`,

  CONVERSATIONS: '/conversations',
  CONVERSATION: (id: string) => `/conversations/${id}`,
  MESSAGES: (id: string) => `/conversations/${id}/messages`,

  ANALYTICS: '/analytics',
  DAILY_METRICS: '/analytics/daily',
  CAMPAIGN_ANALYTICS: '/analytics/campaigns',
} as const;

export const DATE_FORMATS = {

  DISPLAY_DATE: 'MMM d, yyyy',


  DISPLAY_DATETIME: 'MMM d, yyyy \'at\' h:mm a',


  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',


  SHORT_DATE: 'MM/dd/yy',


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
