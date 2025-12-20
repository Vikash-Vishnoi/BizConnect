/**
 * Standardized Error Codes and Messages
 * Provides consistent error handling across the application
 * 
 * @deprecated This file is maintained for backward compatibility.
 * New code should use ERROR_CODES from '../constants/index.js'
 * which provides simpler, centralized error code constants.
 * 
 * This file contains detailed error definitions with specific codes,
 * messages, and HTTP status codes for legacy support.
 */
 
const ERROR_CODES = {
  // ========================================
  // Authentication Errors (1000-1099)
  // ========================================
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_1001',
    message: 'Invalid email or password',
    statusCode: 401
  },
  AUTH_TOKEN_MISSING: {
    code: 'AUTH_1002',
    message: 'Authentication token is required',
    statusCode: 401
  },
  AUTH_TOKEN_INVALID: {
    code: 'AUTH_1003',
    message: 'Invalid or expired authentication token',
    statusCode: 401
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_1004',
    message: 'Authentication token has expired',
    statusCode: 401
  },
  AUTH_USER_NOT_FOUND: {
    code: 'AUTH_1005',
    message: 'User account not found',
    statusCode: 404
  },
  AUTH_EMAIL_EXISTS: {
    code: 'AUTH_1006',
    message: 'An account with this email already exists',
    statusCode: 400
  },
  AUTH_WEAK_PASSWORD: {
    code: 'AUTH_1007',
    message: 'Password does not meet security requirements',
    statusCode: 400
  },
  AUTH_ACCOUNT_DISABLED: {
    code: 'AUTH_1008',
    message: 'This account has been disabled',
    statusCode: 403
  },
  AUTH_SESSION_EXPIRED: {
    code: 'AUTH_1009',
    message: 'Your session has expired. Please login again',
    statusCode: 401
  },

  // ========================================
  // Authorization/Permission Errors (1100-1199)
  // ========================================
  AUTHZ_INSUFFICIENT_PERMISSIONS: {
    code: 'AUTHZ_1101',
    message: 'You do not have permission to perform this action',
    statusCode: 403
  },
  AUTHZ_BUSINESS_ACCESS_DENIED: {
    code: 'AUTHZ_1102',
    message: 'You do not have access to this business',
    statusCode: 403
  },
  AUTHZ_ADMIN_ONLY: {
    code: 'AUTHZ_1103',
    message: 'This action is restricted to administrators only',
    statusCode: 403
  },
  AUTHZ_OWNER_ONLY: {
    code: 'AUTHZ_1104',
    message: 'This action can only be performed by the business owner',
    statusCode: 403
  },
  AUTHZ_SUPER_ADMIN_ONLY: {
    code: 'AUTHZ_1105',
    message: 'This action requires super admin privileges',
    statusCode: 403
  },

  // ========================================
  // Business Errors (2000-2099)
  // ========================================
  BUS_NOT_FOUND: {
    code: 'BUS_2001',
    message: 'Business not found',
    statusCode: 404
  },
  BUS_WHATSAPP_NOT_CONFIGURED: {
    code: 'BUS_2002',
    message: 'WhatsApp Business API is not configured for this business',
    statusCode: 400
  },
  BUS_INVALID_CREDENTIALS: {
    code: 'BUS_2003',
    message: 'Invalid WhatsApp Business API credentials',
    statusCode: 400
  },
  BUS_PHONE_NOT_VERIFIED: {
    code: 'BUS_2004',
    message: 'Business phone number is not verified',
    statusCode: 400
  },
  BUS_SUBSCRIPTION_EXPIRED: {
    code: 'BUS_2005',
    message: 'Business subscription has expired',
    statusCode: 403
  },
  BUS_LIMIT_REACHED: {
    code: 'BUS_2006',
    message: 'Business limit reached. Please upgrade your plan',
    statusCode: 403
  },
  BUS_ALREADY_EXISTS: {
    code: 'BUS_2007',
    message: 'A business with this name or phone number already exists',
    statusCode: 400
  },

  // ========================================
  // Contact Errors (3000-3099)
  // ========================================
  CONTACT_NOT_FOUND: {
    code: 'CONTACT_3001',
    message: 'Contact not found',
    statusCode: 404
  },
  CONTACT_ALREADY_EXISTS: {
    code: 'CONTACT_3002',
    message: 'A contact with this phone number already exists',
    statusCode: 400
  },
  CONTACT_INVALID_PHONE: {
    code: 'CONTACT_3003',
    message: 'Invalid phone number format. Use E.164 format (+1234567890)',
    statusCode: 400
  },
  CONTACT_OPTED_OUT: {
    code: 'CONTACT_3004',
    message: 'Contact has opted out of communications',
    statusCode: 400
  },
  CONTACT_RATE_LIMIT: {
    code: 'CONTACT_3005',
    message: 'Contact rate limit exceeded. Please try again later',
    statusCode: 429
  },
  CONTACT_DUPLICATE: {
    code: 'CONTACT_3006',
    message: 'Duplicate contact detected',
    statusCode: 400
  },

  // ========================================
  // Campaign Errors (4000-4099)
  // ========================================
  CAMPAIGN_NOT_FOUND: {
    code: 'CAMPAIGN_4001',
    message: 'Campaign not found',
    statusCode: 404
  },
  CAMPAIGN_INVALID_STATUS: {
    code: 'CAMPAIGN_4002',
    message: 'Invalid campaign status transition',
    statusCode: 400
  },
  CAMPAIGN_NO_RECIPIENTS: {
    code: 'CAMPAIGN_4003',
    message: 'Campaign must have at least one recipient',
    statusCode: 400
  },
  CAMPAIGN_TOO_MANY_RECIPIENTS: {
    code: 'CAMPAIGN_4004',
    message: 'Campaign exceeds maximum recipient limit',
    statusCode: 400
  },
  CAMPAIGN_ALREADY_SENT: {
    code: 'CAMPAIGN_4005',
    message: 'Campaign has already been sent and cannot be modified',
    statusCode: 400
  },
  CAMPAIGN_SCHEDULE_PAST: {
    code: 'CAMPAIGN_4006',
    message: 'Cannot schedule campaign in the past',
    statusCode: 400
  },
  CAMPAIGN_NO_MESSAGE: {
    code: 'CAMPAIGN_4007',
    message: 'Campaign must have a message or template',
    statusCode: 400
  },

  // ========================================
  // Template Errors (5000-5099)
  // ========================================
  TEMPLATE_NOT_FOUND: {
    code: 'TEMPLATE_5001',
    message: 'Template not found',
    statusCode: 404
  },
  TEMPLATE_NOT_APPROVED: {
    code: 'TEMPLATE_5002',
    message: 'Template is not approved by WhatsApp',
    statusCode: 400
  },
  TEMPLATE_INVALID_NAME: {
    code: 'TEMPLATE_5003',
    message: 'Invalid template name. Use lowercase letters, numbers, and underscores only',
    statusCode: 400
  },
  TEMPLATE_ALREADY_EXISTS: {
    code: 'TEMPLATE_5004',
    message: 'A template with this name already exists',
    statusCode: 400
  },
  TEMPLATE_INVALID_CATEGORY: {
    code: 'TEMPLATE_5005',
    message: 'Invalid template category',
    statusCode: 400
  },
  TEMPLATE_MISSING_COMPONENTS: {
    code: 'TEMPLATE_5006',
    message: 'Template must have at least one component',
    statusCode: 400
  },
  TEMPLATE_REJECTED: {
    code: 'TEMPLATE_5007',
    message: 'Template was rejected by WhatsApp',
    statusCode: 400
  },

  // ========================================
  // Conversation/Message Errors (6000-6099)
  // ========================================
  CONVERSATION_NOT_FOUND: {
    code: 'CONV_6001',
    message: 'Conversation not found',
    statusCode: 404
  },
  CONVERSATION_WINDOW_EXPIRED: {
    code: 'CONV_6002',
    message: '24-hour messaging window has expired. Use a template message',
    statusCode: 400
  },
  MESSAGE_SEND_FAILED: {
    code: 'MSG_6003',
    message: 'Failed to send message',
    statusCode: 500
  },
  MESSAGE_INVALID_TYPE: {
    code: 'MSG_6004',
    message: 'Invalid message type',
    statusCode: 400
  },
  MESSAGE_TOO_LONG: {
    code: 'MSG_6005',
    message: 'Message exceeds maximum length of 4096 characters',
    statusCode: 400
  },
  MESSAGE_MEDIA_FAILED: {
    code: 'MSG_6006',
    message: 'Failed to upload or process media',
    statusCode: 500
  },
  MESSAGE_NOT_FOUND: {
    code: 'MSG_6007',
    message: 'Message not found',
    statusCode: 404
  },

  // ========================================
  // Automation Errors (7000-7099)
  // ========================================
  AUTOMATION_NOT_FOUND: {
    code: 'AUTO_7001',
    message: 'Automation rule not found',
    statusCode: 404
  },
  AUTOMATION_INVALID_TRIGGER: {
    code: 'AUTO_7002',
    message: 'Invalid automation trigger type',
    statusCode: 400
  },
  AUTOMATION_INVALID_ACTION: {
    code: 'AUTO_7003',
    message: 'Invalid automation action type',
    statusCode: 400
  },
  AUTOMATION_MISSING_CONFIG: {
    code: 'AUTO_7004',
    message: 'Automation configuration is incomplete',
    statusCode: 400
  },
  AUTOMATION_EXECUTION_FAILED: {
    code: 'AUTO_7005',
    message: 'Automation execution failed',
    statusCode: 500
  },

  // ========================================
  // Flow Errors (8000-8099)
  // ========================================
  FLOW_NOT_FOUND: {
    code: 'FLOW_8001',
    message: 'Flow not found',
    statusCode: 404
  },
  FLOW_NOT_PUBLISHED: {
    code: 'FLOW_8002',
    message: 'Flow is not published',
    statusCode: 400
  },
  FLOW_INVALID_JSON: {
    code: 'FLOW_8003',
    message: 'Invalid flow JSON structure',
    statusCode: 400
  },
  FLOW_RESPONSE_INVALID: {
    code: 'FLOW_8004',
    message: 'Invalid flow response data',
    statusCode: 400
  },

  // ========================================
  // Scheduled Message Errors (9000-9099)
  // ========================================
  SCHEDULED_MESSAGE_NOT_FOUND: {
    code: 'SCHED_9001',
    message: 'Scheduled message not found',
    statusCode: 404
  },
  SCHEDULED_MESSAGE_ALREADY_SENT: {
    code: 'SCHED_9002',
    message: 'Scheduled message has already been sent',
    statusCode: 400
  },
  SCHEDULED_MESSAGE_PAST_TIME: {
    code: 'SCHED_9003',
    message: 'Cannot schedule message in the past',
    statusCode: 400
  },

  // ========================================
  // Rate Limit Errors (10000-10099)
  // ========================================
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_10001',
    message: 'Rate limit exceeded. Please try again later',
    statusCode: 429
  },
  RATE_LIMIT_WHATSAPP_API: {
    code: 'RATE_10002',
    message: 'WhatsApp API rate limit exceeded',
    statusCode: 429
  },
  RATE_LIMIT_DAILY_QUOTA: {
    code: 'RATE_10003',
    message: 'Daily message quota exceeded',
    statusCode: 429
  },

  // ========================================
  // Validation Errors (11000-11099)
  // ========================================
  VALIDATION_FAILED: {
    code: 'VAL_11001',
    message: 'Input validation failed',
    statusCode: 400
  },
  VALIDATION_MISSING_FIELD: {
    code: 'VAL_11002',
    message: 'Required field is missing',
    statusCode: 400
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'VAL_11003',
    message: 'Invalid data format',
    statusCode: 400
  },
  VALIDATION_OUT_OF_RANGE: {
    code: 'VAL_11004',
    message: 'Value is out of acceptable range',
    statusCode: 400
  },

  // ========================================
  // Database Errors (12000-12099)
  // ========================================
  DB_CONNECTION_FAILED: {
    code: 'DB_12001',
    message: 'Database connection failed',
    statusCode: 500
  },
  DB_QUERY_FAILED: {
    code: 'DB_12002',
    message: 'Database query failed',
    statusCode: 500
  },
  DB_DUPLICATE_KEY: {
    code: 'DB_12003',
    message: 'Duplicate entry detected',
    statusCode: 400
  },
  DB_INVALID_ID: {
    code: 'DB_12004',
    message: 'Invalid database ID format',
    statusCode: 400
  },

  // ========================================
  // File/Media Errors (13000-13099)
  // ========================================
  FILE_UPLOAD_FAILED: {
    code: 'FILE_13001',
    message: 'File upload failed',
    statusCode: 500
  },
  FILE_TOO_LARGE: {
    code: 'FILE_13002',
    message: 'File size exceeds maximum limit',
    statusCode: 400
  },
  FILE_INVALID_TYPE: {
    code: 'FILE_13003',
    message: 'Invalid file type',
    statusCode: 400
  },
  FILE_NOT_FOUND: {
    code: 'FILE_13004',
    message: 'File not found',
    statusCode: 404
  },

  // ========================================
  // WhatsApp API Errors (14000-14099)
  // ========================================
  WHATSAPP_API_ERROR: {
    code: 'WA_14001',
    message: 'WhatsApp API error occurred',
    statusCode: 500
  },
  WHATSAPP_INVALID_PHONE: {
    code: 'WA_14002',
    message: 'Invalid WhatsApp phone number',
    statusCode: 400
  },
  WHATSAPP_PHONE_NOT_REGISTERED: {
    code: 'WA_14003',
    message: 'Phone number is not registered on WhatsApp',
    statusCode: 400
  },
  WHATSAPP_MESSAGE_REJECTED: {
    code: 'WA_14004',
    message: 'Message was rejected by WhatsApp',
    statusCode: 400
  },
  WHATSAPP_HEALTH_POOR: {
    code: 'WA_14005',
    message: 'Phone number health status is poor. Messaging is restricted',
    statusCode: 403
  },

  // ========================================
  // General Errors (99000-99999)
  // ========================================
  INTERNAL_SERVER_ERROR: {
    code: 'GEN_99001',
    message: 'An internal server error occurred',
    statusCode: 500
  },
  NOT_FOUND: {
    code: 'GEN_99002',
    message: 'Resource not found',
    statusCode: 404
  },
  BAD_REQUEST: {
    code: 'GEN_99003',
    message: 'Bad request',
    statusCode: 400
  },
  SERVICE_UNAVAILABLE: {
    code: 'GEN_99004',
    message: 'Service temporarily unavailable',
    statusCode: 503
  }
};

/**
 * Create a standardized error response
 * @param {string} errorKey - Key from ERROR_CODES
 * @param {*} additionalDetails - Optional additional error details
 * @returns {Object} Formatted error object
 */
const createError = (errorKey, additionalDetails = null) => {
  const error = ERROR_CODES[errorKey] || ERROR_CODES.INTERNAL_SERVER_ERROR;
  
  const errorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    }
  };

  // Add additional details in development mode
  if (additionalDetails && process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = additionalDetails;
  }

  return {
    response: errorResponse,
    statusCode: error.statusCode
  };
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} errorKey - Key from ERROR_CODES
 * @param {*} additionalDetails - Optional additional error details
 */
const sendError = (res, errorKey, additionalDetails = null) => {
  const { response, statusCode } = createError(errorKey, additionalDetails);
  return res.status(statusCode).json(response);
};

/**
 * Create custom error with code
 * @param {string} message - Custom error message
 * @param {string} code - Custom error code
 * @param {number} statusCode - HTTP status code
 */
const customError = (message, code = 'CUSTOM_ERROR', statusCode = 400) => {
  return {
    response: {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    },
    statusCode
  };
};

module.exports = {
  ERROR_CODES,
  createError,
  sendError,
  customError
};
