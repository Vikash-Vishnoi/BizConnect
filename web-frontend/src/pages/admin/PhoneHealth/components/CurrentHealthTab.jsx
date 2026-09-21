import React from 'react';
import Card from '../../../../components/Card';
import { MdTrendingUp, MdPhoneIphone, MdCheckCircle } from 'react-icons/md';
import { getQualityColor, getQualityLabel, formatStatus, formatTier, formatVerification } from '../constants';

const CurrentHealthTab = ({ health, recommendations }) => {
  if (!health) return null;

  return (
    <>
      <div className="phone-health-details">
        <Card className="health-detail-card">
          <div className="card-header">
            <h3 className="card-title">
              <MdTrendingUp /> Quality Metrics
            </h3>
          </div>
          <div className="detail-items">
            <div className="detail-item">
              <span className="detail-label">Quality Score</span>
              <span className="detail-value" style={{ color: getQualityColor(health.qualityScore) }}>
                {health.qualityScore || 'Unknown'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Quality Rating</span>
              <span className="detail-value" style={{ color: getQualityColor(health.qualityRating) }}>
                {getQualityLabel(health.qualityRating)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Previous Rating</span>
              <span className="detail-value" style={{ color: health.previousRating ? getQualityColor(health.previousRating) : 'inherit' }}>
                {health.previousRating ? getQualityLabel(health.previousRating) : 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Quality Update</span>
              <span className="detail-value">
                {health.lastQualityUpdate ? new Date(health.lastQualityUpdate).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Messaging Limit</span>
              <span className="detail-value">
                {health.messagingLimit ? health.messagingLimit.toLocaleString() : 'N/A'} / day
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Current Usage</span>
              <span className="detail-value">
                {health.currentUsage !== undefined ? health.currentUsage.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Remaining Capacity</span>
              <span className="detail-value">
                {health.messagingLimit && health.currentUsage !== undefined 
                  ? (health.messagingLimit - health.currentUsage).toLocaleString() 
                  : 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Usage Percentage</span>
              <span className="detail-value" style={{ 
                color: health.messagingLimit && health.currentUsage !== undefined 
                  ? (health.currentUsage / health.messagingLimit) > 0.8 
                    ? '#F44336' 
                    : (health.currentUsage / health.messagingLimit) > 0.5 
                      ? '#FF9800' 
                      : '#4CAF50'
                  : 'inherit'
              }}>
                {health.messagingLimit && health.currentUsage !== undefined 
                  ? Math.round((health.currentUsage / health.messagingLimit) * 100) + '%'
                  : 'N/A'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="health-detail-card">
          <div className="card-header">
            <h3 className="card-title">
              <MdPhoneIphone /> Account Details
            </h3>
          </div>
          <div className="detail-items">
            <div className="detail-item">
              <span className="detail-label">Display Phone Number</span>
              <span className="detail-value">{health.displayPhoneNumber || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone Number ID</span>
              <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                {health.phoneNumberId || 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">WABA ID</span>
              <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                {health.wabaId || 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Verified Name</span>
              <span className="detail-value">{health.verifiedName || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Name Status</span>
              <span className="detail-value">{formatStatus(health.nameStatus)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Code Verification</span>
              <span className="detail-value" style={{ 
                color: health.codeVerificationStatus === 'VERIFIED' ? '#4CAF50' : '#F44336'
              }}>
                {formatVerification(health.codeVerificationStatus)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Account Mode</span>
              <span className="detail-value" style={{ 
                color: health.accountMode === 'LIVE' ? '#4CAF50' : '#FF9800'
              }}>
                {formatStatus(health.accountMode)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone Status</span>
              <span className="detail-value" style={{ 
                color: health.status === 'CONNECTED' ? '#4CAF50' : '#F44336'
              }}>
                {formatStatus(health.status)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Official Business Account</span>
              <span className="detail-value" style={{ 
                color: health.isOfficialBusinessAccount ? '#4CAF50' : '#9E9E9E'
              }}>
                {health.isOfficialBusinessAccount ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">PIN Enabled</span>
              <span className="detail-value" style={{ 
                color: health.isPinEnabled ? '#4CAF50' : '#F44336'
              }}>
                {health.isPinEnabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Messaging Tier</span>
              <span className="detail-value">{formatTier(health.messagingLimitTier)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Throughput Level</span>
              <span className="detail-value">{formatStatus(health.throughput?.level) || 'Standard'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Max Throughput</span>
              <span className="detail-value">
                {health.throughput?.maxThroughput ? health.throughput.maxThroughput + ' msg/sec' : 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Platform Type</span>
              <span className="detail-value">{health.platformType || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">
                {health.lastUpdated ? new Date(health.lastUpdated).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {recommendations && recommendations.length > 0 && (
        <Card className="recommendations-card">
          <div className="card-header">
            <h3 className="card-title">
              <MdCheckCircle /> Recommendations
            </h3>
          </div>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <MdCheckCircle className="recommendation-icon" />
                <div className="recommendation-content">
                  <p className="recommendation-message">{rec.message}</p>
                  <p className="recommendation-action">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
};

export default CurrentHealthTab;
