import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { API_BASE_URL } from '../../config/api';
import './StatusComposer.css';

const StatusComposer = () => {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [newStatus, setNewStatus] = useState({
    text: '',
    mediaUrl: '',
    link: '',
    backgroundColor: '#667eea'
  });

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostStatus = async () => {
    if (!newStatus.text.trim()) {
      alert('Please enter status text');
      return;
    }

    setComposing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStatus)
      });

      if (response.ok) {
        alert('Status posted successfully!');
        setNewStatus({ text: '', mediaUrl: '', link: '', backgroundColor: '#667eea' });
        fetchStatuses();
      }
    } catch (error) {
      alert('Failed to post status');
    } finally {
      setComposing(false);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (!confirm('Delete this status?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/status/${statusId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchStatuses();
      }
    } catch (error) {
      console.error('Failed to delete status:', error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="status-composer-container">
        <div className="status-header">
          <h1>WhatsApp Status</h1>
          <p>Create and manage your WhatsApp Business status updates</p>
        </div>

        <div className="composer-card">
          <h2>✍️ Create New Status</h2>
          <div className="composer-form">
            <div className="form-group">
              <label>Status Text *</label>
              <textarea
                value={newStatus.text}
                onChange={(e) => setNewStatus({ ...newStatus, text: e.target.value })}
                placeholder="What's on your mind?"
                rows="4"
                maxLength="700"
              />
              <div className="char-count">{newStatus.text.length}/700</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Media URL (Optional)</label>
                <input
                  type="url"
                  value={newStatus.mediaUrl}
                  onChange={(e) => setNewStatus({ ...newStatus, mediaUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group">
                <label>Link (Optional)</label>
                <input
                  type="url"
                  value={newStatus.link}
                  onChange={(e) => setNewStatus({ ...newStatus, link: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Background Color</label>
              <div className="color-picker">
                {['#667eea', '#764ba2', '#F44336', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0'].map(color => (
                  <div
                    key={color}
                    className={`color-option ${newStatus.backgroundColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStatus({ ...newStatus, backgroundColor: color })}
                  />
                ))}
              </div>
            </div>

            <button
              className="post-button"
              onClick={handlePostStatus}
              disabled={composing}
            >
              {composing ? 'Posting...' : '📤 Post Status'}
            </button>
          </div>
        </div>

        <div className="statuses-list">
          <h2>📋 Your Statuses</h2>
          {loading ? (
            <div className="loading-state">Loading statuses...</div>
          ) : statuses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>No Statuses Yet</h3>
              <p>Create your first status update above</p>
            </div>
          ) : (
            <div className="statuses-grid">
              {statuses.map((status) => (
                <div
                  key={status._id}
                  className="status-card"
                  style={{ backgroundColor: status.backgroundColor }}
                >
                  {status.mediaUrl && (
                    <div className="status-media">
                      <img src={status.mediaUrl} alt="Status media" />
                    </div>
                  )}
                  <div className="status-content">
                    <p className="status-text">{status.text}</p>
                    {status.link && (
                      <a href={status.link} target="_blank" rel="noopener noreferrer" className="status-link">
                        🔗 Link
                      </a>
                    )}
                  </div>
                  <div className="status-footer">
                    <span className="status-time">
                      {new Date(status.createdAt).toLocaleString()}
                    </span>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteStatus(status._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StatusComposer;
