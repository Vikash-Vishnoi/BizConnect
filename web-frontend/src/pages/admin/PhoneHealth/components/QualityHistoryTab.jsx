import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../../components/Card';
import { MdCheckCircle, MdWarning, MdError, MdTrendingUp, MdAnalytics, MdTimeline, MdArrowBack, MdPhoneIphone, MdLightbulb } from 'react-icons/md';
import { QUALITY_RATINGS, getQualityColor, formatDate, formatTier, formatStatus, formatVerification } from '../constants';

const QualityHistoryTab = ({ history, expandedEntries, toggleEntry }) => {
  const navigate = useNavigate();

  return (
    <div className="quality-history-container">
      {/* Insights Section */}
      <Card className="insights-card">
        <div className="card-header">
          <h3 className="card-title"><MdAnalytics /> Insights & Trends</h3>
        </div>
        <div className="insights-grid">
          <div className="insight-card insight-card--green">
            <div className="insight-icon">
              <MdCheckCircle />
            </div>
            <div className="insight-content">
              <h4>Green Ratings</h4>
              <div className="insight-value">
                {history.filter(h => h.rating === 'GREEN').length}
              </div>
              <p className="insight-detail">
                {history.length > 0 ? Math.round((history.filter(h => h.rating === 'GREEN').length / history.length) * 100) : 0}% of total
              </p>
            </div>
          </div>
          <div className="insight-card insight-card--yellow">
            <div className="insight-icon">
              <MdWarning />
            </div>
            <div className="insight-content">
              <h4>Yellow Ratings</h4>
              <div className="insight-value">
                {history.filter(h => h.rating === 'YELLOW').length}
              </div>
              <p className="insight-detail">
                {history.length > 0 ? Math.round((history.filter(h => h.rating === 'YELLOW').length / history.length) * 100) : 0}% of total
              </p>
            </div>
          </div>
          <div className="insight-card insight-card--red">
            <div className="insight-icon">
              <MdError />
            </div>
            <div className="insight-content">
              <h4>Red Ratings</h4>
              <div className="insight-value">
                {history.filter(h => h.rating === 'RED').length}
              </div>
              <p className="insight-detail">
                {history.length > 0 ? Math.round((history.filter(h => h.rating === 'RED').length / history.length) * 100) : 0}% of total
              </p>
            </div>
          </div>
          <div className="insight-card insight-card--blue">
            <div className="insight-icon">
              <MdTrendingUp />
            </div>
            <div className="insight-content">
              <h4>Total Ratings</h4>
              <div className="insight-value">{history.length}</div>
              <p className="insight-detail">Rating updates recorded</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline Section */}
      <Card className="timeline-card">
        <div className="card-header">
          <h3 className="card-title"><MdTimeline /> Quality Rating Timeline</h3>
        </div>
        <div className="timeline">
          {history.map((entry, index) => {
            const config = QUALITY_RATINGS[entry.rating] || QUALITY_RATINGS.UNKNOWN;
            const Icon = config.icon;
            const entryId = entry._id || index;
            const isExpanded = expandedEntries[entryId];
            
            return (
              <div key={entryId} className="timeline-entry">
                <div className="timeline-marker" style={{ background: config.color }}>
                  <Icon />
                </div>
                <div className="timeline-content">
                  <div 
                    className="timeline-item clickable"
                    style={{ borderLeftColor: config.color }}
                    onClick={() => navigate(`/phone-health/${entryId}`)}
                  >
                    <div className="timeline-header">
                      <div className="timeline-rating" style={{ color: config.color }}>
                        <strong>{entry.rating}</strong>
                      </div>
                      <div className="timeline-header-right">
                        <div className="timeline-date">
                          {formatDate(entry.timestamp || entry.createdAt)}
                        </div>
                        <div className="timeline-expand-icon" style={{ opacity: 0.6 }}>
                          <MdArrowBack style={{ transform: 'rotate(180deg)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default QualityHistoryTab;
