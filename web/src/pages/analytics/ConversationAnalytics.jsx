import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as analyticsService from '../../services/analytics/analyticsService';
import Navbar from '../../components/Navbar';
import { MdRefresh } from 'react-icons/md';
import './ConversationAnalytics.css';

const ConversationAnalytics = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  const dateRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  useEffect(() => {
    if (user?.businessId) {
      fetchAnalytics();
    }
  }, [dateRange, user?.businessId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getConversationAnalytics(dateRange);
      setAnalytics(data.analytics || data);
    } catch (error) {
      console.error('Failed to fetch conversation analytics:', error);
      toast.error('Failed to load conversation analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to view conversation analytics."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="conversation-analytics-container">
          <LoadingSkeleton type="dashboard" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="conversation-analytics-container">
        <div className="conversation-analytics-header">
          <div>
            <h1>💬 Conversation Analytics</h1>
            <p>Monitor conversation metrics, response times, and resolution rates</p>
          </div>
          <div className="date-range-selector">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!analytics ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No conversation data available</h3>
            <p>Start engaging with customers to see analytics</p>
          </div>
        ) : (
          <>
            <div className="metrics-grid">
              <div className="metric-card primary">
                <div className="metric-icon">💬</div>
                <div className="metric-content">
                  <div className="metric-label">Total Conversations</div>
                  <div className="metric-value">
                    {formatNumber(analytics.totalConversations || 0)}
                  </div>
                  <div className="metric-change">
                    {analytics.conversationGrowth >= 0 ? '📈' : '📉'} 
                    {Math.abs(analytics.conversationGrowth || 0)}% vs previous period
                  </div>
                </div>
              </div>

              <div className="metric-card success">
                <div className="metric-icon">✅</div>
                <div className="metric-content">
                  <div className="metric-label">Resolution Rate</div>
                  <div className="metric-value">{analytics.resolutionRate || 0}%</div>
                  <div className="metric-change">
                    {formatNumber(analytics.resolvedConversations || 0)} resolved
                  </div>
                </div>
              </div>

              <div className="metric-card info">
                <div className="metric-icon">⏱️</div>
                <div className="metric-content">
                  <div className="metric-label">Avg Response Time</div>
                  <div className="metric-value">
                    {formatTime(analytics.avgResponseTime || 0)}
                  </div>
                  <div className="metric-change">
                    First response: {formatTime(analytics.avgFirstResponseTime || 0)}
                  </div>
                </div>
              </div>

              <div className="metric-card warning">
                <div className="metric-icon">🔄</div>
                <div className="metric-content">
                  <div className="metric-label">Active Conversations</div>
                  <div className="metric-value">
                    {formatNumber(analytics.activeConversations || 0)}
                  </div>
                  <div className="metric-change">
                    {formatNumber(analytics.pendingConversations || 0)} pending
                  </div>
                </div>
              </div>
            </div>

            <div className="charts-section">
              <div className="chart-card">
                <h3>📊 Response Time Distribution</h3>
                <div className="response-time-bars">
                  <div className="time-bar-item">
                    <div className="time-label">Under 5 min</div>
                    <div className="time-bar-wrapper">
                      <div 
                        className="time-bar excellent"
                        style={{ width: `${analytics.responseTimeDistribution?.under5min || 0}%` }}
                      ></div>
                    </div>
                    <div className="time-percentage">
                      {analytics.responseTimeDistribution?.under5min || 0}%
                    </div>
                  </div>
                  <div className="time-bar-item">
                    <div className="time-label">5-15 min</div>
                    <div className="time-bar-wrapper">
                      <div 
                        className="time-bar good"
                        style={{ width: `${analytics.responseTimeDistribution?.between5and15min || 0}%` }}
                      ></div>
                    </div>
                    <div className="time-percentage">
                      {analytics.responseTimeDistribution?.between5and15min || 0}%
                    </div>
                  </div>
                  <div className="time-bar-item">
                    <div className="time-label">15-60 min</div>
                    <div className="time-bar-wrapper">
                      <div 
                        className="time-bar average"
                        style={{ width: `${analytics.responseTimeDistribution?.between15and60min || 0}%` }}
                      ></div>
                    </div>
                    <div className="time-percentage">
                      {analytics.responseTimeDistribution?.between15and60min || 0}%
                    </div>
                  </div>
                  <div className="time-bar-item">
                    <div className="time-label">Over 1 hour</div>
                    <div className="time-bar-wrapper">
                      <div 
                        className="time-bar poor"
                        style={{ width: `${analytics.responseTimeDistribution?.over1hour || 0}%` }}
                      ></div>
                    </div>
                    <div className="time-percentage">
                      {analytics.responseTimeDistribution?.over1hour || 0}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3>📈 Conversation Status</h3>
                <div className="status-breakdown">
                  <div className="status-item">
                    <div className="status-icon active">🔵</div>
                    <div className="status-info">
                      <div className="status-label">Active</div>
                      <div className="status-value">{formatNumber(analytics.activeConversations || 0)}</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon resolved">🟢</div>
                    <div className="status-info">
                      <div className="status-label">Resolved</div>
                      <div className="status-value">{formatNumber(analytics.resolvedConversations || 0)}</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon pending">🟡</div>
                    <div className="status-info">
                      <div className="status-label">Pending</div>
                      <div className="status-value">{formatNumber(analytics.pendingConversations || 0)}</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon closed">⚫</div>
                    <div className="status-info">
                      <div className="status-label">Closed</div>
                      <div className="status-value">{formatNumber(analytics.closedConversations || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="insights-section">
              <h3>💡 Key Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon">🏆</div>
                  <div className="insight-content">
                    <h4>Peak Hours</h4>
                    <p>{analytics.peakHours?.join(', ') || 'N/A'}</p>
                    <span className="insight-detail">Most active conversation times</span>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">📱</div>
                  <div className="insight-content">
                    <h4>Avg Messages Per Conversation</h4>
                    <p>{analytics.avgMessagesPerConversation || 0}</p>
                    <span className="insight-detail">Customer engagement level</span>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">⭐</div>
                  <div className="insight-content">
                    <h4>Customer Satisfaction</h4>
                    <p>{analytics.customerSatisfaction || 'N/A'}</p>
                    <span className="insight-detail">Based on conversation outcomes</span>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">🎯</div>
                  <div className="insight-content">
                    <h4>First Contact Resolution</h4>
                    <p>{analytics.firstContactResolutionRate || 0}%</p>
                    <span className="insight-detail">Issues resolved in first interaction</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ConversationAnalytics;



