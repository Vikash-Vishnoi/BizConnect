/**
 * Contact Rate Limit Routes
 * Per-contact rate limiting (WhatsApp enforces 10 messages/minute per phone number)
 * @module routes/contacts/rateLimitRoutes
 */

const express = require('express');
const router = express.Router();
const Contact = require('../../../core/database/models/Contact');
const Conversation = require('../../../core/database/models/Conversation');
const logger = require('../../../common/helpers/logger');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const { businessContext } = require('../../../core/middlewares/businessContext');

// Apply business context middleware to all routes
router.use(businessContext);

// Constants for rate limiting
const RATE_LIMIT_PER_CONTACT = 10; // WhatsApp limit: 10 messages per minute per phone
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window in milliseconds
const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute window in seconds

/**
 * @route   GET /api/contacts/:phoneNumber/rate-limit
 * @desc    Get rate limit status for a specific contact
 * @access  Private
 * @returns { allowed: boolean, messageCount: number, windowReset: Date, throttledUntil: Date }
 */
router.get('/:phoneNumber/rate-limit', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phoneNumber } = req.params;

    // Input validation
    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'phoneNumber is required'
      });
    }

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Contact not found'
      });
    }

    const now = new Date();
    const rateLimiting = contact.rateLimiting || {};
    
    // Check if rate limit window needs to be reset (1-minute rolling window)
    let messageCount = rateLimiting.messageCount || 0;
    let windowStartAt = rateLimiting.windowStartAt;
    let isThrottled = rateLimiting.isThrottled || false;
    let throttledUntil = rateLimiting.throttledUntil;

    // Reset window if it's been more than 1 minute
    if (windowStartAt) {
      const windowElapsed = (now - new Date(windowStartAt)) / 1000; // seconds
      if (windowElapsed >= RATE_LIMIT_WINDOW_SECONDS) {
        messageCount = 0;
        windowStartAt = now;
        isThrottled = false;
        throttledUntil = null;
      }
    } else {
      windowStartAt = now;
    }

    // Check if throttle period has expired
    if (isThrottled && throttledUntil && now > new Date(throttledUntil)) {
      isThrottled = false;
      throttledUntil = null;
      messageCount = 0;
      windowStartAt = now;
    }

    const allowed = !isThrottled && messageCount < RATE_LIMIT_PER_CONTACT;
    const remaining = Math.max(0, RATE_LIMIT_PER_CONTACT - messageCount);
    
    // Calculate when the window will reset
    const windowResetAt = new Date(new Date(windowStartAt).getTime() + RATE_LIMIT_WINDOW_MS);

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      phoneNumber,
      allowed,
      messageCount,
      remaining,
      limit: RATE_LIMIT_PER_CONTACT,
      windowResetAt,
      isThrottled,
      throttledUntil,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get rate limit error', {
      businessId: req.businessId?.toString(),
      phoneNumber: req.params.phoneNumber,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get rate limit status'
    });
  }
});

/**
 * @route   GET /api/contacts/:phoneNumber/message-queue
 * @desc    Get queued messages for a contact (messages waiting due to rate limiting)
 * @access  Private
 */
router.get('/:phoneNumber/message-queue', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phoneNumber } = req.params;

    // Input validation
    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'phoneNumber is required'
      });
    }

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

  if (!contact) {
    throw new NotFoundError('Contact not found');
  }

  // Find conversation
  const conversation = await Conversation.findOne({
    businessId: req.businessId,
    phoneNumber
  });

  if (!conversation) {
    return res.success({
      phoneNumber,
      queuedMessages: [],
      count: 0
    });
  }

  // Filter messages that are queued for rate limiting
  const queuedMessages = conversation.messages.filter(msg => 
    msg.queuedForRateLimit === true && 
    msg.status !== 'sent' &&
    msg.status !== 'failed'
  );

  // Sort by scheduled send time
  queuedMessages.sort((a, b) => 
    new Date(a.scheduledSendAt) - new Date(b.scheduledSendAt)
  );

  return res.success({
    phoneNumber,
    queuedMessages: queuedMessages.map(msg => ({
      id: msg._id,
      type: msg.type,
      content: msg.content,
      scheduledSendAt: msg.scheduledSendAt,
      queuedAt: msg.timestamp,
      estimatedSendIn: msg.scheduledSendAt 
        ? Math.max(0, Math.ceil((new Date(msg.scheduledSendAt) - new Date()) / 1000))
        : null
    })),
    count: queuedMessages.length
  });
  } catch (error) {
    logger.error('Error getting queued messages', { 
      error: error.message, 
      phoneNumber: req.params.phoneNumber,
      businessId: req.businessId?.toString() 
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get queued messages'
    });
  }
});

/**
 * @route   POST /api/contacts/:phoneNumber/rate-limit/check
 * @desc    Check if sending a message to this contact is allowed (without updating counter)
 * @access  Private
 */
