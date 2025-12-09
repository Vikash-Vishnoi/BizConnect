const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Express-validator rules for input validation
 */

// Configuration from environment variables
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH) || 4096;
const MAX_TEMPLATE_NAME_LENGTH = parseInt(process.env.MAX_TEMPLATE_NAME_LENGTH) || 512;
const MAX_CAMPAIGN_RECIPIENTS = parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS) || 10000;
const MIN_PASSWORD_LENGTH = parseInt(process.env.MIN_PASSWORD_LENGTH) || 6;
const MAX_NAME_LENGTH = parseInt(process.env.MAX_NAME_LENGTH) || 100;
const MAX_DESCRIPTION_LENGTH = parseInt(process.env.MAX_DESCRIPTION_LENGTH) || 1000;
const MAX_BULK_CONTACTS = parseInt(process.env.MAX_BULK_CONTACTS) || 1000;
const MAX_SEND_RATE = parseInt(process.env.MAX_SEND_RATE) || 80;

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// ========================================
// Authentication Validation Rules
// ========================================

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: MIN_PASSWORD_LENGTH }).withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

// ========================================
// Campaign Validation Rules
// ========================================

const validateCreateCampaign = [
  body('name')
    .trim()
    .notEmpty().withMessage('Campaign name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Campaign name must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: MAX_DESCRIPTION_LENGTH }).withMessage(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`),
  
  body('templateId')
    .optional()
    .isMongoId().withMessage('Invalid template ID'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH }).withMessage(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`),
  
  body('scheduledAt')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
  
  body('recipients')
    .isArray({ min: 1 }).withMessage('At least one recipient is required')
    .custom((recipients) => {
      if (recipients.length > MAX_CAMPAIGN_RECIPIENTS) {
        throw new Error(`Maximum ${MAX_CAMPAIGN_RECIPIENTS} recipients allowed`);
      }
      return true;
    }),
  
  body('recipients.*.phoneNumber')
    .trim()
    .notEmpty().withMessage('Recipient phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (E.164 format)'),
  
  body('recipients.*.name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Recipient name cannot exceed 100 characters'),
  
  body('settings.sendRate')
    .optional()
    .isInt({ min: 1, max: 80 }).withMessage('Send rate must be between 1 and 80 messages per minute'),
  
  body('settings.retryFailed')
    .optional()
    .isBoolean().withMessage('retryFailed must be a boolean'),
  
  body('settings.maxRetries')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('maxRetries must be between 0 and 10'),
  
  handleValidationErrors
];

const validateUpdateCampaign = [
  param('id')
    .isMongoId().withMessage('Invalid campaign ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Campaign name must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: MAX_DESCRIPTION_LENGTH }).withMessage(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`),
  
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'active', 'paused', 'completed', 'failed'])
    .withMessage('Invalid status'),
  
  handleValidationErrors
];

const validateCampaignId = [
  param('id')
    .isMongoId().withMessage('Invalid campaign ID'),
  
  handleValidationErrors
];

// ========================================
// Template Validation Rules
// ========================================

const validateCreateTemplate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Template name is required')
    .isLength({ min: 1, max: MAX_TEMPLATE_NAME_LENGTH }).withMessage(`Template name must be between 1 and ${MAX_TEMPLATE_NAME_LENGTH} characters`)
    .matches(/^[a-z0-9_]+$/).withMessage('Template name can only contain lowercase letters, numbers, and underscores'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['MARKETING', 'UTILITY', 'AUTHENTICATION'])
    .withMessage('Invalid category'),
  
  body('language')
    .notEmpty().withMessage('Language is required')
    .isLength({ min: 2, max: 10 }).withMessage('Language code must be between 2 and 10 characters'),
  
  body('components')
    .isArray({ min: 1 }).withMessage('At least one component is required'),
  
  body('components.*.type')
    .isIn(['HEADER', 'BODY', 'FOOTER', 'BUTTONS'])
    .withMessage('Invalid component type'),
  
  handleValidationErrors
];

const validateTemplateId = [
  param('id')
    .isMongoId().withMessage('Invalid template ID'),
  
  handleValidationErrors
];

// ========================================
// Message/Conversation Validation Rules
// ========================================

