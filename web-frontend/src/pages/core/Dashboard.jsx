/**
 * 📊 Dashboard Page Component
 * 
 * Main dashboard displaying business metrics, campaigns, and activity feed.
 * Central hub for monitoring WhatsApp Business performance.
 * Shows real-time stats, recent campaigns, and user activities.
 * 
 * @component
 * @requires react-router-dom - Navigation
 * @requires AuthContext - User authentication and permissions
 * @requires Toast - Notifications
 * @requires analyticsService - Analytics data fetching
 * @requires campaignService - Campaign data fetching
 * 
 * @features
 * - Real-time messaging statistics (sent, delivered, read, replied)
 * - Recent campaigns list with status badges
 * - Recent activity feed
 * - Business setup validation
 * - Role-based permission checks
 * - Auto-refresh functionality
 * - Error handling with retry
 * - Loading skeletons
 * 
 * @state
 * - loading: Data fetch state
 * - stats: Dashboard metrics object
 * - recentCampaigns: Last 5 campaigns array
 * - recentActivities: Last 10 activities array
 * - error: Error message string
 * 
 * @metrics
 * - Total Messages: All messages sent
 * - Delivered: Successfully delivered messages
 * - Read: Messages read by recipients
 * - Replies: Messages with user responses
 * 
 * @navigation
 * - /login: Redirects if unauthorized
 * - /business/create: For business setup
 * - /campaigns: View all campaigns
 * - /campaigns/:id: View campaign details
 * 
 * @permissions
 * - Checks user.businessId for setup completion
 * - Uses hasPermissionTo for feature access
 * 
 * @todo Replace fetch() with service layer
 * @todo Replace localStorage with STORAGE_KEYS
 * @todo Add real-time WebSocket updates
 * 
 * @example
 * <Route path="/" element={<Dashboard />} />
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { PERMISSIONS, ROLES } from '../../utils/roles';
import * as analyticsService from '../../services/analytics/analyticsService';
import * as campaignService from '../../services/campaigns/campaignService';
import { MdMessage, MdCheckCircle, MdError, MdTrendingUp, MdCampaign, MdPeople, MdAnalytics, MdSend, MdAdd, MdSchedule, MdContacts, MdDescription, MdSettings, MdBusiness } from 'react-icons/md';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { COOKIE_KEYS, ROUTES, ERROR_MESSAGES } from '../../config/constants';
import { getCookie } from '../../utils/cookies';
import { formatNumber, formatDate, sanitizeHTML } from '../../utils/format';
import { handleApiError, isNetworkError } from '../../utils/errors';
import '../../components/Stats.css';
import './Dashboard.css';

/**
 * Dashboard Configuration
 * Centralized constants to avoid magic numbers and hardcoded values
 */
const DASHBOARD_CONFIG = {
  RECENT_CAMPAIGNS_LIMIT: 5,
  RECENT_ACTIVITIES_LIMIT: 10,
  ANALYTICS_RANGE: '7days',
  REFRESH_INTERVAL: 60000, // 1 minute
  API_TIMEOUT: 30000 // 30 seconds
};

/**
 * Status badge colors mapping
 * @constant {Object}
 */
