/**
 * Contact Rate Limit Routes
 * Per-contact rate limiting (WhatsApp enforces 10 messages/minute per phone number)
 * @module routes/contacts/rateLimitRoutes
 */

const express = require('express');
const router = express.Router();
const Contact = require('../../../core/database/models/Contact');
const Conversation = require('../../../core/database/models/Conversation');
 
/**
 * @route   GET /api/contacts/:phoneNumber/rate-limit
 * @desc    Get rate limit status for a specific contact
 * @access  Private
 * @returns { allowed: boolean, messageCount: number, windowReset: Date, throttledUntil: Date }
 */
router.get('/:phoneNumber/rate-limit', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
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
      if (windowElapsed >= 60) {
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

    const allowed = !isThrottled && messageCount < 10;
    const remaining = Math.max(0, 10 - messageCount);
    
    // Calculate when the window will reset
    const windowResetAt = new Date(new Date(windowStartAt).getTime() + 60000);

    res.json({
      success: true,
      phoneNumber,
      rateLimitStatus: {
        allowed,
        messageCount,
        remaining,
        limit: 10,
        windowStartAt,
        windowResetAt,
        isThrottled,
        throttledUntil,
        message: allowed 
          ? `${remaining} message(s) remaining in current window`
          : isThrottled 
            ? `Throttled until ${new Date(throttledUntil).toISOString()}`
            : 'Rate limit reached (10 messages/minute)'
      }
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/contacts/:phoneNumber/message-queue
 * @desc    Get queued messages for a contact (messages waiting due to rate limiting)
 * @access  Private
 */
router.get('/:phoneNumber/message-queue', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Find conversation
    const conversation = await Conversation.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!conversation) {
      return res.json({
        success: true,
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

    res.json({
      success: true,
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
    console.error('Error getting message queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message queue',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/contacts/:phoneNumber/rate-limit/check
 * @desc    Check if sending a message to this contact is allowed (without updating counter)
 * @access  Private
 */
router.post('/:phoneNumber/rate-limit/check', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
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
      if (windowElapsed >= 60) {
        messageCount = 0;
        isThrottled = false;
      }
    }

    // Check if throttle period has expired
    if (isThrottled && throttledUntil && now > new Date(throttledUntil)) {
      isThrottled = false;
      messageCount = 0;
    }

    const allowed = !isThrottled && messageCount < 10;

    res.json({
      success: true,
      phoneNumber,
      allowed,
      messageCount,
      isThrottled,
      recommendation: allowed
        ? 'Message can be sent immediately'
        : isThrottled
          ? `Wait until ${new Date(throttledUntil).toISOString()}`
          : 'Queue message for later delivery (rate limit reached)'
    });
  } catch (error) {
    console.error('Error checking rate limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check rate limit',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/contacts/:phoneNumber/rate-limit/increment
 * @desc    Increment rate limit counter after sending a message
 * @access  Private (Internal use by messaging service)
 */
router.post('/:phoneNumber/rate-limit/increment', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contact = await Contact.findOne({
      businessId: req.businessId,
      phoneNumber
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
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
      if (windowElapsed >= 60) {
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
    if (contact.rateLimiting.messageCount >= 10) {
      contact.rateLimiting.isThrottled = true;
      // Throttle until window resets (1 minute from window start)
      contact.rateLimiting.throttledUntil = new Date(
        new Date(contact.rateLimiting.windowStartAt).getTime() + 60000
      );
    }

    await contact.save();

    res.json({
      success: true,
      phoneNumber,
      messageCount: contact.rateLimiting.messageCount,
      isThrottled: contact.rateLimiting.isThrottled,
      throttledUntil: contact.rateLimiting.throttledUntil
    });
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment rate limit',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/contacts/rate-limit/throttled
 * @desc    Get all currently throttled contacts
 * @access  Private
 */
router.get('/rate-limit/throttled', async (req, res) => {
  try {
    const now = new Date();

    const throttledContacts = await Contact.find({
      businessId: req.businessId,
      'rateLimiting.isThrottled': true,
      'rateLimiting.throttledUntil': { $gt: now }
    }).select('phoneNumber name rateLimiting');

    res.json({
      success: true,
      throttledContacts: throttledContacts.map(contact => ({
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        messageCount: contact.rateLimiting.messageCount,
        throttledUntil: contact.rateLimiting.throttledUntil,
        windowResetIn: Math.ceil(
          (new Date(contact.rateLimiting.throttledUntil) - now) / 1000
        )
      })),
      count: throttledContacts.length
    });
  } catch (error) {
    console.error('Error getting throttled contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get throttled contacts',
      error: error.message
    });
  }
});

module.exports = router;
