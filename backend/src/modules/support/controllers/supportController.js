const { SupportTicket } = require('../../../core/database/models');
const logger = require('../../../common/helpers/logger');
const { sendError } = require('../../../common/helpers/errorCodes');

/**
 * Create a new support ticket
 * @route POST /api/support/tickets
 * @access Public (no auth required for contact form) / Private (for help requests)
 */
exports.createTicket = async (req, res) => {
  try {
    const { name, email, company, mobile, message, type = 'contact' } = req.body;

    // Validation
    if (!name || !mobile || !message) {
      return sendError(res, 'VALIDATION_ERROR', 'Name, mobile number, and message are required');
    }

    // Mobile number validation with country code
    const mobileRegex = /^\+[0-9]{10,15}$/;
    if (!mobileRegex.test(mobile)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid mobile number format. Please include country code (e.g., +919876543210)');
    }

    // Email validation (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendError(res, 'VALIDATION_ERROR', 'Invalid email format');
      }
    }

    // Create ticket data
    const ticketData = {
      name,
      email,
      company,
      mobile,
      message,
      type
    };

    // If user is authenticated, attach user and business info
    if (req.user) {
      ticketData.userId = req.user._id;
      if (req.user.businessId) {
        ticketData.businessId = req.user.businessId;
      }
    }

    // Create ticket
    const ticket = await SupportTicket.create(ticketData);

    logger.info('Support ticket created', {
      ticketId: ticket._id,
      type: ticket.type,
      email: ticket.email,
      userId: ticket.userId || 'anonymous'
    });

    res.status(201).json({
      success: true,
      message: type === 'help' ? 'Support request submitted successfully' : 'Message sent successfully',
      data: {
        ticketId: ticket._id,
        status: ticket.status
      }
    });
  } catch (error) {
    logger.error('Error creating support ticket', {
      error: error.message,
      stack: error.stack
    });
    return sendError(res, 'SERVER_ERROR', 'Failed to submit request');
  }
};

/**
 * Get all support tickets (admin only)
 * @route GET /api/support/tickets
 * @access Private (admin)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const { status, type, priority, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name email')
      .populate('businessId', 'name')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching support tickets', {
      error: error.message,
      stack: error.stack
    });
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch tickets');
  }
};

/**
 * Get user's own tickets
 * @route GET /api/support/tickets/my-tickets
 * @access Private
 */
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-notes');

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    logger.error('Error fetching user tickets', {
      error: error.message,
      userId: req.user._id
    });
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch tickets');
  }
};

/**
 * Update ticket status
 * @route PATCH /api/support/tickets/:id/status
 * @access Private (admin)
 */
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid status');
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return sendError(res, 'NOT_FOUND', 'Ticket not found');
    }

    ticket.status = status;
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = req.user._id;
    }

    await ticket.save();

    logger.info('Ticket status updated', {
      ticketId: id,
      status,
      updatedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Ticket status updated',
      data: ticket
    });
  } catch (error) {
    logger.error('Error updating ticket status', {
      error: error.message,
      ticketId: req.params.id
    });
    return sendError(res, 'SERVER_ERROR', 'Failed to update ticket');
  }
};

/**
 * Add note to ticket
 * @route POST /api/support/tickets/:id/notes
 * @access Private (admin)
 */
exports.addTicketNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) {
      return sendError(res, 'VALIDATION_ERROR', 'Note text is required');
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return sendError(res, 'NOT_FOUND', 'Ticket not found');
    }

    await ticket.addNote(req.user._id, note);

    logger.info('Note added to ticket', {
      ticketId: id,
      addedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Note added successfully',
      data: ticket
    });
  } catch (error) {
    logger.error('Error adding ticket note', {
      error: error.message,
      ticketId: req.params.id
    });
    return sendError(res, 'SERVER_ERROR', 'Failed to add note');
  }
};
