import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import teamService from '../../services/business/teamService';
import { useToast } from '../../components/Toast';
import { ROLES } from '../../utils/roles';
import './TeamMembers.css';

const TeamMembers = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('members'); // members, invitations
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'normal_user' });
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const showToast = (message, type) => {
    if (type === 'success') success(message);
    else showError(message);
  };

  useEffect(() => {
    if (user?.businessId) {
      fetchData();
    }
  }, [activeTab, user?.businessId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'members') {
        const data = await teamService.getTeamMembers();
        setMembers(data.members || []);
      } else {
        const data = await teamService.getPendingInvitations();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      showToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await teamService.inviteMember(inviteData);
      showToast('Invitation sent successfully', 'success');
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'normal_user' });
      if (activeTab === 'invitations') fetchData();
      else setActiveTab('invitations');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      showToast(error.response?.data?.message || 'Failed to send invitation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await teamService.updateMemberRole(userId, newRole);
      showToast('Role updated successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast('Failed to update role', 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await teamService.removeMember(userId);
      showToast('Member removed successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      showToast('Failed to remove member', 'error');
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      await teamService.resendInvitation(invitationId);
      showToast('Invitation resent successfully', 'success');
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      showToast('Failed to resend invitation', 'error');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    try {
      await teamService.cancelInvitation(invitationId);
      showToast('Invitation cancelled successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      showToast('Failed to cancel invitation', 'error');
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (role) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to manage team members."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="team-container">
        <div className="team-header">
          <div>
            <h1>👥 Team Management</h1>
            <p>Manage your team members and their access levels</p>
          </div>
          <button className="invite-btn" onClick={() => setShowInviteModal(true)}>
            <span>+</span> Invite Member
          </button>
        </div>

        <div className="team-tabs">
          <button 
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Team Members
          </button>
          <button 
            className={`tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            Pending Invitations
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <div className="members-list">
            {activeTab === 'members' ? (
              members.length === 0 ? (
                <div className="empty-state">
                  <p>No team members found.</p>
                </div>
              ) : (
                members.map((member) => (
                  <div key={member._id} className="member-row">
                    <div className="member-avatar">
                      {getInitials(member.name)}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email}</div>
                    </div>
                    <div className="member-role">
                      <select 
                        value={member.role}
                        onChange={(e) => handleRoleChange(member._id, e.target.value)}
                        className={`role-badge ${member.role}`}
                        disabled={member.role === ROLES.SUPER_ADMIN} // Prevent changing super admin role easily
                      >
                        <option value={ROLES.BUSINESS_ADMIN}>Business Admin</option>
                        <option value={ROLES.MANAGER}>Manager</option>
                        <option value={ROLES.USER}>Normal User</option>
                      </select>
                    </div>
                    <div className="member-actions">
                      {member.role !== ROLES.SUPER_ADMIN && (
                        <button 
                          className="action-btn delete"
                          onClick={() => handleRemoveMember(member._id)}
                          title="Remove Member"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              invitations.length === 0 ? (
                <div className="empty-state">
                  <p>No pending invitations.</p>
                </div>
              ) : (
                invitations.map((invite) => (
                  <div key={invite._id} className="member-row">
                    <div className="member-avatar" style={{ backgroundColor: '#fff3e0', color: '#f57c00' }}>
                      ✉️
                    </div>
                    <div className="member-info">
                      <div className="member-name">{invite.email}</div>
                      <div className="member-email">
                        Role: {formatRole(invite.role)} • Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="member-role">
                      <span className={`status-badge ${new Date(invite.expiresAt) < new Date() ? 'expired' : 'pending'}`}>
                        {new Date(invite.expiresAt) < new Date() ? 'Expired' : 'Pending'}
                      </span>
                    </div>
                    <div className="member-actions">
                      <button 
                        className="action-btn"
                        onClick={() => handleResendInvitation(invite._id)}
                        title="Resend Invitation"
                      >
                        🔄
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleCancelInvitation(invite._id)}
                        title="Cancel Invitation"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}

        {showInviteModal && (
          <div className="team-members__modal-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="team-members__modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="team-members__modal-header">
                <h2>Invite Team Member</h2>
                <button className="team-members__close-btn" onClick={() => setShowInviteModal(false)}>×</button>
              </div>
              <form onSubmit={handleInviteSubmit}>
                <div className="team-members__form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    required
                    placeholder="colleague@company.com"
                  />
                </div>
                <div className="team-members__form-group">
                  <label>Role *</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  >
                    <option value={ROLES.BUSINESS_ADMIN}>Business Admin</option>
                    <option value={ROLES.MANAGER}>Manager</option>
                    <option value={ROLES.USER}>Normal User</option>
                  </select>
                  <p className="help-text" style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                    {inviteData.role === ROLES.BUSINESS_ADMIN && 'Full access to business settings and team management.'}
                    {inviteData.role === ROLES.MANAGER && 'Can manage campaigns, templates, and contacts.'}
                    {inviteData.role === ROLES.USER && 'Can view and send messages, but limited management access.'}
                  </p>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TeamMembers;


