/**
 * Phone Number Validation Utility
 * 
 * Validates phone numbers in E.164 format (international standard)
 * Format: +[country code][number] (e.g., +14155552671, +919876543210)
 * 
 * Rules:
 * - Must start with +
 * - Followed by country code (1-3 digits)
 * - Followed by subscriber number (4-14 digits)
 * - Total length: 8-15 characters (including +)
 * - No spaces, dashes, or special characters
 * 
 * @module common/helpers/phoneValidator
 */

const logger = require('./logger');

// E.164 format regex pattern
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// Common country codes (3-digit)
const THREE_DIGIT_COUNTRY_CODES = ['971', '966', '965', '968', '974', '973', '964', '962', '963'];

// Phone number length constraints
const PHONE_CONSTRAINTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 15,
  MIN_COUNTRY_CODE_LENGTH: 1,
  MAX_COUNTRY_CODE_LENGTH: 3,
};
 
/**
 * Validate phone number in E.164 format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhoneNumber = phoneNumber => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  return E164_REGEX.test(phoneNumber);
};

/**
 * Format phone number to E.164 format (basic conversion)
 * Note: This is a simple formatter. For production, consider using libphonenumber-js
 * @param {string} phoneNumber - Phone number to format
 * @param {string} defaultCountryCode - Default country code (e.g., '91' for India)
 * @returns {string} - Formatted phone number or original if can't format
 */
const formatToE164 = (phoneNumber, defaultCountryCode = '1') => {
  if (!phoneNumber) {
    return phoneNumber;
  }

  try {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If already starts with +, return as is if valid
    if (phoneNumber.startsWith('+') && isValidPhoneNumber(phoneNumber)) {
      return phoneNumber;
    }

    // If doesn't start with country code, add default
    if (!cleaned.startsWith(defaultCountryCode) && cleaned.length >= 10) {
      cleaned = defaultCountryCode + cleaned;
    }

    // Add + prefix
    const formatted = `+${cleaned}`;

    // Validate the formatted number
    if (isValidPhoneNumber(formatted)) {
      return formatted;
    }

    // If can't format properly, return original
    logger.debug('Unable to format phone number to E.164', { phoneNumber });
    return phoneNumber;
  } catch (error) {
    logger.error('Error formatting phone number', { phoneNumber, error: error.message });
    return phoneNumber;
  }
};

/**
 * Sanitize phone number (remove formatting but keep digits and +)
 * @param {string} phoneNumber - Phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
const sanitizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return phoneNumber;
  }

  // Keep only digits and leading +
  return phoneNumber.replace(/[^\d+]/g, '');
};

/**
 * Extract country code from E.164 phone number
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {string|null} - Country code or null if invalid
 */
const extractCountryCode = phoneNumber => {
  if (!isValidPhoneNumber(phoneNumber)) {
    return null;
  }

  try {
    // Remove + and get first 1-3 digits
    const digits = phoneNumber.substring(1);
    
    // Try 3-digit codes first (e.g., +971 UAE)
    const threeDigit = digits.substring(0, 3);
    if (THREE_DIGIT_COUNTRY_CODES.includes(threeDigit)) {
      return threeDigit;
    }

    // Try 2-digit codes (e.g., +91 India, +44 UK)
    const twoDigit = digits.substring(0, 2);
    const twoDigitNum = parseInt(twoDigit, 10);
    if (twoDigitNum >= 20 && twoDigitNum <= 99) {
      return twoDigit;
    }

    // Default to 1-digit code (e.g., +1 US/Canada)
    return digits.substring(0, 1);
  } catch (error) {
    logger.error('Error extracting country code', { phoneNumber, error: error.message });
    return null;
  }
};

/**
 * Get phone number without country code
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {string|null} - Phone number without country code or null if invalid
 */
const getNumberWithoutCountryCode = phoneNumber => {
  if (!isValidPhoneNumber(phoneNumber)) {
    return null;
  }

  try {
    const countryCode = extractCountryCode(phoneNumber);
    if (!countryCode) {
      return null;
    }

    return phoneNumber.substring(1 + countryCode.length);
  } catch (error) {
    logger.error('Error removing country code', { phoneNumber, error: error.message });
    return null;
  }
};

/**
 * Mongoose validator function
 * Can be used in schema definitions
 */
const phoneNumberValidator = {
  validator: isValidPhoneNumber,
  message: props => `${props.value} is not a valid phone number. Use E.164 format (e.g., +14155552671)`
};

module.exports = {
  isValidPhoneNumber,
  formatToE164,
  sanitizePhoneNumber,
  extractCountryCode,
  getNumberWithoutCountryCode,
  phoneNumberValidator
};
