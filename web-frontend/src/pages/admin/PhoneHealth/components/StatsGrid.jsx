import React from 'react';
import { MdPhone, MdCheckCircle, MdSignalCellularAlt, MdPhoneIphone } from 'react-icons/md';
import { getQualityColor, getQualityLabel, formatStatus, formatTier } from '../constants';

const StatsGrid = ({ health }) => {
  if (!health) return null;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-card__icon stat-card__icon--primary">
          <MdPhone />
        </div>
        <div className="stat-card__content">
          <p className="stat-card__label">Quality Rating</p>
          <div className="stat-card__value" style={{ color: getQualityColor(health?.qualityRating) }}>
            {getQualityLabel(health?.qualityRating)}
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__icon stat-card__icon--success">
          <MdCheckCircle />
        </div>
        <div className="stat-card__content">
          <p className="stat-card__label">Phone Status</p>
          <div className="stat-card__value">{formatStatus(health?.status)}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__icon stat-card__icon--info">
          <MdSignalCellularAlt />
        </div>
        <div className="stat-card__content">
          <p className="stat-card__label">Messaging Tier</p>
          <div className="stat-card__value">{formatTier(health?.messagingLimitTier)}</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__icon stat-card__icon--warning">
          <MdPhoneIphone />
        </div>
        <div className="stat-card__content">
          <p className="stat-card__label">Name Status</p>
          <div className="stat-card__value">{formatStatus(health?.nameStatus)}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsGrid;
