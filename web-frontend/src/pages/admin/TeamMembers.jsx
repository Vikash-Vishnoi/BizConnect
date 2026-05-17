/**
 * Team Members Management Page
 * 
 * @component TeamMembers
 * @description Admin page for managing team members and invitations with RBAC support.
 * Allows admins to invite new members, assign roles, manage existing members, and track pending invitations.
 * 
 * @features
 * - Team member listing with avatar, name, email, and role
 * - Role management dropdown for updating member access levels
 * - Member removal with confirmation
 * - Pending invitations tracking with status (pending/expired)
 * - Invitation management (send, resend, cancel)
 * - Tab navigation between members and invitations
 * - Modal form for inviting new members
 * - Real-time role descriptions based on selection
 * - Empty states for no members/invitations
 * - Super admin protection (cannot change role or remove)
 * 
 * @state
 * - activeTab: 'members' | 'invitations'
 * - members: Array of team member objects
 * - invitations: Array of pending invitation objects
 * - loading: Boolean loading state
 * - showInviteModal: Boolean modal visibility
 * - inviteData: Object with email and role for new invitation
 * - submitting: Boolean form submission state
 * 
 * @api
 * - teamService.getTeamMembers(): Fetch all team members
 * - teamService.getPendingInvitations(): Fetch pending invitations
 * - teamService.inviteMember(data): Send new invitation
 * - teamService.updateMemberRole(userId, role): Update member role
 * - teamService.removeMember(userId): Remove team member
 * - teamService.resendInvitation(invitationId): Resend invitation email
 * - teamService.cancelInvitation(invitationId): Cancel pending invitation
 * 
 * @routes /admin/team-members (requires BUSINESS_ADMIN role)
 * 
 * @example
 * // Usage in router
 * <Route path="/admin/team-members" element={<TeamMembers />} />
 */

import React, { useState, useEffect } from 'react';
import { MdAccessTime, MdEmail, MdGroupAdd, MdPeopleAlt, MdRefresh, MdShield, MdSupervisorAccount, MdDelete, MdSend, MdClose, MdMailOutline, MdPerson } from 'react-icons/md';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import ConfirmationModal from '../../components/ConfirmationModal';
import teamService from '../../services/business/teamService';
import { useToast } from '../../components/Toast';
import { ROLES } from '../../utils/roles';
import '../../components/Stats.css';
import './TeamMembers.css';

/**
 * @constant {Object} TAB_OPTIONS - Available tab options for navigation
 */
const TAB_OPTIONS = {
  MEMBERS: 'members',
  INVITATIONS: 'invitations'
};

/**
 * @constant {Object} ROLE_DESCRIPTIONS - Descriptions for each role type
 */
const ROLE_DESCRIPTIONS = {
  [ROLES.BUSINESS_ADMIN]: 'Full access to business settings and team management.',
  [ROLES.MANAGER]: 'Can manage campaigns, templates, and contacts.',
  [ROLES.USER]: 'Can view and send messages, but limited management access.'
};

/**
 * @constant {Object} DEFAULT_INVITE_DATA - Default values for invitation form
 */
const DEFAULT_INVITE_DATA = {
  name: '',
  email: '',
  role: ROLES.USER
};