const validateSendMessage = [
  body('conversationId')
    .optional()
    .isMongoId().withMessage('Invalid conversation ID'),
  
  body('to')
    .notEmpty().withMessage('Recipient phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (E.164 format)'),
  
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'audio', 'document', 'template', 'location'])
    .withMessage('Invalid message type'),
  
  body('message')
    .if(body('type').equals('text'))
    .notEmpty().withMessage('Message text is required')
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH }).withMessage(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`),
  
  body('templateId')
    .if(body('type').equals('template'))
    .notEmpty().withMessage('Template ID is required for template messages')
    .isMongoId().withMessage('Invalid template ID'),
  
  handleValidationErrors
];

const validateConversationId = [
  param('id')
    .isMongoId().withMessage('Invalid conversation ID'),
  
  handleValidationErrors
];

const validateMarkAsRead = [
  param('id')
    .isMongoId().withMessage('Invalid conversation ID'),
  
  body('messageId')
    .optional()
    .isMongoId().withMessage('Invalid message ID'),
  
  handleValidationErrors
];

// ========================================
// Analytics Validation Rules
// ========================================

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// ========================================
// Contact Validation Rules
// ========================================

const validateCreateContact = [
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (E.164 format)'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Each tag must be between 1 and 50 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  
  handleValidationErrors
];

const validateUpdateContact = [
  param('id')
    .isMongoId().withMessage('Invalid contact ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  
  handleValidationErrors
];

const validateContactId = [
  param('id')
    .isMongoId().withMessage('Invalid contact ID'),
  
  handleValidationErrors
];

const validateBulkContacts = [
  body('contacts')
    .isArray({ min: 1, max: 1000 }).withMessage('Must provide 1-1000 contacts'),
  
  body('contacts.*.phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),
  
  handleValidationErrors
];

// ========================================
// Automation Validation Rules
// ========================================

const validateCreateAutomation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Automation name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  
  body('trigger.type')
    .notEmpty().withMessage('Trigger type is required')
    .isIn(['keyword', 'new_conversation', 'no_response', 'tag_added', 'opt_in', 'webhook'])
    .withMessage('Invalid trigger type'),
  
  body('trigger.config')
    .notEmpty().withMessage('Trigger configuration is required')
    .isObject().withMessage('Trigger config must be an object'),
  
  body('actions')
    .isArray({ min: 1 }).withMessage('At least one action is required'),
  
  body('actions.*.type')
    .isIn(['send_message', 'send_template', 'add_tag', 'remove_tag', 'assign_user', 'webhook', 'wait'])
    .withMessage('Invalid action type'),
  
  body('actions.*.config')
    .notEmpty().withMessage('Action configuration is required'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

const validateUpdateAutomation = [
  param('id')
    .isMongoId().withMessage('Invalid automation ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

const validateAutomationId = [
  param('id')
    .isMongoId().withMessage('Invalid automation ID'),
  
  handleValidationErrors
];

// ========================================
// Flow Validation Rules
// ========================================

const validateCreateFlow = [
  body('name')
    .trim()
    .notEmpty().withMessage('Flow name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
  
  body('flowJson')
    .notEmpty().withMessage('Flow JSON is required')
    .isObject().withMessage('Flow JSON must be a valid object')
    .custom((value) => {
      // Validate basic WhatsApp Flow structure
      if (!value.version || !value.screens) {
        throw new Error('Flow JSON must contain version and screens');
      }
      return true;
    }),
  
  body('category')
    .optional()
    .isIn(['SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'LEAD_GENERATION', 'CONTACT_US', 'CUSTOMER_SUPPORT', 'SURVEY', 'OTHER'])
    .withMessage('Invalid flow category'),
  
  handleValidationErrors
];

const validateUpdateFlow = [
  param('id')
    .isMongoId().withMessage('Invalid flow ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
  
  body('flowJson')
    .optional()
    .isObject().withMessage('Flow JSON must be a valid object'),
  
  handleValidationErrors
];

const validateFlowId = [
  param('id')
    .isMongoId().withMessage('Invalid flow ID'),
  
  handleValidationErrors
];

// ========================================
// Scheduled Message Validation Rules
// ========================================

const validateCreateScheduledMessage = [
  body('conversationId')
    .notEmpty().withMessage('Conversation ID is required')
    .isMongoId().withMessage('Invalid conversation ID'),
  
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH }).withMessage(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`),
  
  body('scheduledAt')
    .notEmpty().withMessage('Scheduled time is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    }),
  
  body('timezone')
    .optional()
    .isString().withMessage('Timezone must be a string'),
  
  body('maxRetries')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Max retries must be between 0 and 5'),
  
  handleValidationErrors
];

