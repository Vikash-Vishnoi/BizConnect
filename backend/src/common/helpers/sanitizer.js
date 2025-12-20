/**
 * Input Sanitization Utility
 * Prevents XSS attacks by sanitizing user input
 * Supports multi-business context
 * @module common/helpers/sanitizer
 */

const validator = require('validator');
const { REGEX_PATTERNS } = require('../constants');
const config = require('../../config/server.config');

// Sanitization constants
const SANITIZATION_LIMITS = {
  MAX_NAME_LENGTH: parseInt(process.env.MAX_NAME_LENGTH, 10) || 100,
  MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH, 10) || 4096,
  MAX_CAPTION_LENGTH: parseInt(process.env.MAX_CAPTION_LENGTH, 10) || 1024,
  MAX_DESCRIPTION_LENGTH: parseInt(process.env.MAX_DESCRIPTION_LENGTH, 10) || 1000,
  MAX_URL_LENGTH: parseInt(process.env.MAX_URL_LENGTH, 10) || 2048,
  MAX_FILENAME_LENGTH: 255,
  MAX_ADDRESS_LENGTH: 500,
  MAX_RECURSION_DEPTH: 10,
};

// WhatsApp CDN domains
const WHATSAPP_CDN_DOMAINS = [
  'mmg.whatsapp.net',
  'mmg-fna.whatsapp.net',
  'pps.whatsapp.net',
  'scontent.whatsapp.net',
  'lookaside.fbsbx.com',
  'scontent.xx.fbcdn.net',
];

// XSS attack patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

// Sensitive field patterns for redaction
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /accesstoken/i,
  /access_token/i,
  /refreshtoken/i,
  /refresh_token/i,
  /auth/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
  /privatekey/i,
  /private_key/i,
  /publickey/i,
  /public_key/i,
  /cookie/i,
  /session/i,
  /ssn/i,
  /credit.*card/i,
  /card.*number/i,
  /cvv/i,
  /pin/i,
];

/**
 * Sanitize text input to prevent XSS
 * @param {string} input - The text to sanitize
 * @param {object} options - Sanitization options
 * @param {boolean} options.allowNewlines - Allow newline characters (default: true)
 * @param {number} options.maxLength - Maximum length (default: null)
 * @param {boolean} options.stripHtml - Strip HTML tags (default: true)
 * @returns {string} Sanitized text
 */
function sanitizeText(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  const {
    allowNewlines = true,
    maxLength = null,
    stripHtml = true,
  } = options;

  let sanitized = input;

  // Strip HTML tags to prevent XSS
  if (stripHtml) {
    sanitized = validator.stripLow(sanitized);
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    sanitized = validator.escape(sanitized);
  }

  // Remove or preserve newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize a name (person, business, etc.)
 * @param {string} name - The name to sanitize
 * @returns {string} Sanitized name
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return name;
  }

  return sanitizeText(name, {
    allowNewlines: false,
    maxLength: SANITIZATION_LIMITS.MAX_NAME_LENGTH,
    stripHtml: true,
  });
}

/**
 * Sanitize message content
 * @param {string} message - The message to sanitize
 * @returns {string} Sanitized message
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }

  return sanitizeText(message, {
    allowNewlines: true,
    maxLength: SANITIZATION_LIMITS.MAX_MESSAGE_LENGTH,
    stripHtml: true,
  });
}

/**
 * Sanitize caption for media
 * @param {string} caption - The caption to sanitize
 * @returns {string} Sanitized caption
 */
function sanitizeCaption(caption) {
  if (!caption || typeof caption !== 'string') {
    return caption;
  }

  return sanitizeText(caption, {
    allowNewlines: true,
    maxLength: SANITIZATION_LIMITS.MAX_CAPTION_LENGTH,
    stripHtml: true,
  });
}

/**
 * Sanitize phone number (remove non-numeric characters except +)
 * @param {string} phone - The phone number to sanitize
 * @returns {string} Sanitized phone number
 */
function sanitizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }

  // Keep only digits and leading +
  return phone.replace(/[^\d+]/g, '').replace(/\+/g, (match, offset) => {
    // Only keep the first +
    return offset === 0 ? match : '';
  });
}

/**
 * Sanitize email address
 * @param {string} email - The email to sanitize
 * @returns {string} Sanitized email
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return email;
  }

  // Normalize and validate email
  const normalized = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false
  });

  return normalized || email.trim().toLowerCase();
}

/**
 * Validate and sanitize URL
 * @param {string} url - The URL to validate
 * @param {object} options - Validation options
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeUrl(url, options = {}) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const {
    allowedProtocols = ['http', 'https'],
    allowedDomains = null,
    maxLength = SANITIZATION_LIMITS.MAX_URL_LENGTH,
  } = options;

  // Trim and check length
  const trimmed = url.trim();
  if (trimmed.length > maxLength) {
    return null;
  }

  // Validate URL format
  const urlOptions = {
    protocols: allowedProtocols,
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: true
  };

  if (!validator.isURL(trimmed, urlOptions)) {
    return null;
  }

  // Check domain whitelist if specified
  if (allowedDomains && Array.isArray(allowedDomains)) {
    try {
      const urlObj = new URL(trimmed);
      const hostname = urlObj.hostname.toLowerCase();
      
      const isAllowed = allowedDomains.some(domain => {
        const domainLower = domain.toLowerCase();
        return hostname === domainLower || hostname.endsWith(`.${domainLower}`);
      });

      if (!isAllowed) {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  return trimmed;
}

/**
 * Sanitize WhatsApp media URL
 * Only allows URLs from WhatsApp CDN domains
 * @param {string} url - The media URL from WhatsApp
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeWhatsAppMediaUrl(url) {
  return sanitizeUrl(url, {
    allowedProtocols: ['https'],
    allowedDomains: WHATSAPP_CDN_DOMAINS,
    maxLength: SANITIZATION_LIMITS.MAX_URL_LENGTH,
  });
}

/**
 * Sanitize object with multiple fields
 * @param {object} obj - Object containing fields to sanitize
 * @param {object} fieldMap - Map of field names to sanitization functions
 * @returns {object} Object with sanitized fields
 */
