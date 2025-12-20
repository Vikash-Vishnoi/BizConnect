/**
 * Welcome Message Configuration - Automatic messages for first-time contacts
 */

// Constants for welcome messages
const DEFAULT_WELCOME_MESSAGE_ENABLED = false; // Default welcome message enabled state
const DEFAULT_WELCOME_STRATEGY = 'template'; // Default strategy: 'template' or 'text'
const DEFAULT_WELCOME_TEMPLATE_PATTERN = 'welcome|greeting|hello|hi'; // Default template name pattern
const DEFAULT_WELCOME_TEMPLATE_NAME = 'welcome_message'; // Fallback template name
const DEFAULT_WELCOME_TEMPLATE_LANGUAGE = 'en'; // Default template language
const DEFAULT_WELCOME_TEMPLATE_CATEGORY = 'UTILITY'; // Default template category
const DEFAULT_WELCOME_TEXT = `Hello! 👋 Thank you for contacting us. We've received your message and will respond shortly.`; // Default welcome text
const DEFAULT_WELCOME_USE_RANDOM = false; // Use random messages
const DEFAULT_WELCOME_DELAY_MS = 2000; // Default delay before sending (ms)
const DEFAULT_BUSINESS_HOURS_ENABLED = false; // Business hours check enabled
const DEFAULT_OUTSIDE_HOURS_MESSAGE = `Hello! 👋 Thank you for contacting us. We're currently outside business hours but will respond when we're back.`; // Outside hours message
const DEFAULT_TIMEZONE = 'UTC'; // Default timezone
const DEFAULT_WELCOME_LOGGING = false; // Logging enabled for welcome messages

module.exports = {
  enabled: process.env.WELCOME_MESSAGE_ENABLED === 'true' || DEFAULT_WELCOME_MESSAGE_ENABLED,  

  strategy: process.env.WELCOME_MESSAGE_STRATEGY || DEFAULT_WELCOME_STRATEGY,

  template: {
    namePattern: new RegExp(process.env.WELCOME_TEMPLATE_PATTERN || DEFAULT_WELCOME_TEMPLATE_PATTERN, 'i'),
    fallbackName: process.env.WELCOME_TEMPLATE_NAME || DEFAULT_WELCOME_TEMPLATE_NAME,
    language: process.env.WELCOME_TEMPLATE_LANGUAGE || DEFAULT_WELCOME_TEMPLATE_LANGUAGE,
    category: process.env.WELCOME_TEMPLATE_CATEGORY || DEFAULT_WELCOME_TEMPLATE_CATEGORY,
  },

  textMessage: {
    message: process.env.WELCOME_MESSAGE_TEXT || DEFAULT_WELCOME_TEXT,
    useRandom: process.env.WELCOME_MESSAGE_USE_RANDOM === 'true' || DEFAULT_WELCOME_USE_RANDOM,
  },

  delay: parseInt(process.env.WELCOME_MESSAGE_DELAY) || DEFAULT_WELCOME_DELAY_MS,

  businessHours: {
    enabled: process.env.WELCOME_BUSINESS_HOURS_ENABLED === 'true' || DEFAULT_BUSINESS_HOURS_ENABLED,
    outsideHoursMessage: process.env.WELCOME_OUTSIDE_HOURS_MESSAGE || DEFAULT_OUTSIDE_HOURS_MESSAGE,
    timezone: process.env.TIMEZONE || DEFAULT_TIMEZONE,
  },

  logging: {
    enabled: process.env.WELCOME_MESSAGE_LOGGING === 'true' || DEFAULT_WELCOME_LOGGING,
  },
};