const validateUpdateScheduledMessage = [
  param('id')
    .isMongoId().withMessage('Invalid scheduled message ID'),
  
  body('scheduledAt')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['pending', 'sent', 'cancelled', 'failed'])
    .withMessage('Invalid status'),
  
  handleValidationErrors
];

const validateScheduledMessageId = [
  param('id')
    .isMongoId().withMessage('Invalid scheduled message ID'),
  
  handleValidationErrors
];

// ========================================
// Business Validation Rules
// ========================================

const validateCreateBusiness = [
  body('name')
    .trim()
    .notEmpty().withMessage('Business name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Business name must be between 2 and 200 characters'),
  
  body('whatsappConfig.phoneNumberId')
    .optional()
    .trim(),
  
  body('whatsappConfig.phoneNumber')
    .optional()
    .trim(),
  
  body('profile.email')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  
  body('website')
    .optional()
    .trim(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  
  handleValidationErrors
];

const validateUpdateBusiness = [
  param('id')
    .isMongoId().withMessage('Invalid business ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Business name must be between 2 and 200 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('website')
    .optional()
    .trim()
    .isURL().withMessage('Invalid website URL'),
  
  handleValidationErrors
];

const validateBusinessCredentials = [
  param('id')
    .isMongoId().withMessage('Invalid business ID'),
  
  body('whatsappBusinessAccountId')
    .trim()
    .notEmpty().withMessage('WhatsApp Business Account ID is required'),
  
  body('phoneNumberId')
    .trim()
    .notEmpty().withMessage('Phone Number ID is required'),
  
  body('accessToken')
    .trim()
    .notEmpty().withMessage('Access Token is required')
    .isLength({ min: 10 }).withMessage('Access Token appears to be invalid'),
  
  handleValidationErrors
];

const validateBusinessId = [
  param('id')
    .isMongoId().withMessage('Invalid business ID'),
  
  handleValidationErrors
]; 

// ========================================
// Bulk Operation Validation Rules
// ========================================

const validateBulkSendMessage = [
  body('recipients')
    .isArray({ min: 1, max: MAX_BULK_CONTACTS }).withMessage(`Must provide 1-${MAX_BULK_CONTACTS} recipients`),
  
  body('recipients.*.phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),
  
  body('message')
    .if(body('templateId').not().exists())
    .trim()
    .notEmpty().withMessage('Message or template is required')
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH }).withMessage(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`),
  
  body('templateId')
    .if(body('message').not().exists())
    .notEmpty().withMessage('Message or template is required')
    .isMongoId().withMessage('Invalid template ID'),
  
  body('sendRate')
    .optional()
    .isInt({ min: 1, max: MAX_SEND_RATE }).withMessage(`Send rate must be between 1 and ${MAX_SEND_RATE} messages per minute`),
  
  handleValidationErrors
];

// ========================================
// Search and Filter Validation
// ========================================

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),
  
  query('type')
    .optional()
    .isIn(['contact', 'conversation', 'campaign', 'template'])
    .withMessage('Invalid search type'),
  
  handleValidationErrors
];

const validateFilterContacts = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search term too long'),
  
  query('tag')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Tag filter too long'),
  
  query('isOptedIn')
    .optional()
    .isBoolean().withMessage('isOptedIn must be boolean'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'lastMessageAt', 'phoneNumber'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

// ========================================
// Export all validation rules
// ========================================

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  
  // Campaigns
  validateCreateCampaign,
  validateUpdateCampaign,
  validateCampaignId,
  
  // Templates
  validateCreateTemplate,
  validateTemplateId,
  
  // Messages/Conversations
  validateSendMessage,
  validateConversationId,
  validateMarkAsRead,
  
  // Contacts
  validateCreateContact,
  validateUpdateContact,
  validateContactId,
  validateBulkContacts,
  
  // Automations
  validateCreateAutomation,
  validateUpdateAutomation,
  validateAutomationId,
  
  // Flows
  validateCreateFlow,
  validateUpdateFlow,
  validateFlowId,
  
  // Scheduled Messages
  validateCreateScheduledMessage,
  validateUpdateScheduledMessage,
  validateScheduledMessageId,
  
  // Business
  validateCreateBusiness,
  validateUpdateBusiness,
  validateBusinessCredentials,
  validateBusinessId,
  
  // Bulk Operations
  validateBulkSendMessage,
  
  // Search & Filter
  validateSearch,
  validateFilterContacts,
  
  // Analytics
  validateDateRange,
  validatePagination,
  
  // Utility
  handleValidationErrors
};
