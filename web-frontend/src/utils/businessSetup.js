/**
 * Business Setup Utilities
 * Helper functions for detecting and handling business setup requirements
 */

import { ERROR_MESSAGES } from '../config/constants';

// Constants for business setup error detection
const BUSINESS_SETUP_ERROR_KEYWORDS = [
  'business',
  'X-Business-ID',
  'Business setup',
  'business setup',
];

/**
 * Check if an error is related to missing business setup
 * @param {string|Error} error - The error message or Error object
 * @returns {boolean} - True if error is business setup related
 */
export const isBusinessSetupError = (error) => {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  
  return BUSINESS_SETUP_ERROR_KEYWORDS.some(keyword => 
    errorMessage.includes(keyword)
  );
};

/**
 * Check if user should be redirected to business setup
 * @param {string|Error} error - The error message or Error object
 * @returns {boolean} - True if should redirect
 */
export const shouldRedirectToBusinessSetup = (error) => {
  return isBusinessSetupError(error);
};

// Context-specific business setup messages
const BUSINESS_SETUP_MESSAGES = {
  contacts: 'Please complete your business setup to manage contacts',
  campaigns: 'Please complete your business setup to start creating campaigns',
  templates: 'Please complete your business setup to start creating templates',
  inbox: 'Please complete your business setup to access conversations',
  messages: 'Please complete your business setup to send messages',
  flows: 'Please complete your business setup to create automation flows',
  analytics: 'Please complete your business setup to view analytics',
};

/**
 * Get business setup error message for user display
 * @param {string} context - Context of where error occurred (e.g., 'contacts', 'campaigns')
 * @returns {string} - User-friendly error message
 */
export const getBusinessSetupMessage = (context = 'this feature') => {
  return BUSINESS_SETUP_MESSAGES[context] || 
    `${ERROR_MESSAGES.BUSINESS_SETUP_REQUIRED} to access ${context}`;
};

/**
 * Pages that require business setup to function
 */
export const BUSINESS_REQUIRED_PAGES = [
  '/contacts',
  '/campaigns',
  '/templates',
  '/inbox',
  '/flows',
  '/analytics',
  '/scheduled',
  '/saved-replies',
];

/**
 * Check if current page requires business setup
 * @param {string} pathname - Current pathname from router
 * @returns {boolean} - True if page requires business
 */
export const pageRequiresBusinessSetup = (pathname) => {
  return BUSINESS_REQUIRED_PAGES.some(page => pathname.startsWith(page));
};
