import React, { useState, useEffect } from 'react';
import { getCapabilities } from '../services/business/capabilityService';
import Card from '../Card';
import './BusinessCapabilityWidget.css';

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
        <p>Loading...</p>
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'RESTRICTED': return 'orange';
      case 'DISABLED': return 'red';
      case 'SUSPENDED': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return '✅';
      case 'RESTRICTED': return '⚠️';
      case 'DISABLED': return '❌';
      case 'SUSPENDED': return '🚫';
      default: return 'ℹ️';
    }
  };

  return (
    <Card className="business-capability-widget">
      <div className="widget-header">
        <h3>Business Capabilities</h3>
        <span className={`status-badge status-${getStatusColor(capabilities.accountStatus)}`}>
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


