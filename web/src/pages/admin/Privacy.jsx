import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { API_BASE_URL } from '../../config/api';
import './Privacy.css';

const Privacy = () => {
  const [loading, setLoading] = useState(true);
  const [gdprSettings, setGdprSettings] = useState({
    dataRetentionDays: 0,
    allowDataExport: false,
    allowDataDeletion: false,
    consentRequired: false,
    anonymizeData: false
  });
  const [exportRequests, setExportRequests] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGdprSettings();
    fetchRequests();
  }, []);

  const fetchGdprSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/analytics/gdpr/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGdprSettings(data.settings || gdprSettings);
      }
    } catch (error) {
      console.error('Failed to fetch GDPR settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const [exportResp, deleteResp] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/gdpr/export-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/gdpr/deletion-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (exportResp.ok) {
        const data = await exportResp.json();
        setExportRequests(data.requests || []);
      }
      if (deleteResp.ok) {
        const data = await deleteResp.json();
        setDeletionRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/analytics/gdpr/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gdprSettings)
      });

      if (response.ok) {
        alert('GDPR settings updated successfully');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportRequest = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/analytics/gdpr/export-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`Request ${action}d successfully`);
        fetchRequests();
      }
    } catch (error) {
      alert('Failed to process request');
    }
  };

  const handleDeletionRequest = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/analytics/gdpr/deletion-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`Request ${action}d successfully`);
        fetchRequests();
      }
    } catch (error) {
      alert('Failed to process request');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="privacy-container">
          <div className="loading">Loading privacy settings...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="privacy-container">
        <div className="privacy-header">
          <h1>🔒 Privacy & GDPR Compliance</h1>
          <p>Manage data privacy settings and user requests</p>
        </div>

        <div className="settings-card">
          <h2>⚙️ GDPR Settings</h2>
          <div className="settings-grid">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={gdprSettings.consentRequired}
                  onChange={(e) => setGdprSettings({...gdprSettings, consentRequired: e.target.checked})}
                />
                <span>Require Explicit Consent</span>
              </label>
              <p className="setting-description">Users must explicitly consent to data processing</p>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={gdprSettings.allowDataExport}
                  onChange={(e) => setGdprSettings({...gdprSettings, allowDataExport: e.target.checked})}
                />
                <span>Allow Data Export</span>
              </label>
              <p className="setting-description">Users can request their data export</p>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={gdprSettings.allowDataDeletion}
                  onChange={(e) => setGdprSettings({...gdprSettings, allowDataDeletion: e.target.checked})}
                />
                <span>Allow Data Deletion</span>
              </label>
              <p className="setting-description">Users can request data deletion</p>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={gdprSettings.anonymizeData}
                  onChange={(e) => setGdprSettings({...gdprSettings, anonymizeData: e.target.checked})}
                />
                <span>Anonymize Old Data</span>
              </label>
              <p className="setting-description">Automatically anonymize data after retention period</p>
            </div>

            <div className="setting-item">
              <label>
                <span>Data Retention Period (Days)</span>
                <input
                  type="number"
                  value={gdprSettings.dataRetentionDays}
                  onChange={(e) => setGdprSettings({...gdprSettings, dataRetentionDays: parseInt(e.target.value) || 0})}
                  min="0"
                  className="number-input"
                />
              </label>
              <p className="setting-description">How long to retain user data (0 = indefinite)</p>
            </div>
          </div>

          <button className="save-button" onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>

        <div className="requests-section">
          <div className="requests-card">
            <h2>📤 Export Requests</h2>
            {exportRequests.length === 0 ? (
              <p className="empty-state">No pending export requests</p>
            ) : (
              <div className="requests-list">
                {exportRequests.map((req) => (
                  <div key={req._id} className="request-item">
                    <div className="request-info">
                      <div className="request-user">{req.userPhone || req.userEmail}</div>
                      <div className="request-date">{new Date(req.createdAt).toLocaleString()}</div>
                      <div className={`request-status ${req.status.toLowerCase()}`}>{req.status}</div>
                    </div>
                    {req.status === 'PENDING' && (
                      <div className="request-actions">
                        <button onClick={() => handleExportRequest(req._id, 'approve')} className="approve-btn">
                          ✓ Approve
                        </button>
                        <button onClick={() => handleExportRequest(req._id, 'reject')} className="reject-btn">
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="requests-card">
            <h2>🗑️ Deletion Requests</h2>
            {deletionRequests.length === 0 ? (
              <p className="empty-state">No pending deletion requests</p>
            ) : (
              <div className="requests-list">
                {deletionRequests.map((req) => (
                  <div key={req._id} className="request-item">
                    <div className="request-info">
                      <div className="request-user">{req.userPhone || req.userEmail}</div>
                      <div className="request-date">{new Date(req.createdAt).toLocaleString()}</div>
                      <div className={`request-status ${req.status.toLowerCase()}`}>{req.status}</div>
                    </div>
                    {req.status === 'PENDING' && (
                      <div className="request-actions">
                        <button onClick={() => handleDeletionRequest(req._id, 'approve')} className="approve-btn">
                          ✓ Approve
                        </button>
                        <button onClick={() => handleDeletionRequest(req._id, 'reject')} className="reject-btn">
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Privacy;

