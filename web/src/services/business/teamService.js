import api from '../api';

const teamService = {
  // Get all team members
  getTeamMembers: async () => {
    const response = await api.get('/team/members');
    return response.data;
  },

  // Invite a new member
  inviteMember: async (data) => {
    const response = await api.post('/team/invite', data);
    return response.data;
  },

  // Update a member's role
  updateMemberRole: async (userId, role) => {
    const response = await api.put(`/team/members/${userId}/role`, { role });
    return response.data;
  },

  // Remove a member
  removeMember: async (userId) => {
    const response = await api.delete(`/team/members/${userId}`);
    return response.data;
  },

  // Get pending invitations
  getPendingInvitations: async () => {
    const response = await api.get('/team/invitations');
    return response.data;
  },

  // Resend invitation
  resendInvitation: async (invitationId) => {
    const response = await api.post(`/team/invitations/${invitationId}/resend`);
    return response.data;
  },

  // Cancel invitation
  cancelInvitation: async (invitationId) => {
    const response = await api.delete(`/team/invitations/${invitationId}`);
    return response.data;
  }
};

export default teamService;

