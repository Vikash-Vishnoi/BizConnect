import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as alertService from '../../services/core/alertService';
import Navbar from '../../components/Navbar';
import { MdWarning, MdError, MdInfo, MdCheckCircle, MdRefresh, MdNotifications } from 'react-icons/md';
import './Alerts.css';

const Alerts = () => {
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      const params = {};
      if (filter === 'unresolved') params.resolved = false;
      if (filter === 'critical') params.severity = 'CRITICAL';

      const data = await alertService.getAlerts(params);
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await alertService.getAlertStats();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await alertService.acknowledgeAlert(alertId);
      toast.success('✅ Alert acknowledged');
      fetchAlerts();
      fetchStats();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await alertService.resolveAlert(alertId);
      toast.success('🎉 Alert resolved');
      fetchAlerts();
      fetchStats();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#dc3545';
      case 'HIGH': return '#fd7e14';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getSeverityIcon = (severity) => {
    const iconStyle = { fontSize: '20px', verticalAlign: 'middle' };
    switch (severity) {
      case 'CRITICAL': return <MdError style={{ ...iconStyle, color: '#dc3545' }} />;
      case 'HIGH': return <MdWarning style={{ ...iconStyle, color: '#fd7e14' }} />;
      case 'MEDIUM': return <MdInfo style={{ ...iconStyle, color: '#ffc107' }} />;
      case 'LOW': return <MdInfo style={{ ...iconStyle, color: '#17a2b8' }} />;
      default: return <MdNotifications style={iconStyle} />;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="alerts-container">
          <LoadingSkeleton type="list" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="alerts-container">
        <div className="alerts-header">
          <div>
            <h1><MdNotifications style={{ verticalAlign: 'middle' }} /> Alerts & Notifications</h1>
            <p>Monitor critical events and system notifications</p>
          </div>
          <button 
            className="refresh-btn"
            onClick={() => {
              fetchAlerts();
              fetchStats();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer' }}
          >
            <MdRefresh /> Refresh
          </button>
        </div>

        {stats && (
          <div className="alerts-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Alerts</div>
              </div>
            </div>
            <div className="stat-card critical">
              <div className="stat-icon">🚨</div>
              <div className="stat-content">
                <div className="stat-value">{stats.critical}</div>
                <div className="stat-label">Critical</div>
              </div>
            </div>
            <div className="stat-card high">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.high}</div>
                <div className="stat-label">High Priority</div>
              </div>
            </div>
            <div className="stat-card unresolved">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.unresolved}</div>
                <div className="stat-label">Unresolved</div>
              </div>
            </div>
          </div>
        )}

        <div className="alerts-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts
          </button>
          <button
            className={`filter-btn ${filter === 'unresolved' ? 'active' : ''}`}
            onClick={() => setFilter('unresolved')}
          >
            Unresolved
          </button>
          <button
            className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >
            Critical Only
          </button>
        </div>

        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No alerts to display</h3>
              <p>You're all caught up!</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert._id}
                className={`alert-card ${alert.status.toLowerCase()}`}
                style={{ borderLeftColor: getSeverityColor(alert.severity) }}
              >
                <div className="alert-header">
                  <div className="alert-title">
                    <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
                    <span className="alert-severity" style={{ color: getSeverityColor(alert.severity) }}>
                      {alert.severity}
                    </span>
                    <h3>{alert.title}</h3>
                  </div>
                  <div className="alert-status">
                    <span className={`status-badge ${alert.status.toLowerCase()}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
                <p className="alert-message">{alert.message}</p>
                {alert.whatsappData && (
                  <div className="alert-metadata">
                    {alert.whatsappData.displayPhoneNumber && (
                      <span className="metadata-item">
                        📱 {alert.whatsappData.displayPhoneNumber}
                      </span>
                    )}
                    {alert.whatsappData.currentRating && (
                      <span className="metadata-item">
                        ⭐ Quality: {alert.whatsappData.currentRating}
                      </span>
                    )}
                  </div>
                )}
                <div className="alert-footer">
                  <span className="alert-time">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                  <div className="alert-actions">
                    {alert.status === 'UNREAD' && (
                      <button
                        className="action-btn acknowledge"
                        onClick={() => handleAcknowledge(alert._id)}
                      >
                        ✓ Acknowledge
                      </button>
                    )}
                    {alert.status !== 'RESOLVED' && (
                      <button
                        className="action-btn resolve"
                        onClick={() => handleResolve(alert._id)}
                      >
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Alerts;



