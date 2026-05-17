/**
 * Rate Limit Dashboard Page
 * 
 * @component RateLimitDashboard
 * @description Admin page for monitoring API rate limits and current usage in real-time.
 * Displays messaging, template, API call, and media upload limits with visual progress bars.
 * 
 * @features
 * - Real-time rate limit monitoring with auto-refresh (30s intervals)
 * - Visual progress bars with color-coded status (green/yellow/orange/red)
 * - Overall system health status banner
 * - Time until rate limit reset display
 * - Usage percentage indicators
 * - Four limit categories: Messaging, Templates, API Calls, Media Uploads
 * - Information cards with rate limit explanations
 * - Manual refresh button
 * - Empty states for no data
 * - Business setup requirement check
 * 
 * @state
 * - rateLimits: Object with limit data for all categories
 * - loading: Boolean loading state
 * 
 * @api
 * - GET /business/rate-limits: Fetch current rate limit status
 * 
 * @routes /admin/rate-limits (requires BUSINESS_ADMIN role)
 * 
 * @example
 * // Usage in router
 * <Route path="/admin/rate-limits" element={<RateLimitDashboard />} />
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { API_BASE_URL } from '../../config/api';
import { STORAGE_KEYS } from '../../config/constants';
import './RateLimitDashboard.css';

/**
 * @constant {number} AUTO_REFRESH_INTERVAL - Auto-refresh interval in milliseconds
 */
const AUTO_REFRESH_INTERVAL = 30000;

/**
 * @constant {Object} STATUS_THRESHOLDS - Percentage thresholds for status colors
 */
const STATUS_THRESHOLDS = {
  CRITICAL: 90,
  WARNING: 70,
  CAUTION: 50,
  HEALTHY: 0
};

/**
 * @constant {Object} STATUS_COLORS - Color codes for different usage levels
 */
const STATUS_COLORS = {
  CRITICAL: '#F44336',
  WARNING: '#FF9800',
  CAUTION: '#FFC107',
  HEALTHY: '#4CAF50'
};

/**
 * @constant {Object} DEFAULT_LIMITS - Default limit values if API doesn't return them
 */
const DEFAULT_LIMITS = {
  messaging: 1000,
  templates: 100,
  apiCalls: 60,
  mediaUploads: 100
};

const RateLimitDashboard = () => {
  const { user } = useAuth();
  const [rateLimits, setRateLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.businessId) {
      fetchRateLimits();
      const interval = setInterval(fetchRateLimits, AUTO_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [user?.businessId]);

  /**
   * Fetch rate limits from API
   */
  const fetchRateLimits = async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
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

  /**
   * Calculate usage percentage
   * @param {number} current - Current usage count
   * @param {number} limit - Maximum limit
   * @returns {number} Percentage (0-100)
   */
  const calculatePercentage = (current, limit) => {
    if (!limit) return 0;
    return Math.min(Math.round((current / limit) * 100), 100);
  };

  /**
   * Get color based on usage percentage
   * @param {number} percentage - Usage percentage (0-100)
   * @returns {string} Hex color code
   */
  const getStatusColor = (percentage) => {
    if (percentage >= STATUS_THRESHOLDS.CRITICAL) return STATUS_COLORS.CRITICAL;
    if (percentage >= STATUS_THRESHOLDS.WARNING) return STATUS_COLORS.WARNING;
    if (percentage >= STATUS_THRESHOLDS.CAUTION) return STATUS_COLORS.CAUTION;
    return STATUS_COLORS.HEALTHY;
  };

  /**
   * Format reset time as human-readable duration
   * @param {string|Date} resetTime - ISO date string or Date object
   * @returns {string} Formatted time (e.g., '2h 30m' or '45m')
   */
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
          <button 
            className="refresh-btn" 
            onClick={fetchRateLimits}
            aria-label="Refresh rate limit data"
          >
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
                  <div 
                    className="progress-bar-wrapper"
                    role="progressbar"
                    aria-valuenow={calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit || DEFAULT_LIMITS.messaging)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Messaging usage"
                  >
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit || DEFAULT_LIMITS.messaging)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit || DEFAULT_LIMITS.messaging))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.messaging?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.messaging?.limit || DEFAULT_LIMITS.messaging}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.messaging?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit || DEFAULT_LIMITS.messaging) >= STATUS_THRESHOLDS.WARNING ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.messaging?.current || 0, rateLimits.messaging?.limit || DEFAULT_LIMITS.messaging)}%
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
                  <div 
                    className="progress-bar-wrapper"
                    role="progressbar"
                    aria-valuenow={calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit || DEFAULT_LIMITS.templates)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Templates usage"
                  >
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit || DEFAULT_LIMITS.templates)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit || DEFAULT_LIMITS.templates))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.templates?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.templates?.limit || DEFAULT_LIMITS.templates}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.templates?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit || DEFAULT_LIMITS.templates) >= STATUS_THRESHOLDS.WARNING ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.templates?.current || 0, rateLimits.templates?.limit || DEFAULT_LIMITS.templates)}%
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
                  <div 
                    className="progress-bar-wrapper"
                    role="progressbar"
                    aria-valuenow={calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit || DEFAULT_LIMITS.apiCalls)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="API calls usage"
                  >
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit || DEFAULT_LIMITS.apiCalls)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit || DEFAULT_LIMITS.apiCalls))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.apiCalls?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.apiCalls?.limit || DEFAULT_LIMITS.apiCalls}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.apiCalls?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit || DEFAULT_LIMITS.apiCalls) >= STATUS_THRESHOLDS.WARNING ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.apiCalls?.current || 0, rateLimits.apiCalls?.limit || DEFAULT_LIMITS.apiCalls)}%
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
                  <div 
                    className="progress-bar-wrapper"
                    role="progressbar"
                    aria-valuenow={calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit || DEFAULT_LIMITS.mediaUploads)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Media uploads usage"
                  >
                    <div 
                      className="progress-bar"
                      style={{ 
                        width: `${calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit || DEFAULT_LIMITS.mediaUploads)}%`,
                        background: getStatusColor(calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit || DEFAULT_LIMITS.mediaUploads))
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span className="current">{rateLimits.mediaUploads?.current || 0}</span>
                    <span className="separator">/</span>
                    <span className="limit">{rateLimits.mediaUploads?.limit || DEFAULT_LIMITS.mediaUploads}</span>
                  </div>
                </div>
                <div className="limit-footer">
                  <span className="reset-time">
                    ⏰ Resets in {formatTime(rateLimits.mediaUploads?.resetTime)}
                  </span>
                  <span className={`usage-percentage ${calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit || DEFAULT_LIMITS.mediaUploads) >= STATUS_THRESHOLDS.WARNING ? 'warning' : ''}`}>
                    {calculatePercentage(rateLimits.mediaUploads?.current || 0, rateLimits.mediaUploads?.limit || DEFAULT_LIMITS.mediaUploads)}%
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

