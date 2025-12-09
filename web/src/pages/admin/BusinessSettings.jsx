import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Navbar from '../../components/Navbar';
import * as businessService from '../../services/business/businessService';
import { MdBusiness, MdPeople, MdKey, MdSchedule, MdSave, MdPersonAdd, MdRefresh } from 'react-icons/md';
import './BusinessSettings.css';

const BusinessSettings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Details tab
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  
  // Team tab
  const [team, setTeam] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  
  // Credentials tab
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  
  // Business hours
  const [businessHours, setBusinessHours] = useState({});
  
  useEffect(() => {
    fetchBusinessSettings();
  }, []);
  
  const fetchBusinessSettings = async () => {
    try {
      const response = await businessService.getBusinessById('current');
      const data = response.data || response; // Handle wrapped response
      setName(data.name || '');
      setDisplayName(data.displayName || '');
      setDescription(data.description || '');
      setWebsite(data.website || '');
      setTeam(data.team || []);
      setBusinessHours(data.businessHours || {});
    } catch (error) {
      console.error('Failed to fetch business settings:', error);
      toast.error('Failed to load business settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await businessService.updateBusiness('current', {
        name: name.trim(),
        displayName: displayName.trim() || undefined,
        description: description.trim() || undefined,
        website: website.trim() || undefined
      });
      toast.success('\u2705 Business details updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update business details');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdateCredentials = async () => {
    if (!accessToken.trim() && !appSecret.trim() && !verifyToken.trim()) {
      toast.error('Please enter at least one credential to update');
      return;
    }
    
    setSaving(true);
    try {
      await businessService.updateCredentials('current', {
        accessToken: accessToken.trim() || undefined,
        appSecret: appSecret.trim() || undefined,
        verifyToken: verifyToken.trim() || undefined
      });
      toast.success('\ud83d\udd10 Credentials updated successfully');
      setAccessToken('');
      setAppSecret('');
      setVerifyToken('');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update credentials');
    } finally {
      setSaving(false);
    }
  };
  
  const handleInviteTeamMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    try {
      await businessService.addTeamMember('current', {
        email: newMemberEmail.trim(),
        role: newMemberRole
      });
      toast.success('\ud83c\udf89 Team member invited successfully');
      setNewMemberEmail('');
      setNewMemberRole('member');
      fetchBusinessSettings();
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to invite team member');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="business-settings">
          <LoadingSkeleton type="card" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="business-settings">
        <div className="business-settings-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <h1><MdBusiness style={{ verticalAlign: 'middle' }} /> Business Settings</h1>
            <button
              onClick={fetchBusinessSettings}
              className="icon-button"
              title="Refresh"
              style={{ marginLeft: 'auto' }}
            >
              <MdRefresh /> Refresh
            </button>
          </div>
          <p>Manage your business details, team, and credentials</p>
        </div>

        <div className="business-settings-tabs">
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <MdBusiness /> Details
          </button>
          <button
            className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <MdPeople /> Team
          </button>
          <button
            className={`tab-button ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
          >
            <MdKey /> Credentials
          </button>
          <button
            className={`tab-button ${activeTab === 'hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('hours')}
          >
            <MdSchedule /> Business Hours
          </button>
        </div>

        <div className="business-settings-content">
          {activeTab === 'details' && (
            <div className="settings-section">
              <h2>Business Details</h2>
              <div className="form-group">
                <label>Business Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your registered business name (e.g., 'Acme Corporation')"
                />
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Name shown to customers on WhatsApp"
                />
              </div>
              <div className="form-group">
                <label>Business Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your business and services"
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <button
                className="save-button"
                onClick={handleSaveDetails}
                disabled={saving}
              >
                {saving ? 'Saving...' : <><MdSave /> Save Details</>}
              </button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="settings-section">
              <h2>Team Members</h2>
              <div className="team-invite-form">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Email address"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
                <button onClick={handleInviteTeamMember}><MdPersonAdd /> Invite</button>
              </div>
              <div className="team-list">
                {team.length === 0 ? (
                  <p className="empty-state">No team members yet</p>
                ) : (
                  team.map((member, index) => (
                    <div key={index} className="team-member-card">
                      <div className="member-info">
                        <span className="member-avatar">👤</span>
                        <div>
                          <div className="member-name">{member.user?.name || member.email}</div>
                          <div className="member-email">{member.email}</div>
                        </div>
                      </div>
                      <div className="member-role">
                        <span className="role-badge">{member.role}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="settings-section">
              <h2>WhatsApp API Credentials</h2>
              <div className="credentials-warning">
                Keep your credentials secure. They will be encrypted and stored safely.
              </div>
              <div className="form-group">
                <label>Access Token</label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="WhatsApp Business API Access Token from Meta"
                />
              </div>
              <div className="form-group">
                <label>App Secret</label>
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="App Secret from Meta Developer Console"
                />
              </div>
              <div className="form-group">
                <label>Verify Token</label>
                <input
                  type="password"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Webhook Verification Token for secure callbacks"
                />
              </div>
              <button
                className="save-button"
                onClick={handleUpdateCredentials}
                disabled={saving}
              >
                {saving ? 'Updating...' : <><MdKey /> Update Credentials</>}
              </button>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="settings-section">
              <h2>Business Hours</h2>
              <p className="info-text">Configure when your business is available for customer support</p>
              <button
                className="configure-button"
                onClick={() => navigate('/business-hours-editor')}
              >
                <MdSchedule /> Configure Business Hours
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BusinessSettings;



