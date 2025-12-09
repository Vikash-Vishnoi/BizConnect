/**
 * Welcome Message Configuration - Automatic messages for first-time contacts
 */

module.exports = {
  enabled: process.env.WELCOME_MESSAGE_ENABLED === 'true',  

  strategy: process.env.WELCOME_MESSAGE_STRATEGY || 'template',

  template: {
    namePattern: new RegExp(process.env.WELCOME_TEMPLATE_PATTERN || 'welcome|greeting|hello|hi', 'i'),
    fallbackName: process.env.WELCOME_TEMPLATE_NAME || 'welcome_message',
    language: process.env.WELCOME_TEMPLATE_LANGUAGE || 'en',
    category: process.env.WELCOME_TEMPLATE_CATEGORY || 'UTILITY',
  },

  textMessage: {
    message: process.env.WELCOME_MESSAGE_TEXT || `Hello! 👋 Thank you for contacting us. We've received your message and will respond shortly.`,
    useRandom: process.env.WELCOME_MESSAGE_USE_RANDOM === 'true',
  },

  delay: parseInt(process.env.WELCOME_MESSAGE_DELAY) || 2000,

  businessHours: {
    enabled: process.env.WELCOME_BUSINESS_HOURS_ENABLED === 'true',
    outsideHoursMessage: process.env.WELCOME_OUTSIDE_HOURS_MESSAGE || `Hello! 👋 Thank you for contacting us. We're currently outside business hours but will respond when we're back.`,
    timezone: process.env.TIMEZONE || 'UTC',
  },

  logging: {
    enabled: process.env.WELCOME_MESSAGE_LOGGING === 'true',
  },
};
