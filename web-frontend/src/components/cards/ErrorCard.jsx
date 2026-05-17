/**
 * ErrorCard Component
 * Displays individual message error with retry/dismiss actions
 */

import React from 'react';
import { MdLoop, MdClose, MdCheckCircle, MdAccessTime } from 'react-icons/md';
import { getErrorIcon, getErrorColor, getErrorLabel, formatDate } from '../../utils/errorAlertsUtils';
import './ErrorCard.css';

const ErrorCard = ({ error, onRetry, onDismiss }) => {
  const ErrorIcon = getErrorIcon(error.errorType);
  const errorColor = getErrorColor(error.errorType);
  const recipient = error.to || error.recipient || error.contactPhone;
  const contactName = error.contact?.name || error.contactName;
  const mediaLabel = error.mediaUrl ? 'Media attachment' : '';
  const messagePreview = error.messageContent || error.text || mediaLabel || '';
  const messageType = (error.type || '').toUpperCase();

  return (
    <div className="error-card">
      {/* Header with error type and timestamp */}
      <div className="error-card__header">
        <div className="error-card__type-badge" style={{ backgroundColor: `${errorColor}15`, color: errorColor }}>
          <ErrorIcon />
          <span>{getErrorLabel(error.errorType)}</span>
          {messageType && <span className="error-card__message-type">{messageType}</span>}
        </div>
        <div className="error-card__timestamp">
          <MdAccessTime />
          <span>{formatDate(error.createdAt || error.timestamp)}</span>
        </div>
      </div>

      {/* Error message */}
      <div className="error-card__message">
        <p>{error.errorMessage || error.message}</p>
        {error.errorCode && (
          <code className="error-card__code">{error.errorCode}</code>
        )}
      </div>

      {/* Recipient details */}
      <div className="error-card__details">
        <div className="error-card__detail-row">
          <span className="error-card__label">Recipient:</span>
          <span className="error-card__value">{recipient || 'Unknown'}</span>
        </div>
        {contactName && (
          <div className="error-card__detail-row">
            <span className="error-card__label">Contact:</span>
            <span className="error-card__value">{contactName}</span>
          </div>
        )}
        {messagePreview && (
          <div className="error-card__detail-row">
            <span className="error-card__label">Preview:</span>
            <span className="error-card__value error-card__preview">
              {messagePreview.substring(0, 100)}{messagePreview.length > 100 ? '...' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer with status and retry info */}
      <div className="error-card__footer">
        <span className={`error-card__status error-card__status--${error.status?.toLowerCase() || 'failed'}`}>
          {error.status || 'FAILED'}
        </span>
        {typeof error.retryCount === 'number' && error.retryCount > 0 && (
          <div className="error-card__retry-info">
            <MdLoop />
            <span>{error.retryCount} {error.retryCount === 1 ? 'retry' : 'retries'}</span>
            {error.lastRetryAt && <span className="error-card__retry-time">• {formatDate(error.lastRetryAt)}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorCard;
