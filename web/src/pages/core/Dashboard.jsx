import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { PERMISSIONS, ROLES } from '../../utils/roles';
import * as analyticsService from '../../services/analytics/analyticsService';
import * as campaignService from '../../services/campaigns/campaignService';
import { MdMessage, MdCheckCircle, MdError, MdTrendingUp, MdCampaign, MdPeople, MdAnalytics, MdSend, MdAdd, MdSchedule, MdContacts, MdDescription, MdSettings, MdBusiness, MdSecurity } from 'react-icons/md';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { API_BASE_URL } from '../../config/api';
import './Dashboard.css';

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

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Check user profile first
      const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch user profile');
      }

      const userData = await userRes.json();
      
      // Check if user has a business
      if (!userData.user.businessId) {
        // User doesn't have a business, show setup message
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
        setError('Please complete your business setup to start using the platform.');
        setLoading(false);
        return;
      }

      // Fetch all dashboard data from APIs
      const [metricsRes, campaignsRes, activitiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/daily-metrics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/campaigns?limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/recent-activity?limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const metrics = metricsRes.ok ? await metricsRes.json() : {
        totalMessages: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesReplied: 0,
        deliveryRate: 0,
        readRate: 0,
        replyRate: 0,
        messagesToday: 0
      };
      const campaignsData = campaignsRes.ok ? await campaignsRes.json() : { campaigns: [] };
      const activities = activitiesRes.ok ? await activitiesRes.json() : { activities: [] };

      setStats(metrics);
      setRecentCampaigns(campaignsData.campaigns || []);
      setRecentActivities(activities.activities || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'active': return 'var(--success)';
      case 'completed': return 'var(--text-secondary)';
      case 'scheduled': return 'var(--info)';
      case 'paused': return 'var(--warning)';
      case 'draft': return 'var(--text-tertiary)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'campaign_created': return '▶';
      case 'campaign_sent': return '✓';
      case 'template_approved': return '✓';
      case 'message_received': return '●';
      default: return '•';
    }
  };

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
            <div style={{ display: 'flex', gap: '8px' }}>
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
              Welcome back{user?.email ? `, ${user.email}` : ''}! Here's your overview.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-primary"><MdMessage /></div>
            <div className="stat-content">
              <p className="stat-label">Total Messages</p>
              <h2 className="stat-value">{formatNumber(stats?.totalMessages || 0)}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-success"><MdCheckCircle /></div>
            <div className="stat-content">
              <p className="stat-label">Delivered</p>
              <h2 className="stat-value">{formatNumber(stats?.messagesDelivered || 0)}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-info"><MdTrendingUp /></div>
            <div className="stat-content">
              <p className="stat-label">Read</p>
              <h2 className="stat-value">{formatNumber(stats?.messagesRead || 0)}</h2>
            </div>
          </Card>

          <Card className="stat-card" hoverable>
            <div className="stat-icon stat-icon-warning"><MdAnalytics /></div>
            <div className="stat-content">
              <p className="stat-label">Replies</p>
              <h2 className="stat-value">{formatNumber(stats?.messagesReplied || 0)}</h2>
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
                    onClick={() => navigate('/campaigns/create')}
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
                      onClick={() => navigate(`/campaigns/${campaign._id || campaign.id}`)}
                    >
                      <div className="campaign-info">
                        <h4>{campaign.name || 'Untitled Campaign'}</h4>
                        <p className="campaign-meta">
                          <span 
                            className="status-badge"
                            style={{ color: getStatusColor(campaign.status) }}
                          >
                            {campaign.status || 'Draft'}
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
                        <p className="activity-text">{activity.description || activity.message}</p>
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
            <Card className="quick-action-card" hoverable onClick={() => navigate('/inbox')}>
              <div className="quick-action-icon"><MdMessage /></div>
              <h3>Inbox</h3>
              <p>Manage conversations</p>
            </Card>
            
            {/* Templates - Manager and above */}
            {hasPermissionTo(PERMISSIONS.MANAGE_TEMPLATES) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate('/templates')}>
                <div className="quick-action-icon"><MdDescription /></div>
                <h3>Templates</h3>
                <p>Message templates</p>
              </Card>
            )}
            
            {/* Analytics - Manager and above */}
            {hasPermissionTo(PERMISSIONS.VIEW_ANALYTICS) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate('/analytics')}>
                <div className="quick-action-icon"><MdAnalytics /></div>
                <h3>Analytics</h3>
                <p>View insights</p>
              </Card>
            )}
            
            {/* Campaigns - Manager and above */}
            {hasPermissionTo(PERMISSIONS.CREATE_CAMPAIGNS) && (
              <Card className="quick-action-card" hoverable onClick={() => navigate('/campaigns')}>
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
            {user?.role === ROLES.SUPER_ADMIN && (
              <Card className="quick-action-card" hoverable onClick={() => navigate('/roles')}>
                <div className="quick-action-icon"><MdSecurity /></div>
                <h3>Access Control</h3>
                <p>Manage roles & permissions</p>
              </Card>
            )}
            
            {/* Contacts - All users */}
            <Card className="quick-action-card" hoverable onClick={() => navigate('/contacts')}>
              <div className="quick-action-icon"><MdContacts /></div>
              <h3>Contacts</h3>
              <p>Manage contacts</p>
            </Card>
            
            {/* Settings - All users */}
            <Card className="quick-action-card" hoverable onClick={() => navigate('/settings')}>
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