const TeamMembers = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_OPTIONS.MEMBERS);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState(DEFAULT_INVITE_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { success, error: showError } = useToast();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, name: '' });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  /**
   * Display toast notification
   * @param {string} message - Message to display
   * @param {'success'|'error'} type - Toast type
   */
  const showToast = (message, type) => {
    if (type === 'success') success(message);
    else showError(message);
  };

  useEffect(() => {
    if (user?.businessId) {
      fetchData();
    }
  }, [user?.businessId]);

  /**
   * Fetch team members or pending invitations based on active tab
   */
  const fetchData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      if (!user?.businessId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [membersResponse, invitationsResponse] = await Promise.all([
        teamService.getTeamMembers(user.businessId),
        teamService.getPendingInvitations(user.businessId)
      ]);

      setMembers(membersResponse.members || []);
      setInvitations(invitationsResponse.invitations || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      showToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle invitation form submission
   * @param {Event} e - Form submit event
   */
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await teamService.inviteMember(user.businessId, inviteData);
      const invitation = response.invitation;
      const link = `${window.location.origin}/register?email=${encodeURIComponent(invitation.email)}`;
      
      setInviteLink(link);
      setShowInviteModal(false);
      setShowLinkModal(true);
      
      showToast('Invitation sent successfully', 'success');
      setInviteData(DEFAULT_INVITE_DATA);
      setActiveTab(TAB_OPTIONS.INVITATIONS);
      fetchData();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      showToast(error.response?.data?.message || 'Failed to send invitation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Update member role
   * @param {string} userId - User ID
   * @param {string} newRole - New role to assign
   */
  const handleRoleChange = async (userId, newRole) => {
    try {
      await teamService.updateMemberRole(user.businessId, userId, newRole);
      showToast('Role updated successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast('Failed to update role', 'error');
    }
  };

  /**
   * Remove team member with confirmation
   * @param {string} userId - User ID to remove
   */
  const handleRemoveMember = async (userId) => {
    const member = members.find(m => m._id === userId);
    setConfirmModal({
      isOpen: true,
      type: 'removeMember',
      id: userId,
      name: member?.name || 'this member'
    });
  };

  /**
   * Confirm remove member action
   */
  const confirmRemoveMember = async () => {
    try {
      await teamService.removeMember(user.businessId, confirmModal.id);
      showToast('Member removed successfully', 'success');
      setConfirmModal({ isOpen: false, type: null, id: null, name: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      showToast('Failed to remove member', 'error');
      setConfirmModal({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  /**
   * Resend invitation email
   * @param {string} invitationId - Invitation ID
   */
  const handleResendInvitation = async (invitationId) => {
    try {
      await teamService.resendInvitation(user.businessId, invitationId);
      showToast('Invitation resent successfully', 'success');
      fetchData();
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      showToast('Failed to resend invitation', 'error');
    }
  };

  /**
   * Cancel pending invitation with confirmation
   * @param {string} invitationId - Invitation ID to cancel
   */
  const handleCancelInvitation = async (invitationId) => {
    const invitation = invitations.find(inv => inv._id === invitationId);
    setConfirmModal({
      isOpen: true,
      type: 'cancelInvitation',
      id: invitationId,
      name: invitation?.email || 'this invitation'
    });
  };

  /**
   * Confirm cancel invitation action
   */
  const confirmCancelInvitation = async () => {
    try {
      await teamService.cancelInvitation(user.businessId, confirmModal.id);
      showToast('Invitation cancelled successfully', 'success');
      setConfirmModal({ isOpen: false, type: null, id: null, name: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      showToast('Failed to cancel invitation', 'error');
      setConfirmModal({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  /**
   * Generate initials from name (max 2 characters)
   * @param {string} name - Full name
   * @returns {string} Uppercase initials
   */
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Format role string for display (replace underscores, capitalize)
   * @param {string} role - Role string (e.g., 'business_admin')
   * @returns {string} Formatted role (e.g., 'Business Admin')
   */
  const formatRole = (role) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const memberMetrics = {
    total: members.length,
    admins: members.filter((m) => m.role === ROLES.BUSINESS_ADMIN || m.role === ROLES.SUPER_ADMIN).length,
    managers: members.filter((m) => m.role === ROLES.MANAGER).length,
    users: members.filter((m) => m.role === ROLES.USER).length,
    pendingInvites: invitations.length,
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
    <div className="team-page page-container">
      <Navbar />

      <div className="page-content team-page__content">
        {/* Header */}
        <div className="team-header">
          <div className="team-header-text" style={{ textAlign: 'center', width: '100%' }}>
            <h1 className="team-title">Team Management</h1>
            <p className="team-subtitle">Invite teammates, tune roles, and keep access in sync with your workspace • {memberMetrics.total} members</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary"><MdPeopleAlt /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Team Size</p>
              <div className="stat-card__value">{memberMetrics.total}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success"><MdShield /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Admins</p>
              <div className="stat-card__value">{memberMetrics.admins}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--info"><MdSupervisorAccount /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Managers</p>
              <div className="stat-card__value">{memberMetrics.managers}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--secondary"><MdPerson /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Normal Users</p>
              <div className="stat-card__value">{memberMetrics.users}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning"><MdEmail /></div>
            <div className="stat-card__content">
              <p className="stat-card__label">Pending Invites</p>
              <div className="stat-card__value">{memberMetrics.pendingInvites}</div>
            </div>
          </div>
        </div>

        <Card padding="lg" className="team-panel">
          <div className="team-panel__header">
            <div className="team-tabs" role="tablist" aria-label="Team management sections">
              <button
                className={`tab-btn ${activeTab === TAB_OPTIONS.MEMBERS ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB_OPTIONS.MEMBERS)}
                role="tab"
                aria-selected={activeTab === TAB_OPTIONS.MEMBERS}
                aria-label="Team members tab"
              >
                Team members ({memberMetrics.total})
              </button>
              <button
                className={`tab-btn ${activeTab === TAB_OPTIONS.INVITATIONS ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB_OPTIONS.INVITATIONS)}
                role="tab"
                aria-selected={activeTab === TAB_OPTIONS.INVITATIONS}
                aria-label="Pending invitations tab"
              >
                Pending invitations ({memberMetrics.pendingInvites})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading team...</p>
            </div>
          ) : (
            <div
              className="members-list"
              role="tabpanel"
              aria-label={activeTab === TAB_OPTIONS.MEMBERS ? 'Team members list' : 'Pending invitations list'}
            >
              {activeTab === TAB_OPTIONS.MEMBERS ? (
                members.length === 0 ? (
                  <div className="empty-state">
                    <p>No team members yet.</p>
                    <Button variant="primary" size="medium" onClick={() => setShowInviteModal(true)}>
                      Invite your first member
                    </Button>
                  </div>
                ) : (
                  members.map((member) => (
                    <div key={member._id} className="member-row">
                      <div className="member-avatar">{getInitials(member.name)}</div>

                      <div className="member-info">
                        <div className="member-name">{member.name}</div>
                        <div className="member-email">{member.email}</div>
                      </div>

                      <div className="member-role">
                        {member.role === ROLES.BUSINESS_ADMIN ? (
                          <span className={`role-badge ${member.role}`} style={{ padding: '10px 12px', display: 'inline-block', minWidth: '170px', textAlign: 'center' }}>
                            Business Admin
                          </span>
                        ) : (
                          <>
                            <label className="sr-only" htmlFor={`role-${member._id}`}>
                              Role selector for {member.name}
                            </label>
                            <select
                              id={`role-${member._id}`}
                              value={member.role}
                              onChange={(e) => handleRoleChange(member._id, e.target.value)}
                              className={`role-badge ${member.role}`}
                              disabled={member.role === ROLES.SUPER_ADMIN}
                              aria-label={`Change role for ${member.name}`}
                            >
                              <option value={ROLES.MANAGER} hidden={member.role === ROLES.MANAGER}>Manager</option>
                              <option value={ROLES.USER} hidden={member.role === ROLES.USER}>Normal User</option>
                            </select>
                          </>
                        )}
                      </div>

                      <div className="member-actions">
                        {member.role !== ROLES.SUPER_ADMIN && !member.isOwner && (
                          <button
                            className="action-btn delete"
                            onClick={() => handleRemoveMember(member._id)}
                            title="Remove Member"
                            aria-label={`Remove ${member.name} from team`}
                          >
                            Remove
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
                    <Button variant="primary" size="medium" onClick={() => setShowInviteModal(true)}>
                      Send an invite
                    </Button>
                  </div>
                ) : (
                  invitations.map((invite) => {
                    const isExpired = new Date(invite.expiresAt) < new Date();
                    console.log('Rendering invitation:', invite);
                    return (
                      <div key={invite._id} className="member-row">
                        <div className="member-avatar invite-avatar" aria-hidden="true">
                          {invite.name ? getInitials(invite.name) : <MdMailOutline />}
                        </div>

                        <div className="member-info">
                          <div className="member-name">{invite.name || invite.email}</div>
                          <div className="member-email">
                            {invite.name ? `${invite.email} • ` : ''}Role: {formatRole(invite.role)} • Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="member-role">
                          <span className={`status-badge ${isExpired ? 'expired' : 'pending'}`}>
                            {isExpired ? 'Expired' : 'Pending'}
                          </span>
                        </div>

                        <div className="member-actions">
                          <button
                            className="action-btn resend"
                            onClick={() => handleResendInvitation(invite._id)}
                            title="Resend Invitation"
                            aria-label={`Resend invitation to ${invite.email}`}
                          >
                            Resend
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleCancelInvitation(invite._id)}
                            title="Cancel Invitation"
                            aria-label={`Cancel invitation to ${invite.email}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          )}
        </Card>
      </div>

      {showInviteModal && (
        <div
          className="team-members__modal-overlay"
          onClick={() => setShowInviteModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
        >
          <div className="team-members__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="team-members__modal-header">
              <h2 id="invite-modal-title">Invite Team Member</h2>
              <button
                className="team-members__close-btn"
                onClick={() => setShowInviteModal(false)}
                aria-label="Close invite modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleInviteSubmit}>
              <div className="team-members__form-group">
                <label htmlFor="invite-name">Name *</label>
                <input
                  id="invite-name"
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  required
                  placeholder="John Doe"
                  aria-required="true"
                />
              </div>
              <div className="team-members__form-group">
                <label htmlFor="invite-email">Email Address *</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                  placeholder="colleague@company.com"
                  aria-required="true"
                />
              </div>
              <div className="team-members__form-group">
                <label htmlFor="invite-role">Role *</label>
                <select
                  id="invite-role"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  aria-required="true"
                >
                  <option value={ROLES.BUSINESS_ADMIN}>Business Admin</option>
                  <option value={ROLES.MANAGER}>Manager</option>
                  <option value={ROLES.USER}>Normal User</option>
                </select>
                <p className="help-text">
                  {ROLE_DESCRIPTIONS[inviteData.role]}
                </p>
              </div>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="medium"
                  onClick={() => setShowInviteModal(false)}
                  aria-label="Cancel invitation"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  loading={submitting}
                  aria-label={submitting ? 'Sending invitation' : 'Send invitation'}
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button - Always visible */}
      {user?.businessId && (
        <button 
          className="team-fab" 
          onClick={() => setShowInviteModal(true)} 
          title="Invite Member"
          aria-label="Invite new team member"
        >
          <MdGroupAdd />
        </button>
      )}

      {/* Invitation Link Modal */}
      {showLinkModal && (
        <div className="team-members__modal-overlay">
          <div className="team-members__modal-content">
            <div className="team-members__modal-header">
              <h2>Invitation Sent!</h2>
              <button 
                className="team-members__close-btn"
                onClick={() => setShowLinkModal(false)}
                aria-label="Close modal"
              >
                <MdClose />
              </button>
            </div>
            <div className="team-members__form-group">
              <p style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>
                Share this link with the invited member to join the team:
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={inviteLink} 
                  style={{ flex: 1, cursor: 'text' }}
                  onClick={(e) => e.target.select()}
                />
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    showToast('Link copied to clipboard', 'success');
                  }}
                  variant="secondary"
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setShowLinkModal(false)} variant="primary">Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, id: null, name: '' })}
        onConfirm={confirmModal.type === 'removeMember' ? confirmRemoveMember : confirmCancelInvitation}
        title={confirmModal.type === 'removeMember' ? 'Remove Team Member' : 'Cancel Invitation'}
        message={
          confirmModal.type === 'removeMember'
            ? `Are you sure you want to remove ${confirmModal.name} from the team? This action cannot be undone.`
            : `Are you sure you want to cancel the invitation to ${confirmModal.name}? They will not be able to join using this invitation link.`
        }
        confirmText={confirmModal.type === 'removeMember' ? 'Remove Member' : 'Cancel Invitation'}
        cancelText="Go Back"
        variant="danger"
      />
    </div>
  );
};

export default TeamMembers;


