/**
 * Application Constants
 * Central location for all application-wide constants
 * 
 * @module common/constants
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// User Roles
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
  VIEWER: 'viewer',
};

// Role Hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 100,
  [USER_ROLES.ADMIN]: 80,
  [USER_ROLES.MANAGER]: 60,
  [USER_ROLES.AGENT]: 40,
  [USER_ROLES.VIEWER]: 20,
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
};

// Message Status
const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  SCHEDULED: 'scheduled',
  CANCELLED: 'cancelled',
};

// Message Types
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LOCATION: 'location',
  CONTACTS: 'contacts',
  TEMPLATE: 'template',
  INTERACTIVE: 'interactive',
  STICKER: 'sticker',
  REACTION: 'reaction',
};

// Campaign Status
const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

// Campaign Types
const CAMPAIGN_TYPES = {
  BROADCAST: 'broadcast',
  DRIP: 'drip',
  TRIGGERED: 'triggered',
  ONE_TIME: 'one_time',
};

// Template Status
const TEMPLATE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED',
  IN_APPEAL: 'IN_APPEAL',
  DELETED: 'DELETED',
};

// Template Categories
const TEMPLATE_CATEGORIES = {
  MARKETING: 'MARKETING',
  UTILITY: 'UTILITY',
  AUTHENTICATION: 'AUTHENTICATION',
};

// Template Languages
const TEMPLATE_LANGUAGES = {
  ENGLISH_US: 'en_US',
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de',
  ITALIAN: 'it',
  PORTUGUESE_BR: 'pt_BR',
  HINDI: 'hi',
  ARABIC: 'ar',
};

// Contact Status
const CONTACT_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  OPTED_OUT: 'opted_out',
  INVALID: 'invalid',
};

// Conversation Status
const CONVERSATION_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  PENDING: 'pending',
  ARCHIVED: 'archived',
};

// Conversation Window (WhatsApp 24-hour window)
const CONVERSATION_WINDOW = {
  DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
  DURATION_HOURS: 24,
};

// Flow Status
const FLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
};

// Flow Response Status
const FLOW_RESPONSE_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  FAILED: 'failed',
};

// Business Verification Status
const BUSINESS_VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

// Quality Rating
const QUALITY_RATING = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
  UNKNOWN: 'UNKNOWN',
};

// Webhook Events
const WEBHOOK_EVENTS = {
  MESSAGE: 'messages',
  MESSAGE_STATUS: 'message_status',
  MESSAGE_REACTION: 'message_reaction',
  MESSAGE_TEMPLATE_STATUS: 'message_template_status_update',
  ACCOUNT_ALERTS: 'account_alerts',
  ACCOUNT_UPDATE: 'account_update',
  BUSINESS_CAPABILITY_UPDATE: 'business_capability_update',
  PHONE_NUMBER_NAME_UPDATE: 'phone_number_name_update',
  PHONE_NUMBER_QUALITY_UPDATE: 'phone_number_quality_update',
  SECURITY: 'security',
};

// Alert Types
const ALERT_TYPES = {
  ACCOUNT_WARNING: 'ACCOUNT_WARNING',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  TEMPLATE_WARNING: 'TEMPLATE_WARNING',
  TEMPLATE_DISABLED: 'TEMPLATE_DISABLED',
  PHONE_NUMBER_WARNING: 'PHONE_NUMBER_WARNING',
  QUALITY_RATING_CHANGE: 'QUALITY_RATING_CHANGE',
  MESSAGING_LIMIT_CHANGE: 'MESSAGING_LIMIT_CHANGE',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
};

// Audit Actions
const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export',
  IMPORT: 'import',
  SEND: 'send',
  SCHEDULE: 'schedule',
  CANCEL: 'cancel',
};

// Error Codes
const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_UNAUTHORIZED: 'AUTH_004',
  AUTH_FORBIDDEN: 'AUTH_005',
  AUTH_SESSION_EXPIRED: 'AUTH_006',

  // Validation
  VALIDATION_FAILED: 'VAL_001',
  VALIDATION_PHONE_INVALID: 'VAL_002',
  VALIDATION_EMAIL_INVALID: 'VAL_003',
  VALIDATION_REQUIRED_FIELD: 'VAL_004',
  VALIDATION_INVALID_FORMAT: 'VAL_005',

  // Business Logic
  BUSINESS_NOT_FOUND: 'BUS_001',
  BUSINESS_INACTIVE: 'BUS_002',
  BUSINESS_NOT_VERIFIED: 'BUS_003',
  BUSINESS_ALREADY_EXISTS: 'BUS_004',

  // Messaging
  MESSAGE_SEND_FAILED: 'MSG_001',
  MESSAGE_INVALID_RECIPIENT: 'MSG_002',
  MESSAGE_WINDOW_EXPIRED: 'MSG_003',
  MESSAGE_RATE_LIMIT: 'MSG_004',
  MESSAGE_TEMPLATE_NOT_FOUND: 'MSG_005',
  MESSAGE_TEMPLATE_NOT_APPROVED: 'MSG_006',

  // Campaign
  CAMPAIGN_NOT_FOUND: 'CAM_001',
  CAMPAIGN_ALREADY_RUNNING: 'CAM_002',
  CAMPAIGN_INVALID_STATUS: 'CAM_003',

  // Contact
  CONTACT_NOT_FOUND: 'CON_001',
  CONTACT_OPTED_OUT: 'CON_002',
  CONTACT_BLOCKED: 'CON_003',
  CONTACT_DUPLICATE: 'CON_004',

  // WhatsApp API
  WHATSAPP_API_ERROR: 'WA_001',
  WHATSAPP_API_RATE_LIMIT: 'WA_002',
  WHATSAPP_INVALID_PHONE: 'WA_003',
  WHATSAPP_MEDIA_UPLOAD_FAILED: 'WA_004',

  // Database
  DATABASE_ERROR: 'DB_001',
  DATABASE_CONNECTION_FAILED: 'DB_002',
  DATABASE_QUERY_FAILED: 'DB_003',
  DATABASE_DUPLICATE_KEY: 'DB_004',

  // System
  SYSTEM_ERROR: 'SYS_001',
  SYSTEM_MAINTENANCE: 'SYS_002',
  SYSTEM_TIMEOUT: 'SYS_003',
  SYSTEM_RESOURCE_NOT_FOUND: 'SYS_004',
};

// Date Formats
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY HH:mm',
  FILE_NAME: 'YYYY-MM-DD_HH-mm-ss',
};

// File Upload
const FILE_UPLOAD = {
  MAX_SIZE: 16 * 1024 * 1024, // 16MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/3gpp'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/ogg', 'audio/amr'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

// Rate Limits
const RATE_LIMITS = {
  GLOBAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 login attempts per 15 minutes
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
  },
  WEBHOOK: {
    windowMs: 60 * 1000,
    max: 1000,
  },
};

// Regex Patterns
const REGEX_PATTERNS = {
  PHONE_E164: /^\+[1-9]\d{1,14}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

// Socket Events
const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_STATUS_UPDATED: 'message:status:updated',
  CAMPAIGN_STATUS_UPDATED: 'campaign:status:updated',
  NOTIFICATION: 'notification',
  ERROR: 'error',
};

// Environment Types
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
};

// Log Levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
};

// Time Units (in milliseconds)
const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

// Export Format Types
const EXPORT_FORMATS = {
  CSV: 'csv',
  XLSX: 'xlsx',
  PDF: 'pdf',
  JSON: 'json',
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  ROLE_HIERARCHY,
  USER_STATUS,
  MESSAGE_STATUS,
  MESSAGE_TYPES,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPES,
  TEMPLATE_STATUS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANGUAGES,
  CONTACT_STATUS,
  CONVERSATION_STATUS,
  CONVERSATION_WINDOW,
  FLOW_STATUS,
  FLOW_RESPONSE_STATUS,
  BUSINESS_VERIFICATION_STATUS,
  QUALITY_RATING,
  WEBHOOK_EVENTS,
  ALERT_TYPES,
  AUDIT_ACTIONS,
  ERROR_CODES,
  DATE_FORMATS,
  FILE_UPLOAD,
  PAGINATION,
  CACHE_TTL,
  RATE_LIMITS,
  REGEX_PATTERNS,
  SOCKET_EVENTS,
  ENVIRONMENTS,
  LOG_LEVELS,
  TIME_UNITS,
  EXPORT_FORMATS,
};
