import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { API_BASE_URL } from '../../config/api';
import './OptInManager.css';

const OptInManager = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.businessId) {
      fetchConsents();
      fetchStats();
    }
  }, [filter, user?.businessId]);

  const fetchConsents = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/business/opt-in`;
      if (filter !== 'all') url += `?status=${filter}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setConsents(data.consents || []);
      }
    } catch (error) {
      console.error('Failed to fetch consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/opt-in/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/opt-in/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opt-in-consents-${new Date().toISOString()}.csv`;
        a.click();
      }
    } catch (error) {
      alert('Failed to export consents');
    }
  };

  const handleRevokeConsent = async (consentId) => {
    if (!confirm('Revoke this consent?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/opt-in/${consentId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchConsents();
        fetchStats();
      }
    } catch (error) {
      alert('Failed to revoke consent');
    }
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to manage opt-in consents."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="optin-manager-container">
          <div className="loading">Loading opt-in consents...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="optin-manager-container">
        <div className="optin-header">
          <h1>✅ Opt-In Consent Manager</h1>
          <p>Manage user consent and compliance records</p>
          <button className="export-button" onClick={handleExport}>
            📥 Export Consents
          </button>
        </div>

        {stats && (
          <div className="optin-stats">
            <div className="stat-card">
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-label">Total Consents</div>
            </div>
            <div className="stat-card active">
              <div className="stat-value">{stats.active || 0}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card revoked">
              <div className="stat-value">{stats.revoked || 0}</div>
              <div className="stat-label">Revoked</div>
            </div>
            <div className="stat-card pending">
              <div className="stat-value">{stats.pending || 0}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        )}

        <div className="optin-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${filter === 'revoked' ? 'active' : ''}`}
            onClick={() => setFilter('revoked')}
          >
            Revoked
          </button>
        </div>

        <div className="consents-list">
          {consents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Consent Records</h3>
              <p>No opt-in consent records found</p>
            </div>
          ) : (
            consents.map((consent) => (
              <div key={consent._id} className="consent-card">
                <div className="consent-header">
                  <div className="consent-user">
                    <div className="user-icon">👤</div>
                    <div className="user-info">
                      <div className="user-phone">{consent.phoneNumber}</div>
                      <div className="user-name">{consent.contactName || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className={`consent-status ${consent.status.toLowerCase()}`}>
                    {consent.status}
                  </div>
                </div>
                <div className="consent-details">
                  <div className="detail-item">
                    <span className="detail-label">Source:</span>
                    <span className="detail-value">{consent.source || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Method:</span>
                    <span className="detail-value">{consent.method || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Granted:</span>
                    <span className="detail-value">
                      {new Date(consent.grantedAt).toLocaleString()}
                    </span>
                  </div>
                  {consent.revokedAt && (
                    <div className="detail-item">
                      <span className="detail-label">Revoked:</span>
                      <span className="detail-value">
                        {new Date(consent.revokedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                {consent.status === 'ACTIVE' && (
                  <button
                    className="revoke-button"
                    onClick={() => handleRevokeConsent(consent._id)}
                  >
                    🚫 Revoke Consent
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default OptInManager;

