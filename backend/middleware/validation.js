const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Express-validator rules for input validation
 */

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
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
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
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  
  body('templateId')
    .optional()
    .isMongoId().withMessage('Invalid template ID'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ min: 1, max: 4096 }).withMessage('Message must be between 1 and 4096 characters'),
  
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
      if (recipients.length > 10000) {
        throw new Error('Maximum 10,000 recipients allowed per campaign');
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
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  
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
    .isLength({ min: 1, max: 512 }).withMessage('Template name must be between 1 and 512 characters')
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
    .isLength({ min: 1, max: 4096 }).withMessage('Message must be between 1 and 4096 characters'),
  
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
  
  // Analytics
  validateDateRange,
  validatePagination,
  
  // Utility
  handleValidationErrors
};
