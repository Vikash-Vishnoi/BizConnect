/**
 * Common validation helper utilities
 * Reusable validation functions to reduce code duplication
 */

/**
 * Validate bulk operation array
 * @param {Array} items - Array of items to validate
 * @param {string} itemName - Name of items for error messages (e.g., 'conversation IDs', 'contact IDs')
 * @param {number} maxLimit - Maximum allowed items
 * @throws {Error} If validation fails
 */
function validateBulkArray(items, itemName = 'items', maxLimit = 100) {
  if (!items || !Array.isArray(items)) {
    throw new Error(`${itemName} must be an array`);
  }

  if (items.length === 0) {
    throw new Error(`No ${itemName} provided`);
  }

  if (items.length > maxLimit) {
    throw new Error(`Cannot process more than ${maxLimit} ${itemName} at once`);
  }

  return true;
}

/**
 * Validate required fields in an object
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @throws {Error} If any required field is missing
 */
function validateRequiredFields(obj, requiredFields) {
  const missing = requiredFields.filter(field => !obj || obj[field] === undefined || obj[field] === null);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  return true;
}

/**
 * Validate string is not empty
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If string is empty or not a string
 */
function validateNonEmptyString(value, fieldName = 'Field') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return true;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @throws {Error} If email format is invalid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return true;
}

/**
 * Validate phone number format (E.164)
 * @param {string} phone - Phone number to validate
 * @throws {Error} If phone format is invalid
 */
function validatePhoneNumber(phone) {
  // E.164 format: +[country code][number] (max 15 digits)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  
  if (!phone || !phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
  }

  return true;
}

/**
 * Validate number is within range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If number is out of range
 */
function validateNumberRange(value, min, max, fieldName = 'Value') {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return true;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If string length is invalid
 */
function validateStringLength(value, minLength, maxLength, fieldName = 'Field') {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  if (value.length < minLength || value.length > maxLength) {
    throw new Error(`${fieldName} must be between ${minLength} and ${maxLength} characters`);
  }

  return true;
}

/**
 * Validate ObjectId format (MongoDB)
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If ID format is invalid
 */
function validateObjectId(id, fieldName = 'ID') {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  if (!id || !objectIdRegex.test(id)) {
    throw new Error(`${fieldName} must be a valid MongoDB ObjectId`);
  }

  return true;
}

/**
 * Validate value is in allowed list
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If value is not in allowed list
 */
function validateEnum(value, allowedValues, fieldName = 'Value') {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return true;
}

module.exports = {
  validateBulkArray,
  validateRequiredFields,
  validateNonEmptyString,
  validateEmail,
  validatePhoneNumber,
  validateNumberRange,
  validateStringLength,
  validateObjectId,
  validateEnum
};