router.post('/:phoneNumber/rate-limit/check', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phoneNumber } = req.params;

    // Input validation
    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'phoneNumber is required'
      });
    }

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Contact not found'
      });
    }

    const now = new Date();
    const rateLimiting = contact.rateLimiting || {};
    
    let messageCount = rateLimiting.messageCount || 0;
    let windowStartAt = rateLimiting.windowStartAt;
    let isThrottled = rateLimiting.isThrottled || false;
    let throttledUntil = rateLimiting.throttledUntil;

    // Reset window if it's been more than 1 minute
    if (windowStartAt) {
      const windowElapsed = (now - new Date(windowStartAt)) / 1000;
      if (windowElapsed >= RATE_LIMIT_WINDOW_SECONDS) {
        messageCount = 0;
        isThrottled = false;
      }
    }

    // Check if throttle period has expired
    if (isThrottled && throttledUntil && now > new Date(throttledUntil)) {
      isThrottled = false;
      messageCount = 0;
    }

    const allowed = !isThrottled && messageCount < RATE_LIMIT_PER_CONTACT;

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      phoneNumber,
      allowed,
      messageCount,
      limit: RATE_LIMIT_PER_CONTACT,
      isThrottled,
      throttledUntil,
      recommendation: allowed
        ? 'Message can be sent immediately'
        : isThrottled
          ? `Wait until ${new Date(throttledUntil).toISOString()}`
          : 'Queue message for later delivery (rate limit reached)',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Check rate limit error', {
      businessId: req.businessId?.toString(),
      phoneNumber: req.params.phoneNumber,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to check rate limit'
    });
  }
});

/**
 * @route   POST /api/contacts/:phoneNumber/rate-limit/increment
 * @desc    Increment rate limit counter after sending a message
 * @access  Private (Internal use by messaging service)
 */
router.post('/:phoneNumber/rate-limit/increment', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phoneNumber } = req.params;

    // Input validation
    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'phoneNumber is required'
      });
    }

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_CODES.NOT_FOUND,
        message: 'Contact not found'
      });
    }

    const now = new Date();
    
    if (!contact.rateLimiting) {
      contact.rateLimiting = {};
    }

    // Initialize or reset window
    if (!contact.rateLimiting.windowStartAt) {
      contact.rateLimiting.windowStartAt = now;
      contact.rateLimiting.messageCount = 0;
    } else {
      // Check if window should reset
      const windowElapsed = (now - new Date(contact.rateLimiting.windowStartAt)) / 1000;
      if (windowElapsed >= RATE_LIMIT_WINDOW_SECONDS) {
        contact.rateLimiting.windowStartAt = now;
        contact.rateLimiting.messageCount = 0;
        contact.rateLimiting.isThrottled = false;
        contact.rateLimiting.throttledUntil = null;
      }
    }

    // Increment counter
    contact.rateLimiting.messageCount = (contact.rateLimiting.messageCount || 0) + 1;
    contact.rateLimiting.lastMessageAt = now;

    // Check if limit reached
    if (contact.rateLimiting.messageCount >= RATE_LIMIT_PER_CONTACT) {
      contact.rateLimiting.isThrottled = true;
      // Throttle until window resets (1 minute from window start)
      contact.rateLimiting.throttledUntil = new Date(
        new Date(contact.rateLimiting.windowStartAt).getTime() + RATE_LIMIT_WINDOW_MS
      );
    }

    await contact.save();

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      phoneNumber,
      messageCount: contact.rateLimiting.messageCount,
      limit: RATE_LIMIT_PER_CONTACT,
      isThrottled: contact.rateLimiting.isThrottled,
      throttledUntil: contact.rateLimiting.throttledUntil,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Increment rate limit error', {
      businessId: req.businessId?.toString(),
      phoneNumber: req.params.phoneNumber,
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to increment rate limit'
    });
  }
});

/**
 * @route   GET /api/contacts/rate-limit/throttled
 * @desc    Get all currently throttled contacts
 * @access  Private
 */
router.get('/rate-limit/throttled', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const now = new Date();

    const throttledContacts = await Contact.find({
      businessId: req.businessId,
      'rateLimiting.isThrottled': true,
      'rateLimiting.throttledUntil': { $gt: now }
    }).select('phoneNumber name rateLimiting');

    const processingTime = Date.now() - startTime;

    return res.status(HTTP_STATUS.OK).json({
      throttledContacts: throttledContacts.map(contact => ({
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        messageCount: contact.rateLimiting.messageCount,
        limit: RATE_LIMIT_PER_CONTACT,
        throttledUntil: contact.rateLimiting.throttledUntil,
        windowResetIn: Math.ceil(
          (new Date(contact.rateLimiting.throttledUntil) - now) / 1000
        )
      })),
      count: throttledContacts.length,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Get throttled contacts error', {
      businessId: req.businessId?.toString(),
      error: error.message,
      processingTime
    });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get throttled contacts'
    });
  }
});

module.exports = router;
