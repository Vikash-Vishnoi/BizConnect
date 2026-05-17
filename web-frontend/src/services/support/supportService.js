import api from '../api';

/**
 * Support Service
 * Handles support ticket API calls
 */

/**
 * Create a new support ticket
 * @param {Object} ticketData - Support ticket data
 * @param {string} ticketData.name - User's name
 * @param {string} ticketData.email - User's email
 * @param {string} ticketData.company - Company name
 * @param {string} ticketData.mobile - Mobile number
 * @param {string} ticketData.message - Support message
 * @param {string} ticketData.type - Ticket type ('help' or 'contact')
 * @returns {Promise<Object>} Response with ticket ID
 */
export const createSupportTicket = async (ticketData) => {
  const response = await api.post('/support/tickets', ticketData);
  return response.data;
};

/**
 * Get user's own support tickets
 * @returns {Promise<Object>} List of user's tickets
 */
export const getMyTickets = async () => {
  const response = await api.get('/support/tickets/my-tickets');
  return response.data;
};

/**
 * Get all support tickets (admin only)
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status
 * @param {string} params.type - Filter by type
 * @param {string} params.priority - Filter by priority
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} Paginated list of tickets
 */
export const getAllTickets = async (params) => {
  const response = await api.get('/support/tickets', { params });
  return response.data;
};

/**
 * Update ticket status (admin only)
 * @param {string} ticketId - Ticket ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated ticket
 */
export const updateTicketStatus = async (ticketId, status) => {
  const response = await api.patch(`/support/tickets/${ticketId}/status`, { status });
  return response.data;
};

/**
 * Add note to ticket (admin only)
 * @param {string} ticketId - Ticket ID
 * @param {string} note - Note text
 * @returns {Promise<Object>} Updated ticket
 */
export const addTicketNote = async (ticketId, note) => {
  const response = await api.post(`/support/tickets/${ticketId}/notes`, { note });
  return response.data;
};
