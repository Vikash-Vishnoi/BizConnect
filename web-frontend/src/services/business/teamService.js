/**
 * Team Service
 * 
 * @module services/business/teamService
 * @description Service for managing team members, invitations, and role assignments.
 * Supports team collaboration, member onboarding, and access control.
 * 
 * @features
 * - Team member CRUD operations
 * - Member invitation workflow
 * - Role assignment and updates
 * - Pending invitation management
 * - Invitation resend and cancellation
 * 
 * @api-endpoints (business scoped)
 * Team Members:
 * - GET /business/:businessId/team - List all team members
 * - POST /business/:businessId/team - Add team member
 * - PUT /business/:businessId/team/:userId - Update member role
 * - DELETE /business/:businessId/team/:userId - Remove member
 * 
 * Invitations:
 * - POST /business/:businessId/team/invite - Invite new member
 * - GET /business/:businessId/team/invitations - Get pending invitations
 * - POST /business/:businessId/team/invitations/:id/resend - Resend invitation
 * - DELETE /business/:businessId/team/invitations/:id - Cancel invitation
 * 
 * @example
 * import teamService from './teamService';
 * 
 * // Get team members
 * const members = await teamService.getTeamMembers();
 * 
 * // Invite new member
 * await teamService.inviteMember({ email: 'user@example.com', role: 'agent' });
 */

import api from '../api';

const buildTeamPath = (businessId, suffix = '') => `/business/${businessId}/team${suffix}`;

const normalize = (response) => response?.data?.data ?? response?.data ?? response;

const teamService = {
  /**
   * Get all team members
   * @returns {Promise<Array>} List of team members (id, name, email, role, joinedAt)
   */
  getTeamMembers: async (businessId) => {
    const response = await api.get(buildTeamPath(businessId));
    return normalize(response);
  },

  /**
   * Invite a new team member
   * @param {Object} data - Invitation data (email, role, permissions)
   * @returns {Promise<Object>} Created invitation
   */
  inviteMember: async (businessId, data) => {
    const response = await api.post(buildTeamPath(businessId, '/invite'), data);
    return normalize(response);
  },

  /**
   * Update a member's role
   * @param {string} userId - User ID
   * @param {string} role - New role (super_admin, business_admin, manager, agent, viewer)
   * @returns {Promise<Object>} Updated member
   */
  updateMemberRole: async (businessId, userId, role) => {
    const response = await api.put(buildTeamPath(businessId, `/${userId}`), { userType: role });
    return normalize(response);
  },

  /**
   * Remove a team member
   * @param {string} userId - User ID to remove
   * @returns {Promise<Object>} Removal result
   */
  removeMember: async (businessId, userId) => {
    const response = await api.delete(buildTeamPath(businessId, `/${userId}`));
    return normalize(response);
  },

  /**
   * Get pending invitations
   * @returns {Promise<Array>} List of pending invitations (id, email, role, invitedBy, createdAt)
   */
  getPendingInvitations: async (businessId) => {
    const response = await api.get(buildTeamPath(businessId, '/invitations'));
    return normalize(response);
  },

  /**
   * Resend invitation email
   * @param {string} invitationId - Invitation ID
   * @returns {Promise<Object>} Resend result
   */
  resendInvitation: async (businessId, invitationId) => {
    const response = await api.post(buildTeamPath(businessId, `/invitations/${invitationId}/resend`));
    return normalize(response);
  },

  /**
   * Cancel pending invitation
   * @param {string} invitationId - Invitation ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  cancelInvitation: async (businessId, invitationId) => {
    const response = await api.delete(buildTeamPath(businessId, `/invitations/${invitationId}`));
    return normalize(response);
  }
};

export default teamService;