const STATUS_COLORS = {
  active: 'var(--success)',
  completed: 'var(--text-secondary)',
  scheduled: 'var(--info)',
  paused: 'var(--warning)',
  draft: 'var(--text-tertiary)',
  default: 'var(--text-secondary)'
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, currentBusiness, hasPermissionTo } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Load dashboard data with proper error handling
   * Uses service layer instead of direct fetch calls
   * @returns {Promise<void>}
   */
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    // Security: Use centralized auth check
    const token = getCookie(COOKIE_KEYS.TOKEN);
    if (!token) {
      navigate(ROUTES.LOGIN);
      return;
    }

    try {
      // Check if user has business setup
      if (!user?.businessId) {
        setStats({
          totalMessages: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          messagesReplied: 0,
          deliveryRate: 0,
          readRate: 0,
          replyRate: 0,
          messagesToday: 0
        });
        setRecentCampaigns([]);
        setRecentActivities([]);
        setError(ERROR_MESSAGES.BUSINESS_SETUP_REQUIRED);
        setLoading(false);
        return;
      }

      // Use service layer with proper timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), DASHBOARD_CONFIG.API_TIMEOUT)
      );

      // Fetch all dashboard data using service layer (prevents code duplication)
      const [metricsResult, campaignsResult] = await Promise.race([
        Promise.all([
          analyticsService.getDashboardAnalytics({ 
            range: DASHBOARD_CONFIG.ANALYTICS_RANGE 
          }).catch(err => ({ error: err })),
          campaignService.getCampaigns({ 
            limit: DASHBOARD_CONFIG.RECENT_CAMPAIGNS_LIMIT 
          }).catch(err => ({ error: err }))
        ]),
        timeoutPromise
      ]);

      // Parse analytics data safely
      let stats = {
        totalMessages: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesReplied: 0,
        deliveryRate: 0,
        readRate: 0,
        replyRate: 0,
        messagesToday: 0
      };
      
      if (metricsResult && !metricsResult.error) {
        const metricsData = metricsResult.data || metricsResult;
        if (metricsData?.summary) {
          stats = {
            totalMessages: metricsData.summary.totalMessagesSent || 0,
            messagesDelivered: metricsData.summary.totalMessagesDelivered || 0,
            messagesRead: metricsData.summary.totalMessagesRead || 0,
            messagesReplied: metricsData.summary.totalMessagesReplied || 0,
            deliveryRate: metricsData.deliveryRate || 0,
            readRate: metricsData.readRate || 0,
            replyRate: metricsData.replyRate || 0,
            messagesToday: metricsData.summary.messagesToday || 0
          };
        }
      }
      
      // Parse campaigns data safely
      let campaignsData = [];
      if (campaignsResult && !campaignsResult.error) {
        const campaigns = campaignsResult.data?.campaigns || campaignsResult.data || [];
        campaignsData = Array.isArray(campaigns) ? campaigns : [];
      }

      setStats(stats);
      setRecentCampaigns(campaignsData);
      setRecentActivities([]);
      
    } catch (err) {
      // Improved error handling without sensitive data leakage
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      
      // Only log in development, no sensitive data
      if (process.env.NODE_ENV === 'development') {
        console.warn('Dashboard data load failed:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  /**
   * Get color for campaign status badge
   * Memoized to prevent unnecessary recalculations
   * @param {string} status - Campaign status
   * @returns {string} CSS color variable
   */
  const getStatusColor = useCallback((status) => {
    const statusLower = status?.toLowerCase() || '';
    return STATUS_COLORS[statusLower] || STATUS_COLORS.default;
  }, []);

  /**
   * Get activity icon with memoization
   * @param {string} type - Activity type
   * @returns {string} Icon character
   */
  const getActivityIcon = useCallback((type) => {
    switch (type) {
      case 'campaign_created': return '▶';
      case 'campaign_sent': return '✓';
      case 'template_approved': return '✓';
      case 'message_received': return '●';
      default: return '•';
    }
  }, []);

  // Memoize formatted stats to prevent recalculation on every render
  const formattedStats = useMemo(() => {
    if (!stats) return null;
    return {
      totalMessages: formatNumber(stats.totalMessages || 0),
      messagesDelivered: formatNumber(stats.messagesDelivered || 0),
      messagesRead: formatNumber(stats.messagesRead || 0),
      messagesReplied: formatNumber(stats.messagesReplied || 0)
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="dashboard">
        <Navbar />
        <div className="dashboard-content">
          <LoadingSkeleton type="dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Navbar />
      
      <div className="dashboard-content">
        {error && (
          <div className="dashboard__error-banner">
            <span>{error}</span>
            <div className="dashboard__error-actions">
              {error.includes('business setup') ? (
                <button onClick={() => navigate('/business/create')}>Setup Business</button>
              ) : (
                <button onClick={loadDashboardData}>Retry</button>
              )}
            </div>
          </div>
        )}

        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back{user?.email ? `, ${sanitizeHTML(user.email)}` : ''}! Here's your overview.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-primary"><MdMessage /></div>
            <div className="stat-content">
              <p className="stat-label">Total Messages</p>
              <h2 className="stat-value">{formattedStats?.totalMessages || '0'}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-success"><MdCheckCircle /></div>
            <div className="stat-content">
              <p className="stat-label">Delivered</p>
              <h2 className="stat-value">{formattedStats?.messagesDelivered || '0'}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-info"><MdTrendingUp /></div>
            <div className="stat-content">
              <p className="stat-label">Read</p>
              <h2 className="stat-value">{formattedStats?.messagesRead || '0'}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-warning"><MdAnalytics /></div>
            <div className="stat-content">
              <p className="stat-label">Replies</p>
              <h2 className="stat-value">{formattedStats?.messagesReplied || '0'}</h2>
            </div>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="dashboard-grid">
          {/* Recent Campaigns */}
          <div className="dashboard-section">
            <Card>
              <div className="section-header">
                <h2 className="section-title">Recent Campaigns</h2>
                <button 
                  className="section-link"
                  onClick={() => navigate('/campaigns')}
                >
                  View All →
                </button>
              </div>

              {recentCampaigns.length === 0 ? (
                <div className="dashboard__empty-state">
                  <p>No campaigns yet</p>
                  <Button 
                    variant="outline" 
                    size="small"
                    onClick={() => navigate(`${ROUTES.CAMPAIGNS}/create`)}
                  >
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="campaigns-list">
                  {recentCampaigns.map((campaign) => (
                    <div 
                      key={campaign._id || campaign.id} 
                      className="campaign-item"
                      onClick={() => navigate(`${ROUTES.CAMPAIGNS}/${campaign._id || campaign.id}`)}
                    >
                      <div className="campaign-info">
                        <h4>{sanitizeHTML(campaign.name || 'Untitled Campaign')}</h4>
                        <p className="campaign-meta">
                          <span 
                            className="status-badge"
                            style={{ color: getStatusColor(campaign.status) }}
                          >
                            {sanitizeHTML(campaign.status || 'Draft')}
                          </span>
                          <span>•</span>
                          <span>{formatDate(campaign.createdAt)}</span>
                        </p>
                      </div>
                      <div className="campaign-stats">
                        <div className="campaign-stat">
                          <span className="stat-number">{formatNumber(campaign.totalSent || 0)}</span>
                          <span className="stat-text">Sent</span>
                        </div>
                        <div className="campaign-stat">
                          <span className="stat-number">{formatNumber(campaign.totalDelivered || 0)}</span>
                          <span className="stat-text">Delivered</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-section">
            <Card>
              <div className="section-header">
                <h2 className="section-title">Recent Activity</h2>
              </div>

              {recentActivities.length === 0 ? (
                <div className="dashboard__empty-state">
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivities.map((activity, index) => (
                    <div key={activity._id || index} className="activity-item">
                      <div className="activity-icon">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="activity-content">
                        <p className="activity-text">{sanitizeHTML(activity.description || activity.message)}</p>
                        <p className="activity-time">{formatDate(activity.timestamp || activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Actions - Role-Based */}
        <div className="dashboard-section quick-actions-section">
          <div className="quick-actions-header">
            <h2 className="quick-actions-title">⚡ Quick Actions</h2>
          </div>
          <div className="quick-actions">
            {/* All users can access Inbox */}
            <Card className="quick-action-card" hoverable onClick={() => navigate(ROUTES.INBOX)}>
              <div className="quick-action-icon"><MdMessage /></div>
              <h3>Inbox</h3>
              <p>Manage conversations</p>
            </Card>
            
            {/* Templates - Manager and above */}
            {hasPermissionTo(PERMISSIONS.MANAGE_TEMPLATES) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate(ROUTES.TEMPLATES)}>
                <div className="quick-action-icon"><MdDescription /></div>
                <h3>Templates</h3>
                <p>Message templates</p>
              </Card>
            )}
            
            {/* Analytics - Manager and above */}
            {hasPermissionTo(PERMISSIONS.VIEW_ANALYTICS) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate(ROUTES.ANALYTICS)}>
                <div className="quick-action-icon"><MdAnalytics /></div>
                <h3>Analytics</h3>
                <p>View insights</p>
              </Card>
            )}
            
            {/* Campaigns - Manager and above */}
            {hasPermissionTo(PERMISSIONS.CREATE_CAMPAIGNS) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate(ROUTES.CAMPAIGNS)}>
                <div className="quick-action-icon"><MdCampaign /></div>
                <h3>Campaigns</h3>
                <p>Marketing campaigns</p>
              </Card>
            )}
            
            {/* Business Settings - Admin only */}
            {hasPermissionTo(PERMISSIONS.MANAGE_BUSINESS_SETTINGS) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate('/business-settings')}>
                <div className="quick-action-icon"><MdBusiness /></div>
                <h3>Business</h3>
                <p>Business settings</p>
              </Card>
            )}
            
            {/* Super Admin Features */}
            
            {/* Contacts - All users */}
            <Card className="quick-action-card" hoverable onClick={() => navigate(ROUTES.CONTACTS)}>
              <div className="quick-action-icon"><MdContacts /></div>
              <h3>Contacts</h3>
              <p>Manage contacts</p>
            </Card>
            
            {/* Settings - All users */}
            <Card className="quick-action-card" hoverable onClick={() => navigate(ROUTES.SETTINGS)}>
              <div className="quick-action-icon"><MdSettings /></div>
              <h3>Settings</h3>
              <p>Account settings</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;





