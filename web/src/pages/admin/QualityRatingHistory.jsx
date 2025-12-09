import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import { API_BASE_URL } from '../../config/api';
import './QualityRatingHistory.css';

const QualityRatingHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [currentRating, setCurrentRating] = useState(null);

  const dateRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    if (user?.businessId) {
      fetchQualityHistory();
    }
  }, [dateRange, user?.businessId]);

  const fetchQualityHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/business/health-monitoring/quality-history?dateRange=${dateRange}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        setCurrentRating(data.currentRating || null);
      }
    } catch (error) {
      console.error('Failed to fetch quality history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN': return '#4CAF50';
      case 'YELLOW': return '#FFC107';
      case 'RED': return '#F44336';
      case 'UNKNOWN': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN': return '🟢';
      case 'YELLOW': return '🟡';
      case 'RED': return '🔴';
      case 'UNKNOWN': return '⚪';
      default: return '⚪';
    }
  };

  const getRatingDescription = (rating) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN': return 'High quality - Excellent messaging performance';
      case 'YELLOW': return 'Medium quality - Monitor your messaging practices';
      case 'RED': return 'Low quality - Immediate action required';
      case 'UNKNOWN': return 'Quality status unknown';
      default: return 'No rating available';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to view quality rating history."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="quality-rating-history-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading quality rating history...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="quality-rating-history-container">
        <div className="quality-rating-history-header">
          <div>
            <h1>⭐ Quality Rating History</h1>
            <p>Track your WhatsApp Business messaging quality over time</p>
          </div>
          <div className="date-range-selector">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
        </div>

        {currentRating && (
          <div className="current-rating-card" style={{ borderColor: getRatingColor(currentRating.status) }}>
            <div className="rating-icon-large">
              {getRatingIcon(currentRating.status)}
            </div>
            <div className="rating-content">
              <h2>Current Quality Rating</h2>
              <div className="rating-status" style={{ color: getRatingColor(currentRating.status) }}>
                {currentRating.status}
              </div>
              <p className="rating-description">
                {getRatingDescription(currentRating.status)}
              </p>
              {currentRating.lastUpdated && (
                <p className="rating-updated">
                  Last updated: {formatDate(currentRating.lastUpdated)}
                </p>
              )}
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No quality rating history</h3>
            <p>Quality rating history will appear here as data becomes available</p>
          </div>
        ) : (
          <>
            <div className="timeline-section">
              <h3>📈 Quality Rating Timeline</h3>
              <div className="timeline">
                {history.map((entry, index) => (
                  <div key={entry._id || index} className="timeline-entry">
                    <div className="timeline-marker" style={{ background: getRatingColor(entry.rating) }}>
                      {getRatingIcon(entry.rating)}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-card">
                        <div className="timeline-header">
                          <div className="timeline-rating" style={{ color: getRatingColor(entry.rating) }}>
                            <strong>{entry.rating}</strong>
                          </div>
                          <div className="timeline-date">
                            {formatDate(entry.timestamp || entry.createdAt)}
                          </div>
                        </div>
                        {entry.reason && (
                          <p className="timeline-reason">
                            <strong>Reason:</strong> {entry.reason}
                          </p>
                        )}
                        {entry.metrics && (
                          <div className="timeline-metrics">
                            {entry.metrics.qualityScore && (
                              <span className="metric">
                                📊 Quality Score: {entry.metrics.qualityScore}
                              </span>
                            )}
                            {entry.metrics.messagesSent && (
                              <span className="metric">
                                📤 Messages Sent: {entry.metrics.messagesSent.toLocaleString()}
                              </span>
                            )}
                            {entry.metrics.deliveryRate && (
                              <span className="metric">
                                ✅ Delivery Rate: {entry.metrics.deliveryRate}%
                              </span>
                            )}
                          </div>
                        )}
                        {entry.recommendations && entry.recommendations.length > 0 && (
                          <div className="timeline-recommendations">
                            <strong>💡 Recommendations:</strong>
                            <ul>
                              {entry.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="insights-section">
              <h3>📊 Insights & Trends</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon green">🟢</div>
                  <div className="insight-content">
                    <h4>Green Ratings</h4>
                    <div className="insight-value">
                      {history.filter(h => h.rating === 'GREEN').length}
                    </div>
                    <p className="insight-detail">
                      {Math.round((history.filter(h => h.rating === 'GREEN').length / history.length) * 100)}% of total
                    </p>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon yellow">🟡</div>
                  <div className="insight-content">
                    <h4>Yellow Ratings</h4>
                    <div className="insight-value">
                      {history.filter(h => h.rating === 'YELLOW').length}
                    </div>
                    <p className="insight-detail">
                      {Math.round((history.filter(h => h.rating === 'YELLOW').length / history.length) * 100)}% of total
                    </p>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon red">🔴</div>
                  <div className="insight-content">
                    <h4>Red Ratings</h4>
                    <div className="insight-value">
                      {history.filter(h => h.rating === 'RED').length}
                    </div>
                    <p className="insight-detail">
                      {Math.round((history.filter(h => h.rating === 'RED').length / history.length) * 100)}% of total
                    </p>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon total">📊</div>
                  <div className="insight-content">
                    <h4>Total Ratings</h4>
                    <div className="insight-value">{history.length}</div>
                    <p className="insight-detail">Rating updates recorded</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-box">
              <h4>ℹ️ About Quality Ratings</h4>
              <p>
                WhatsApp Business quality ratings reflect your messaging behavior and customer engagement. 
                Maintain a high-quality rating by:
              </p>
              <ul>
                <li>Sending messages only to users who have opted in</li>
                <li>Providing valuable, relevant content</li>
                <li>Responding promptly to customer inquiries</li>
                <li>Avoiding spam-like behavior</li>
                <li>Maintaining high message delivery and read rates</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default QualityRatingHistory;

