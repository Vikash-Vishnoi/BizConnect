import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { API_BASE_URL } from '../../config/api';
import './RateLimitDashboard.css';

const RateLimitDashboard = () => {
  const { user } = useAuth();
  const [rateLimits, setRateLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.businessId) {
      fetchRateLimits();
      const interval = setInterval(fetchRateLimits, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.businessId]);

  const fetchRateLimits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/business/rate-limits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRateLimits(data.limits || data);
      }
    } catch (error) {
      console.error('Failed to fetch rate limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (current, limit) => {
    if (!limit) return 0;
    return Math.min(Math.round((current / limit) * 100), 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return '#F44336';
    if (percentage >= 70) return '#FF9800';
    if (percentage >= 50) return '#FFC107';
    return '#4CAF50';
  };

  const formatTime = (resetTime) => {
    if (!resetTime) return 'N/A';
    const date = new Date(resetTime);
    const now = new Date();
    const diff = date - now;
    
    if (diff <= 0) return 'Resetting...';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to view rate limits."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="rate-limit-dashboard-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading rate limits...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="rate-limit-dashboard-container">
        <div className="rate-limit-dashboard-header">
          <div>
            <h1>⏱️ Rate Limit Dashboard</h1>
            <p>Monitor API rate limits and current usage</p>
          </div>
          <button className="refresh-btn" onClick={fetchRateLimits}>
            🔄 Refresh
          </button>
        </div>

        {!rateLimits ? (
          <div className="empty-state">
            <div className="empty-icon">⏱️</div>
            <h3>No rate limit data available</h3>
            <p>Rate limit information will appear here once you start using the API</p>
          </div>
        ) : (
          <>
            <div className="status-banner">
              <div className="banner-icon">📊</div>
              <div className="banner-content">
                <h3>Overall Status</h3>
                <p>
                  {rateLimits.status === 'healthy' ? (
                    <span className="status-healthy">✅ All systems operating normally</span>
                  ) : rateLimits.status === 'warning' ? (
                    <span className="status-warning">⚠️ Approaching rate limits</span>
                  ) : (
                    <span className="status-critical">🚨 Rate limits exceeded</span>
                  )}
                </p>
              </div>
            </div>

            <div className="limits-grid">
              {/* Messaging Limit */}
              <div className="limit-card">
                <div className="limit-header">
                  <h3>💬 Messaging</h3>
                  <span className="limit-period">Per Hour</span>
                </div>
                <div className="limit-progress">
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.messaging?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.messaging?.limit || 1000}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.messaging?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit) >= 70 ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit)}%
                  </span>
                </div>
              </div>

              {/* Templates Limit */}
              <div className="limit-card">
                <div className="limit-header">
                  <h3>📝 Templates</h3>
                  <span className="limit-period">Per Day</span>
                </div>
                <div className="limit-progress">
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.templates?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.templates?.limit || 100}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.templates?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit) >= 70 ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit)}%
                  </span>
                </div>
              </div>

              {/* API Calls Limit */}
              <div className="limit-card">
                <div className="limit-header">
                  <h3>🔌 API Calls</h3>
                  <span className="limit-period">Per Minute</span>
                </div>
                <div className="limit-progress">
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.apiCalls?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.apiCalls?.limit || 60}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.apiCalls?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit) >= 70 ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit)}%
                  </span>
                </div>
              </div>

              {/* Media Upload Limit */}
              <div className="limit-card">
                <div className="limit-header">
                  <h3>📸 Media Uploads</h3>
                  <span className="limit-period">Per Hour</span>
                </div>
                <div className="limit-progress">
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.mediaUploads?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.mediaUploads?.limit || 100}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.mediaUploads?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit) >= 70 ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>ℹ️ Rate Limit Information</h3>
              <div className="info-cards">
                <div className="info-card">
                  <h4>What are rate limits?</h4>
                  <p>Rate limits control how many API requests you can make in a given time period to ensure fair usage and system stability.</p>
                </div>
                <div className="info-card">
                  <h4>What happens when exceeded?</h4>
                  <p>Requests will be temporarily blocked until the rate limit resets. You'll receive a 429 error response.</p>
                </div>
                <div className="info-card">
                  <h4>How to avoid hitting limits?</h4>
                  <p>Implement exponential backoff, batch requests when possible, and monitor this dashboard regularly.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default RateLimitDashboard;

