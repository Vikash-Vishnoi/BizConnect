import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as phoneHealthService from '../../services/business/phoneHealthService';
import Navbar from '../../components/Navbar';
import { MdPhone, MdCheckCircle, MdWarning, MdError, MdRefresh, MdPlayArrow } from 'react-icons/md';
import './PhoneHealth.css';

const PhoneHealth = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user?.businessId) {
      fetchHealthData();
    }
  }, [user?.businessId]);

  const fetchHealthData = async () => {
    try {
      const data = await phoneHealthService.getPhoneHealth();
      setHealth(data.health);
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast.error('Failed to load phone health data');
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const data = await phoneHealthService.checkPhoneHealth();
      setHealth(data.health);
      setRecommendations(data.recommendations || []);
      toast.success('✅ Health check completed successfully');
    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Failed to run health check');
    } finally {
      setChecking(false);
    }
  };

  const getQualityIcon = (rating) => {
    const iconStyle = { fontSize: '24px' };
    switch (rating) {
      case 'GREEN': return <MdCheckCircle style={{ ...iconStyle, color: '#4CAF50' }} />;
      case 'YELLOW': return <MdWarning style={{ ...iconStyle, color: '#FF9800' }} />;
      case 'RED': return <MdError style={{ ...iconStyle, color: '#F44336' }} />;
      default: return <MdPhone style={iconStyle} />;
    }
  };

  const getQualityColor = (rating) => {
    switch (rating) {
      case 'GREEN': return '#4CAF50';
      case 'YELLOW': return '#FF9800';
      case 'RED': return '#F44336';
      default: return '#999';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 50) return '#FF9800';
    return '#F44336';
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to view phone health."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="phone-health-container">
          <LoadingSkeleton type="card" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="phone-health-content">
        <div className="phone-health-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1><MdPhone style={{ verticalAlign: 'middle' }} /> Phone Health Status</h1>
            <button
              onClick={fetchHealthData}
              className="icon-button"
              title="Refresh"
              style={{ marginLeft: 'auto' }}
            >
              <MdRefresh /> Refresh
            </button>
          </div>
          <p>Monitor your WhatsApp Business API phone number quality and status</p>
          <button
            className="check-button"
            onClick={runHealthCheck}
            disabled={checking}
          >
            {checking ? (
              <><MdRefresh className="spin" /> Checking...</>
            ) : (
              <><MdPlayArrow /> Run Health Check</>
            )}
          </button>
        </div>

        {health ? (
          <>
            <div className="health-summary">
              <div className="health-card main">
                <div className="health-score" style={{ color: getHealthScoreColor(health.healthScore) }}>
                  {health.healthScore}%
                </div>
                <div className="health-label">Health Score</div>
              </div>
              <div className="health-card">
                <div className="health-icon">{getQualityIcon(health.qualityRating)}</div>
                <div className="health-info">
                  <div className="health-value" style={{ color: getQualityColor(health.qualityRating) }}>
                    {health.qualityRating}
                  </div>
                  <div className="health-label">Quality Rating</div>
                </div>
              </div>
              <div className="health-card">
                <div className="health-icon">📊</div>
                <div className="health-info">
                  <div className="health-value">{health.status}</div>
                  <div className="health-label">Phone Status</div>
                </div>
              </div>
              <div className="health-card">
                <div className="health-icon">📞</div>
                <div className="health-info">
                  <div className="health-value">{health.displayPhoneNumber}</div>
                  <div className="health-label">Phone Number</div>
                </div>
              </div>
            </div>

            <div className="health-details">
              <div className="details-section">
                <h3>📈 Messaging Limits</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Daily Limit</span>
                    <span className="detail-value">{health.messagingLimit || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Limit Tier</span>
                    <span className="detail-value">{health.limitTier || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>📉 Quality Metrics</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Previous Rating</span>
                    <span className="detail-value">{health.previousRating || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Updated</span>
                    <span className="detail-value">
                      {health.lastUpdated ? new Date(health.lastUpdated).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>ℹ️ Account Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Account Mode</span>
                    <span className="detail-value">{health.accountMode || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Certificate</span>
                    <span className="detail-value">{health.certificate || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {recommendations.length > 0 && (
              <div className="recommendations">
                <h3>💡 Recommendations</h3>
                <div className="recommendation-list">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="rec-icon">✓</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No Health Data Available</h3>
            <p>Run a health check to see your phone number status</p>
            <button className="check-button" onClick={runHealthCheck}>
              <MdPlayArrow /> Run First Health Check
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PhoneHealth;



