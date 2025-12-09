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
 */
 
/**
 * Validate phone number in E.164 format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  // E.164 format regex
  // ^\\+[1-9]\\d{1,14}$
  // ^ = start of string
  // \\+ = literal plus sign
  // [1-9] = first digit (1-9, no leading zero in country code)
  // \\d{1,14} = 1 to 14 more digits
  // $ = end of string
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  
  return e164Regex.test(phoneNumber);
};

/**
 * Format phone number to E.164 format (basic conversion)
 * Note: This is a simple formatter. For production, consider using libphonenumber-js
 * @param {string} phoneNumber - Phone number to format
 * @param {string} defaultCountryCode - Default country code (e.g., '91' for India)
 * @returns {string} - Formatted phone number or original if can't format
 */
const formatToE164 = (phoneNumber, defaultCountryCode = '1') => {
  if (!phoneNumber) return phoneNumber;

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
  const formatted = '+' + cleaned;

  // Validate the formatted number
  if (isValidPhoneNumber(formatted)) {
    return formatted;
  }

  // If can't format properly, return original
  return phoneNumber;
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
const extractCountryCode = (phoneNumber) => {
  if (!isValidPhoneNumber(phoneNumber)) {
    return null;
  }

  // Remove + and get first 1-3 digits
  const digits = phoneNumber.substring(1);
  
  // Try 3-digit codes first (e.g., +971 UAE)
  const threeDigit = digits.substring(0, 3);
  if (['971', '966', '965', '968', '974', '973'].includes(threeDigit)) {
    return threeDigit;
  }

  // Try 2-digit codes (e.g., +91 India, +44 UK)
  const twoDigit = digits.substring(0, 2);
  if (parseInt(twoDigit) >= 20 && parseInt(twoDigit) <= 99) {
    return twoDigit;
  }

  // Default to 1-digit code (e.g., +1 US/Canada)
  return digits.substring(0, 1);
};

/**
 * Get phone number without country code
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {string|null} - Phone number without country code or null if invalid
 */
const getNumberWithoutCountryCode = (phoneNumber) => {
  if (!isValidPhoneNumber(phoneNumber)) {
    return null;
  }

  const countryCode = extractCountryCode(phoneNumber);
  if (!countryCode) {
    return null;
  }

  return phoneNumber.substring(1 + countryCode.length);
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
