/**
 * 📊 Business Capability Widget Component
 * 
 * Displays WhatsApp Business Account capabilities and restrictions.
 * Shows account status, active restrictions, and last check time.
 * Provides visual indicators for capability health and compliance.
 * 
 * @component
 * @returns {JSX.Element|null} Capability widget or null if no data
 * 
 * @example
 * // Basic usage on dashboard
 * <BusinessCapabilityWidget />
 * 
 * @features
 * - Real-time capability status monitoring
 * - Visual status indicators (emoji + color coding)
 * - Restriction alerts with severity levels
 * - Auto-refresh capability data
 * - Loading and error states
 * 
 * @status_types
 * - ACTIVE: All capabilities enabled ✅
 * - RESTRICTED: Some limitations ⚠️
 * - DISABLED: Account disabled ❌
 * - SUSPENDED: Account suspended 🚫
 */

import React, { useState, useEffect } from 'react';
import { getCapabilities } from '../services/business/capabilityService';
import Card from './Card';
import LoadingSkeleton from './LoadingSkeleton';
import './BusinessCapabilityWidget.css';

/**
 * Status color mapping for visual indicators
 */
const STATUS_COLORS = {
  ACTIVE: 'green',
  RESTRICTED: 'orange',
  DISABLED: 'red',
  SUSPENDED: 'red',
  DEFAULT: 'gray'
};

/**
 * Status icon mapping for accessibility and clarity
 */
const STATUS_ICONS = {
  ACTIVE: '✅',
  RESTRICTED: '⚠️',
  DISABLED: '❌',
  SUSPENDED: '🚫',
  DEFAULT: 'ℹ️'
};

const BusinessCapabilityWidget = () => {
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCapabilities();
  }, []);

  const loadCapabilities = async () => {
    try {
      setLoading(true);
      const data = await getCapabilities();
      setCapabilities(data);
    } catch (err) {
      setError(err.message || 'Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="business-capability-widget loading">
        <h3>Business Capabilities</h3>
        <LoadingSkeleton type="card" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="business-capability-widget error">
        <h3>Business Capabilities</h3>
        <p className="error-message">{error}</p>
      </Card>
    );
  }

  if (!capabilities) {
    return null;
  }

  /**
   * Get status color for visual indication
   * @param {string} status - Account status
   * @returns {string} Color name for CSS class
   */
  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || STATUS_COLORS.DEFAULT;
  };

  /**
   * Get status icon for accessibility
   * @param {string} status - Account status
   * @returns {string} Emoji icon
   */
  const getStatusIcon = (status) => {
    return STATUS_ICONS[status] || STATUS_ICONS.DEFAULT;
  };

  return (
    <Card className="business-capability-widget" role="region" aria-label="Business Capabilities">
      <div className="widget-header">
        <h3>Business Capabilities</h3>
        <span 
          className={`status-badge status-${getStatusColor(capabilities.accountStatus)}`}
          role="status"
          aria-label={`Account status: ${capabilities.accountStatus}`}
        >
          {getStatusIcon(capabilities.accountStatus)} {capabilities.accountStatus}
        </span>
      </div>

      <div className="widget-content">
        {capabilities.hasRestrictions ? (
          <div className="restriction-alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Account Restrictions</strong>
              <p>{capabilities.restrictionCount} active restriction(s) found</p>
            </div>
          </div>
        ) : (
          <div className="healthy-status">
            <span className="status-icon">✅</span>
            <p>All capabilities are enabled</p>
          </div>
        )}

        {capabilities.activeRestrictions && capabilities.activeRestrictions.length > 0 && (
          <div className="restrictions-list">
            {capabilities.activeRestrictions.slice(0, 3).map((restriction, index) => (
              <div key={index} className="restriction-item">
                <span className="restriction-capability">{restriction.capability}</span>
                <span className={`restriction-severity severity-${restriction.severity.toLowerCase()}`}>
                  {restriction.severity}
                </span>
              </div>
            ))}
          </div>
        )}

        {capabilities.lastUpdatedAt && (
          <p className="last-updated">
            Last checked: {new Date(capabilities.lastUpdatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  );
};

export default BusinessCapabilityWidget;


