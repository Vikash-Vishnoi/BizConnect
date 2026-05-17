/**
 * Application Constants
 * Centralized configuration values used throughout the application
 */

// Environment Variables
export const ENV = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'http://localhost:3000',
  APP_NAME: process.env.REACT_APP_NAME || 'WhatsApp Marketing Platform',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
  GA_ID: process.env.REACT_APP_GA_ID,
  SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
};

// Contact Information
export const CONTACT = {
  EMAIL: process.env.REACT_APP_CONTACT_EMAIL || 'support@whatsappmarketing.com',
  PHONE: process.env.REACT_APP_CONTACT_PHONE || '+91 98765 43210',
  ADDRESS: process.env.REACT_APP_CONTACT_ADDRESS || 'Your Business Address',
};

// Social Media Links
export const SOCIAL_LINKS = {
  TWITTER: process.env.REACT_APP_SOCIAL_TWITTER || 'https://twitter.com/yourcompany',
  LINKEDIN: process.env.REACT_APP_SOCIAL_LINKEDIN || 'https://linkedin.com/company/yourcompany',
  FACEBOOK: process.env.REACT_APP_SOCIAL_FACEBOOK || 'https://facebook.com/yourcompany',
  INSTAGRAM: process.env.REACT_APP_SOCIAL_INSTAGRAM || 'https://instagram.com/yourcompany',
};

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  BUSINESS_ID: 'businessId',
  LAST_BUSINESS_SETUP_STEP: 'lastBusinessSetupStep',
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  BUSINESS_SETUP: '/business-setup',
  INBOX: '/inbox',
  TEMPLATES: '/templates',
  CONTACTS: '/contacts',
  CAMPAIGNS: '/campaigns',
  ANALYTICS: '/analytics',
  FLOWS: '/flows',
  SETTINGS: '/settings',
  ACCESS_DENIED: '/access-denied',
  NOT_FOUND: '/404',
};

// Business Setup Steps
export const BUSINESS_SETUP_STEPS = {
  BASIC_INFO: 1,
  WHATSAPP_CONFIG: 2,
  PROFILE: 3,
  COMPLETE: 4,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  BUSINESS_SETUP_REQUIRED: 'Please complete your business setup to continue.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SENT: 'Sent successfully',
  COPIED: 'Copied to clipboard',
};

// UI Constants
export const UI = {
  TOAST_DURATION: 3000, // 3 seconds
  DEBOUNCE_DELAY: 300, // milliseconds
  AUTOSAVE_DELAY: 2000, // 2 seconds
  PAGINATION_DEFAULT_LIMIT: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY hh:mm A',
  API: 'YYYY-MM-DD',
  TIME_ONLY: 'hh:mm A',
};

// Regex Patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// WhatsApp Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  TEMPLATE: 'template',
  INTERACTIVE: 'interactive',
  LOCATION: 'location',
  CONTACTS: 'contacts',
};

// Template Categories
export const TEMPLATE_CATEGORIES = {
  MARKETING: 'MARKETING',
  UTILITY: 'UTILITY',
  AUTHENTICATION: 'AUTHENTICATION',
};

// Template Status
export const TEMPLATE_STATUS = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  DISABLED: 'DISABLED',
};

// Campaign Status
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Quality Ratings
export const QUALITY_RATINGS = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
  UNKNOWN: 'UNKNOWN',
};

// Message Status
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  QUEUED: 'queued',
};