function sanitizeObject(obj, fieldMap) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const [field, sanitizeFn] of Object.entries(fieldMap)) {
    if (obj[field] !== undefined && typeof sanitizeFn === 'function') {
      sanitized[field] = sanitizeFn(obj[field]);
    }
  }

  return sanitized;
}

/**
 * Sanitize contact data
 * @param {object} contact - Contact object with name, phone, email, etc.
 * @returns {object} Sanitized contact object
 */
function sanitizeContact(contact) {
  return sanitizeObject(contact, {
    name: sanitizeName,
    phoneNumber: sanitizePhoneNumber,
    email: sanitizeEmail,
    notes: notes => sanitizeText(notes, { maxLength: SANITIZATION_LIMITS.MAX_DESCRIPTION_LENGTH }),
    companyName: sanitizeName,
    jobTitle: sanitizeName,
    address: addr => sanitizeText(addr, { maxLength: SANITIZATION_LIMITS.MAX_ADDRESS_LENGTH }),
    city: sanitizeName,
    country: sanitizeName,
  });
}

/**
 * Sanitize message content object
 * @param {object} content - Message content object
 * @returns {object} Sanitized content object
 */
function sanitizeMessageContent(content) {
  if (!content || typeof content !== 'object') {
    return content;
  }

  const sanitized = { ...content };

  // Sanitize based on message type
  if (sanitized.text) {
    sanitized.text = sanitizeMessage(sanitized.text);
  }

  if (sanitized.caption) {
    sanitized.caption = sanitizeCaption(sanitized.caption);
  }

  if (sanitized.body) {
    sanitized.body = sanitizeMessage(sanitized.body);
  }

  // Sanitize media URLs
  if (sanitized.mediaUrl) {
    sanitized.mediaUrl = sanitizeWhatsAppMediaUrl(sanitized.mediaUrl);
  }

  if (sanitized.url) {
    sanitized.url = sanitizeWhatsAppMediaUrl(sanitized.url);
  }

  // Sanitize filename
  if (sanitized.filename) {
    sanitized.filename = sanitizeText(sanitized.filename, {
      allowNewlines: false,
      maxLength: SANITIZATION_LIMITS.MAX_FILENAME_LENGTH,
      stripHtml: true,
    });
  }

  return sanitized;
}

/**
 * Check if string contains potential XSS patterns
 * @param {string} input - String to check
 * @returns {boolean} True if suspicious patterns detected
 */
function containsXssPatterns(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize and validate input, throwing error if XSS detected
 * @param {string} input - Input to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string} Sanitized input
 * @throws {Error} If XSS patterns detected
 */
function sanitizeAndValidate(input, fieldName = 'input') {
  if (containsXssPatterns(input)) {
    throw new Error(`Potentially malicious content detected in ${fieldName}`);
  }

  return sanitizeText(input);
}

/**
 * Deep sanitize an object by removing/masking sensitive fields
 * Used for logging to prevent sensitive data exposure
 * @param {*} obj - Object to sanitize
 * @param {number} depth - Current recursion depth (prevents infinite loops)
 * @returns {*} Sanitized copy of the object
 */
function deepSanitize(obj, depth = 0) {
  // Prevent deep recursion
  if (depth > SANITIZATION_LIMITS.MAX_RECURSION_DEPTH) {
    return '[Max Depth Reached]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, depth + 1));
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Use constant sensitive patterns
  const sensitivePatterns = [...SENSITIVE_FIELD_PATTERNS];

  // Optionally redact phone numbers in logs (configurable)
  const redactPhones = process.env.LOG_REDACT_PHONES === 'true';
  if (redactPhones) {
    sensitivePatterns.push(/phone/i, /mobile/i, /tel/i);
  }

  // Clone object
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if this field should be redacted
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));

    if (isSensitive) {
      // Redact sensitive fields
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = '***REDACTED***';
      } else if (value !== null && value !== undefined) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = value;
      }
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = deepSanitize(value, depth + 1);
    } else {
      // Keep non-sensitive primitive values
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Mask sensitive data in string (like credit cards, SSN, etc.)
 * Shows only last 4 characters
 * @param {string} str - String to mask
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} Masked string
 */
function maskSensitiveString(str, visibleChars = 4) {
  if (!str || typeof str !== 'string') {
    return str;
  }

  if (str.length <= visibleChars) {
    return '*'.repeat(str.length);
  }

  const masked = '*'.repeat(str.length - visibleChars);
  const visible = str.slice(-visibleChars);
  return masked + visible;
}

module.exports = {
  sanitizeText,
  sanitizeName,
  sanitizeMessage,
  sanitizeCaption,
  sanitizePhoneNumber,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeWhatsAppMediaUrl,
  sanitizeObject,
  sanitizeContact,
  sanitizeMessageContent,
  containsXssPatterns,
  sanitizeAndValidate,
  deepSanitize,
  maskSensitiveString
};
