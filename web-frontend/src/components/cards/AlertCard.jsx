/**
 * AlertCard Component
 * Displays individual system alert with acknowledge/resolve actions
 */

import React from 'react';
import { MdCheckCircle, MdDoneAll, MdAccessTime } from 'react-icons/md';
import { getSeverityIcon, getSeverityColor, formatDate } from '../../utils/errorAlertsUtils';
import './AlertCard.css';

const AlertCard = ({ alert, onAcknowledge, onResolve }) => {
  const SeverityIcon = getSeverityIcon(alert.severity);
  const severityColor = getSeverityColor(alert.severity);
  const data = alert.whatsappData || {};

  return (
    <div 
      className={`item-card alert-card ${alert.status.toLowerCase()}`}
      style={{ borderLeftColor: severityColor }}
    >
      {/* Header */}
      <div className="item-header">
        <div className="alert-title" key="alert-title">
          <span className="alert-icon" style={{ color: severityColor }}>
            <SeverityIcon />
          </span>
          <span className="alert-severity" style={{ color: severityColor }}>
            {alert.severity}
          </span>
          <h3>{alert.title}</h3>
        </div>
        <div className="item-status" key="status">
          <span className={`status-badge ${alert.status.toLowerCase()}`}>
            {alert.status}
          </span>
        </div>
      </div>

      {/* Message */}
      <p className="alert-message">{alert.message}</p>

      {/* Metadata */}
      {(data.phoneNumberId || data.displayPhoneNumber || data.currentRating || data.previousRating || data.qualityScore || data.messagingLimitTier || data.templateName || data.templateCategory || data.reasonCode) && (
        <div className="alert-metadata">
          {(data.displayPhoneNumber || data.phoneNumberId) && (
            <span className="metadata-item">
              <MdAccessTime />
              <span>{data.displayPhoneNumber || data.phoneNumberId}</span>
            </span>
          )}
          {data.currentRating && (
            <span className="metadata-item">
              ⭐ Quality: {data.currentRating}
            </span>
          )}
          {data.previousRating && (
            <span className="metadata-item">
              Prev: {data.previousRating}
            </span>
          )}
          {typeof data.qualityScore === 'number' && (
            <span className="metadata-item">
              Score: {data.qualityScore}
            </span>
          )}
          {data.messagingLimitTier && (
            <span className="metadata-item">
              Tier: {data.messagingLimitTier}
            </span>
          )}
          {data.templateName && (
            <span className="metadata-item">
              Template: {data.templateName} ({data.templateLanguage || 'lang ?'})
            </span>
          )}
          {data.templateCategory && (
            <span className="metadata-item">
              Category: {data.templateCategory}
            </span>
          )}
          {data.reasonCode && (
            <span className="metadata-item">
              Reason: {data.reasonCode}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="item-footer">
        <span className="item-timestamp" key="timestamp">
          <MdAccessTime />
          {formatDate(alert.createdAt)}
        </span>
        {alert.resolvedAt && (
          <span className="item-timestamp" key="resolved">
            <MdAccessTime />
            Resolved {formatDate(alert.resolvedAt)}
          </span>
        )}
        <div className="item-actions" key="actions">
          {alert.status === 'UNREAD' && (
            <button
              className="action-btn acknowledge-btn"
              onClick={() => onAcknowledge(alert._id)}
            >
              <MdCheckCircle />
              <span>Acknowledge</span>
            </button>
          )}
          {alert.status !== 'RESOLVED' && (
            <button
              className="action-btn resolve-btn"
              onClick={() => onResolve(alert._id)}
            >
              <MdDoneAll />
              <span>Resolve</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
