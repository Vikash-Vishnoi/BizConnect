/**
 * Welcome Message Configuration
 * 
 * Configure automatic welcome messages sent to first-time contacts
 */

module.exports = {
  // Enable/disable automatic welcome messages
  enabled: true,

  // Strategy: 'template' or 'text'
  // 'template' - Use approved WhatsApp template (recommended for Business API)
  // 'text' - Send simple text message (may have limitations with WhatsApp)
  strategy: 'template',

  // Template settings (when strategy is 'template')
  template: {
    // Template name pattern to search for (regex)
    // Will find templates with names like: welcome, greeting, hello, etc.
    namePattern: /welcome|greeting|hello|hi/i,
    
    // Fallback template name (if pattern search fails)
    fallbackName: 'welcome_message',
    
    // Default language code
    language: 'en',
    
    // Template category
    category: 'UTILITY', // or 'MARKETING'
  },

  // Text message settings (when strategy is 'text' or template not found)
  textMessage: {
    // Default welcome message
    message: `Hello! 👋 Thank you for contacting us. We've received your message and will respond shortly.`,
    
    // Alternative messages (randomly selected)
    alternatives: [
      `Hi there! 👋 Thanks for reaching out. We'll get back to you as soon as possible.`,
      `Welcome! 🎉 We've received your message and our team will respond shortly.`,
      `Hello! 😊 Thank you for contacting us. Someone from our team will assist you soon.`,
    ],
    
    // Use random alternative message
    useRandom: false,
  },

  // Delay before sending welcome message (in milliseconds)
  // Set to 0 for immediate send
  delay: 2000, // 2 seconds

  // Business hours check (optional)
  businessHours: {
    enabled: false,
    
    // Send different message outside business hours
    outsideHoursMessage: `Hello! 👋 Thank you for contacting us. We're currently outside business hours but will respond when we're back.`,
    
    // Business hours (24-hour format)
    hours: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '10:00', end: '14:00' },
      sunday: null, // Closed
    },
    
    // Timezone
    timezone: 'Asia/Kolkata',
  },

  // Logging
  logging: {
    enabled: true,
    logSuccess: true,
    logFailure: true,
  },
};
