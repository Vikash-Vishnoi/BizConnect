/**
 * @component ConversationAnalytics
 * @description Real-time conversation analytics dashboard with metrics, response times, and resolution tracking
 * 
 * @features
 * - Conversation metrics dashboard (total, resolution rate, response time, active)
 * - Date range filtering (24h, 7d, 30d, 90d)
 * - Response time distribution chart (under 5min, 5-15min, 15-60min, over 1hr)
 * - Conversation status breakdown (active, resolved, pending, closed)
 * - Key insights section (peak hours, avg messages, satisfaction, FCR rate)
 * - Business setup validation
 * - Automatic refresh on date range change
 * 
 * @state
 * - analytics: Analytics data from API
 * - loading: Loading state for data fetch
 * - dateRange: Selected date range filter (24h/7d/30d/90d)
 * 
 * @api
 * - GET /analytics/conversations?range={dateRange} - Fetch conversation analytics
 * 
 * @routes
 * /analytics/conversations - Conversation analytics dashboard
 * 
 * @example
 * // Analytics data structure
 * {
 *   totalConversations: 1250,
 *   conversationGrowth: 15.5,
 *   resolutionRate: 87,
 *   resolvedConversations: 1088,
 *   avgResponseTime: 420,
 *   avgFirstResponseTime: 180,
 *   activeConversations: 45,
 *   pendingConversations: 12,
 *   responseTimeDistribution: { under5min: 45, between5and15min: 30, between15and60min: 20, over1hour: 5 },
 *   peakHours: ['10:00-11:00', '14:00-15:00', '18:00-19:00'],
 *   avgMessagesPerConversation: 12.5,
 *   customerSatisfaction: '4.5/5',
 *   firstContactResolutionRate: 72
 * }
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as analyticsService from '../../services/analytics/analyticsService';
import Navbar from '../../components/Navbar';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { MdRefresh, MdChat, MdCheckCircle, MdAccessTime, MdAutorenew, MdTrendingUp, MdTrendingDown, MdLightbulb, MdPhoneIphone, MdStar, MdTrackChanges, MdFiberManualRecord, MdMessage, MdError, MdVisibility } from 'react-icons/md';
import { blue, green, yellow, grey, red } from '@mui/material/colors';
import './ConversationAnalytics.css';
import './analytics-tabs.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Constants
const DATE_RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
];

const ConversationAnalytics = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    if (user?.businessId) {
      fetchAnalytics();
    }
  }, [dateRange, user?.businessId]);

  /**
   * Fetches conversation analytics data for selected date range
   */
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [conversationResponse, dashboardResponse] = await Promise.all([
        analyticsService.getConversationAnalytics(dateRange),
        analyticsService.getDashboardAnalytics({ range: dateRange === '24h' ? '7days' : dateRange === '7d' ? '7days' : dateRange === '30d' ? '30days' : '90days' })
      ]);
      
      console.log('Conversation Analytics Response:', conversationResponse);
      console.log('Dashboard Analytics Response:', dashboardResponse);
      
      setAnalytics(conversationResponse.data || conversationResponse);
      setDashboardData(dashboardResponse.data || dashboardResponse);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formats seconds into human-readable time (hours/minutes)
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string (e.g., '2h 15m' or '45m')
   */
  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  /**
   * Formats numbers with locale-specific thousand separators
   * @param {number} num - Number to format
   * @returns {string} Formatted number string
   */
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
            <h1>Analytics Dashboard</h1>
            <p>Comprehensive insights into messages and conversations</p>
          </div>
          <div className="date-range-selector">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} aria-label="Select date range">
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!analytics || !dashboardData ? (
          <div className="empty-state">
            <div className="empty-icon"><MdChat fontSize="2rem" color={blue[500]} /></div>
            <h3>No Data Available</h3>
            <p>Analytics will appear once conversations are created</p>
          </div>
        ) : (
          <>
            {/* Message Metrics */}
            <h2 style={{marginTop: '24px', marginBottom: '16px', color: '#333'}}>Message Analytics</h2>
            <div className="metrics-grid">
                  <div className="metric-card primary">
                    <div className="metric-icon"><MdMessage fontSize="1.5rem" color={blue[500]} /></div>
                    <div className="metric-content">
                      <div className="metric-label">Total Messages</div>
                      <div className="metric-value">
                        {formatNumber(dashboardData.totalMessages || 0)}
                      </div>
                      <div className="metric-change">
                        All sent messages
                      </div>
                    </div>
                  </div>

                  <div className="metric-card success">
                    <div className="metric-icon"><MdCheckCircle fontSize="1.5rem" color={green[500]} /></div>
                    <div className="metric-content">
                      <div className="metric-label">Delivery Rate</div>
                      <div className="metric-value">{dashboardData.deliveryRate || 0}%</div>
                      <div className="metric-change">
                        {formatNumber(dashboardData.delivered || 0)} delivered
                      </div>
                    </div>
                  </div>

                  <div className="metric-card info">
                    <div className="metric-icon"><MdVisibility fontSize="1.5rem" color={blue[600]} /></div>
                    <div className="metric-content">
                      <div className="metric-label">Read Rate</div>
                      <div className="metric-value">{dashboardData.readRate || 0}%</div>
                      <div className="metric-change">
                        {formatNumber(dashboardData.read || 0)} read
                      </div>
                    </div>
                  </div>

                  <div className="metric-card warning">
                    <div className="metric-icon"><MdError fontSize="1.5rem" color={red[500]} /></div>
                    <div className="metric-content">
                      <div className="metric-label">Failed Messages</div>
                      <div className="metric-value">
                        {formatNumber(dashboardData.failed || 0)}
                      </div>
                      <div className="metric-change">
                        Requires attention
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Charts */}
                <div className="charts-section">
                  <div className="chart-card">
                    <h3><MdTrendingUp color={blue[500]} style={{verticalAlign:'middle'}} /> Message Volume</h3>
                    <div style={{height: '300px', position: 'relative'}}>
                    {dashboardData.messageVolume && dashboardData.messageVolume.length > 0 ? (
                      <Line 
                        data={{
                          labels: dashboardData.messageVolume.map(d => d.date),
                          datasets: [{
                            label: 'Messages',
                            data: dashboardData.messageVolume.map(d => d.count),
                            borderColor: blue[500],
                            backgroundColor: `${blue[500]}33`,
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }}
                      />
                    ) : (
                      <div style={{padding: '40px', textAlign: 'center', color: grey[500]}}>
                        No message volume data available
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3><MdTrendingUp color={green[500]} style={{verticalAlign:'middle'}} /> Delivery Status</h3>
                    <div style={{height: '300px', position: 'relative'}}>
                    {dashboardData.deliveryStatus ? (
                      <Pie 
                        data={{
                          labels: ['Delivered', 'Read', 'Failed'],
                          datasets: [{
                            data: [
                              dashboardData.deliveryStatus.delivered || 0,
                              dashboardData.deliveryStatus.read || 0,
                              dashboardData.deliveryStatus.failed || 0
                            ],
                            backgroundColor: [green[500], blue[500], red[500]],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'bottom' }
                          }
                        }}
                      />
                    ) : (
                      <div style={{padding: '40px', textAlign: 'center', color: grey[500]}}>
                        No delivery status data available
                      </div>
                    )}
                    </div>
                  </div>
                </div>

            {/* Conversation Metrics */}
            <h2 style={{marginTop: '40px', marginBottom: '16px', color: '#333'}}>Conversation Analytics</h2>
            <div className="metrics-grid">
              <div className="metric-card primary">
                <div className="metric-icon"><MdChat fontSize="1.5rem" color={blue[500]} /></div>
                <div className="metric-content">
                  <div className="metric-label">Total Conversations</div>
                  <div className="metric-value">
                    {formatNumber(analytics.totalConversations || 0)}
                  </div>
                  <div className="metric-change">
                    {formatNumber(analytics.incomingMessages || 0)} incoming
                  </div>
                </div>
              </div>

              <div className="metric-card success">
                <div className="metric-icon"><MdCheckCircle fontSize="1.5rem" color={green[500]} /></div>
                <div className="metric-content">
                  <div className="metric-label">Resolution Rate</div>
                  <div className="metric-value">{analytics.resolutionRate || 0}%</div>
                  <div className="metric-change">
                    {formatNumber(analytics.resolvedConversations || 0)} resolved
                  </div>
                </div>
              </div>

              <div className="metric-card info">
                <div className="metric-icon"><MdAccessTime fontSize="1.5rem" color={grey[700]} /></div>
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
                <div className="metric-icon"><MdAutorenew fontSize="1.5rem" color={yellow[700]} /></div>
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
                <h3><MdTrendingUp color={blue[500]} style={{verticalAlign:'middle'}} /> Response Time Distribution</h3>
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
                <h3><MdTrendingUp color={green[500]} style={{verticalAlign:'middle'}} /> Conversation Status</h3>
                <div className="status-breakdown">
                  <div className="status-item">
                    <div className="status-icon active"><MdFiberManualRecord fontSize="1.2rem" style={{color: blue[500]}} /></div>
                    <div className="status-info">
                      <div className="status-label">Active</div>
                      <div className="status-value">{formatNumber(analytics.activeConversations || 0)}</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon resolved"><MdFiberManualRecord fontSize="1.2rem" style={{color: green[500]}} /></div>
                    <div className="status-info">
                      <div className="status-label">Resolved</div>
                      <div className="status-value">{formatNumber(analytics.resolvedConversations || 0)}</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon pending"><MdFiberManualRecord fontSize="1.2rem" style={{color: yellow[700]}} /></div>
                    <div className="status-info">
                      <div className="status-label">Pending</div>
                      <div className="status-value">{formatNumber(analytics.pendingConversations || 0)}</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon closed"><MdFiberManualRecord fontSize="1.2rem" style={{color: grey[800]}} /></div>
                    <div className="status-info">
                      <div className="status-label">Closed</div>
                      <div className="status-value">{formatNumber(analytics.closedConversations || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="insights-section">
              <h3><MdLightbulb color={yellow[700]} style={{verticalAlign:'middle'}} /> Key Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon"><MdCheckCircle color={green[500]} /></div>
                  <div className="insight-content">
                    <h4>Delivery Rate</h4>
                    <p>{analytics.deliveryRate || 0}%</p>
                    <span className="insight-detail">{formatNumber(analytics.deliveredMessages || 0)} delivered / {formatNumber(analytics.readMessages || 0)} read</span>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon"><MdAutorenew color={yellow[700]} /></div>
                  <div className="insight-content">
                    <h4>Unread Messages</h4>
                    <p>{formatNumber(analytics.unreadMessages || 0)}</p>
                    <span className="insight-detail">{analytics.unreadMessages || 0} unread from {formatNumber(analytics.incomingMessages || 0)} incoming</span>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon"><MdAccessTime color={grey[700]} /></div>
                  <div className="insight-content">
                    <h4>Failed Messages</h4>
                    <p>{formatNumber(analytics.failedMessages || 0)}</p>
                    <span className="insight-detail">{analytics.failedMessages || 0} failed out of {formatNumber((analytics.incomingMessages || 0) + (analytics.outgoingMessages || 0))} total</span>
                  </div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon"><MdTrendingUp color={blue[500]} /></div>
                  <div className="insight-content">
                    <h4>Template Usage</h4>
                    <p>{analytics.templateUsageRate || 0}%</p>
                    <span className="insight-detail">{formatNumber(analytics.templateMessages || 0)} template / {formatNumber(analytics.campaignMessages || 0)} campaign</span>
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



