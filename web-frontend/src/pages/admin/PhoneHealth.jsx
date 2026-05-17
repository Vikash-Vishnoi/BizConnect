/**
 * 📱 Phone Health Status Page
 * 
 * Admin page for monitoring WhatsApp Business API phone number health and quality rating.
 * Displays health score, quality metrics, messaging limits, and actionable recommendations.
 * 
 * @component
 * 
 * @description
 * This page provides comprehensive monitoring of WhatsApp Business phone number health,
 * including quality rating (GREEN/YELLOW/RED), health score percentage, messaging limits,
 * and quality metrics. Supports manual health checks and displays recommendations.
 * 
 * @features
 * - Real-time phone health monitoring
 * - Quality rating display (GREEN/YELLOW/RED) with color-coded indicators
 * - Health score percentage (0-100%) with color-coded status
 * - Messaging limit and tier tracking
 * - Quality metrics history (previous rating, last updated)
 * - Account information (mode, certificate)
 * - Manual health check with loading state
 * - Actionable recommendations list
 * - Business setup requirement check
 * - Refresh functionality
 * - Empty state for first-time setup
 * 
 * @state
 * - loading: Initial data loading state
 * - health: Phone health data object (score, rating, limits, status)
 * - recommendations: Array of improvement recommendations
 * - checking: Health check in progress state
 * 
 * @api
 * - GET /business/phone-health - Fetches current health data
 * - POST /business/phone-health/check - Runs manual health check
 * 
 * @routes
 * - /admin/phone-health - Main phone health monitoring page
 * 
 * @example
 * // Health object structure
 * {
 *   healthScore: 85,
 *   qualityRating: 'GREEN',
 *   status: 'CONNECTED',
 *   displayPhoneNumber: '+1234567890',
 *   messagingLimit: 1000,
 *   limitTier: 'TIER_1K',
 *   previousRating: 'YELLOW',
 *   lastUpdated: '2024-01-20T10:30:00Z',
 *   accountMode: 'LIVE',
 *   certificate: 'valid'
 * }
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as phoneHealthService from '../../services/business/phoneHealthService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { 
  MdPhone, MdCheckCircle, MdWarning, MdError, MdRefresh, MdPlayArrow, 
  MdSpeed, MdTrendingUp, MdPhoneIphone, MdSignalCellularAlt, MdExpandMore, 
  MdExpandLess, MdBarChart, MdSend, MdDoneAll, MdLightbulb, MdTimeline, MdAnalytics, 
  MdArrowBack 
} from 'react-icons/md';
import '../../components/Stats.css';
import './PhoneHealth.css';

/**
 * Tab options for navigation
 * @constant {Object}
 */
const TAB_OPTIONS = {
  CURRENT_HEALTH: 'current_health',
  QUALITY_HISTORY: 'quality_history'
};

/**
 * Date range filter options
 * @constant {Array<Object>}
 */
const DATE_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' }
];

/**
 * Quality rating configuration with icons and colors
 * @constant {Object}
 */
const QUALITY_RATINGS = {
  GREEN: {
    icon: MdCheckCircle,
    color: '#4CAF50',
    label: 'High Quality',
    description: 'High quality - Excellent messaging performance'
  },
  YELLOW: {
    icon: MdWarning,
    color: '#FF9800',
    label: 'Medium Quality',
    description: 'Medium quality - Monitor your messaging practices'
  },
  RED: {
    icon: MdError,
    color: '#F44336',
    label: 'Low Quality',
    description: 'Low quality - Immediate action required'
  },
  UNKNOWN: {
    icon: MdError,
    color: '#9E9E9E',
    label: 'Unknown',
    description: 'Quality status unknown'
  }
};

/**
 * Health score thresholds for color coding
 * @constant {Object}
 */
const HEALTH_THRESHOLDS = {
  GOOD: 80,
  WARNING: 50
};

/**
 * Health score colors by threshold
 * @constant {Object}
 */
const HEALTH_COLORS = {
  GOOD: '#4CAF50',
  WARNING: '#FF9800',
  CRITICAL: '#F44336'
};

const PhoneHealth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { historyId } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_OPTIONS.CURRENT_HEALTH);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [health, setHealth] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [checking, setChecking] = useState(false);
  
  // Quality History State
  const [history, setHistory] = useState([]);
  const [dateRange, setDateRange] = useState('30d');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState({});

  /**
   * Toggle expansion of timeline entry
   * @param {string} entryId - Entry ID or index
   */
  const toggleEntry = (entryId) => {
    setExpandedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  useEffect(() => {
    if (user?.businessId) {
      if (historyId) {
        fetchHistoricalHealthData(historyId);
        setViewingHistory(true);
      } else {
        fetchHealthData();
        fetchQualityHistory();
        setViewingHistory(false);
      }
    }
  }, [user?.businessId, historyId]);

  useEffect(() => {
    if (user?.businessId) {
      fetchQualityHistory();
    }
  }, [dateRange]);

  /**
   * Fetches historical health data by ID
   */
  const fetchHistoricalHealthData = async (id) => {
    setLoading(true);
    try {
      const response = await phoneHealthService.getQualityHistory({ dateRange: 'all' });
      if (response.success && response.data) {
        const historyEntry = response.data.history.find(h => h._id === id);
        console.log('📊 History Entry Found:', historyEntry);
        
        if (historyEntry) {
          // Map history entry fields to health data structure
          const healthData = {
            // Quality fields
            qualityRating: historyEntry.rating || historyEntry.qualityRating || 'UNKNOWN',
            qualityScore: historyEntry.score || historyEntry.qualityScore || 'UNKNOWN',
            previousRating: historyEntry.previousRating,
            lastQualityUpdate: historyEntry.timestamp,
            
            // Messaging fields
            messagingLimit: historyEntry.messagingLimit,
            currentUsage: historyEntry.currentUsage,
            messagingLimitTier: historyEntry.tier || historyEntry.messagingLimitTier,
            
            // Account fields
            displayPhoneNumber: historyEntry.displayPhoneNumber,
            phoneNumberId: historyEntry.phoneNumberId,
            wabaId: historyEntry.wabaId,
            verifiedName: historyEntry.verifiedName,
            nameStatus: historyEntry.nameStatus,
            codeVerificationStatus: historyEntry.codeVerificationStatus,
            accountMode: historyEntry.accountMode,
            status: historyEntry.status,
            isOfficialBusinessAccount: historyEntry.isOfficialBusinessAccount,
            isPinEnabled: historyEntry.isPinEnabled,
            throughput: historyEntry.throughput,
            platformType: historyEntry.platformType,
            lastUpdated: historyEntry.timestamp,
            
            // Keep original timestamp
            timestamp: historyEntry.timestamp,
            createdAt: historyEntry.createdAt
          };
          
          console.log('📊 Mapped Health Data:', healthData);
          setHealth(healthData);
          setRecommendations(historyEntry.recommendations || []);
        } else {
          toast.error('Historical health data not found');
          navigate('/phone-health');
        }
      }
    } catch (error) {
      console.error('Failed to fetch historical health data:', error);
      toast.error('Failed to load historical health data');
      navigate('/phone-health');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches quality rating history from API
   */
  const fetchQualityHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await phoneHealthService.getQualityHistory({ dateRange });
      if (response.success && response.data) {
        setHistory(response.data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch quality history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  /**
   * Helper to format status strings to be more readable
   * e.g. "CONNECTED" -> "Connected"
   */
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  /**
   * Helper to format messaging tier
   * e.g. "TIER_1K" -> "1k Messages/Day"
   */
  const formatTier = (tier) => {
    if (!tier) return 'Unknown';
    if (tier === 'TIER_1K') return '1k Messages/Day';
    if (tier === 'TIER_10K') return '10k Messages/Day';
    if (tier === 'TIER_100K') return '100k Messages/Day';
    if (tier === 'TIER_UNLIMITED') return 'Unlimited Messages';
    return formatStatus(tier);
  };

  /**
   * Helper to format verification status
   */
  const formatVerification = (status) => {
    if (status === 'VERIFIED') return 'Verified';
    if (status === 'NOT_VERIFIED') return 'Not Verified';
    if (status === 'EXPIRED') return 'Expired';
    return formatStatus(status);
  };

  /**
   * Fetches current phone health data from API
   * 
   * @async
   * @function fetchHealthData
   * @returns {Promise<void>}
   */
  const fetchHealthData = async () => {
    setRefreshing(true);
    try {
      const response = await phoneHealthService.getPhoneHealth();
      if (response.success && response.data) {
        setHealth(response.data.health);
        // Recommendations are not currently returned by this endpoint
        setRecommendations([]); 
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      
      // Check if error is due to missing business context (422)
      if (error.response?.status === 422 || error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message;
        if (errorMsg && errorMsg.includes('Business context')) {
          toast.error('Please complete business setup first');
          setTimeout(() => {
            navigate('/business/create');
          }, 1500);
          return;
        }
      }
      
      toast.error('Failed to load phone health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Runs manual health check and updates health data
   * 
   * @async
   * @function runHealthCheck
   * @returns {Promise<void>}
   */
  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const response = await phoneHealthService.checkPhoneHealth();
      if (response.success && response.data) {
        setHealth(response.data.health);
        setRecommendations([]);
        toast.success('✅ Health check completed successfully');
      }
    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Failed to run health check');
    } finally {
      setChecking(false);
    }
  };

  /**
   * Gets quality rating icon component based on rating
   * 
   * @function getQualityIcon
   * @param {string} rating - Quality rating (GREEN, YELLOW, RED)
   * @returns {JSX.Element} Icon component with color styling
   */
  const getQualityIcon = (rating) => {
    const iconStyle = { fontSize: '24px' };
    const config = QUALITY_RATINGS[rating] || QUALITY_RATINGS.UNKNOWN;
    const Icon = config.icon;
    return <Icon style={{ ...iconStyle, color: config.color }} />;
  };

  /**
   * Gets quality rating color
   * 
   * @function getQualityColor
   * @param {string} rating - Quality rating (GREEN, YELLOW, RED)
   * @returns {string} Hex color code
   */
  const getQualityColor = (rating) => {
    return (QUALITY_RATINGS[rating] || QUALITY_RATINGS.UNKNOWN).color;
  };

  /**
   * Gets quality rating label
   */
  const getQualityLabel = (rating) => {
    return (QUALITY_RATINGS[rating] || QUALITY_RATINGS.UNKNOWN).label;
  };

  /**
   * Gets health score color based on threshold
   * 
   * @function getHealthScoreColor
   * @param {number} score - Health score (0-100)
   * @returns {string} Hex color code (green/orange/red)
   */
  const getHealthScoreColor = (score) => {
    if (score >= HEALTH_THRESHOLDS.GOOD) return HEALTH_COLORS.GOOD;
    if (score >= HEALTH_THRESHOLDS.WARNING) return HEALTH_COLORS.WARNING;
    return HEALTH_COLORS.CRITICAL;
  };

  /**
   * Formats date string to localized format
   */
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
            message="Please complete your business setup to view phone health."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container phone-health-page">
        <Navbar />
        <div className="phone-health-content">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container phone-health-page">
      <Navbar />
      <div className="page-content phone-health-content">
        {/* Header */}
        <div className="phone-health-header">
          <div className="phone-health-header-text" style={{ 
            textAlign: 'center', 
            width: '100%', 
            flex: 1 
          }}>
            <h1 className="phone-health-title">
              <MdPhoneIphone /> {viewingHistory ? 'Historical Phone Health' : 'Phone Health'}
            </h1>
            <p className="phone-health-subtitle">
              {viewingHistory 
                ? `Health snapshot from ${health ? formatDate(health.timestamp || health.lastUpdated || health.createdAt) : ''}`
                : 'Monitor your WhatsApp Business API phone number quality and status'
              }
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        {health && (
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
        )}

        {/* Main Panel with Tabs */}
        <Card padding="lg" className="phone-health-panel">
          {!viewingHistory && (
            <div className="phone-health-panel__header">
              <div className="phone-health-tabs" role="tablist" aria-label="Phone health sections">
              <button
                className={`tab-btn ${activeTab === TAB_OPTIONS.CURRENT_HEALTH ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB_OPTIONS.CURRENT_HEALTH)}
                role="tab"
                aria-selected={activeTab === TAB_OPTIONS.CURRENT_HEALTH}
                aria-label="Current health tab"
              >
                Current Health
              </button>
              <button
                className={`tab-btn ${activeTab === TAB_OPTIONS.QUALITY_HISTORY ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB_OPTIONS.QUALITY_HISTORY)}
                role="tab"
                aria-selected={activeTab === TAB_OPTIONS.QUALITY_HISTORY}
                aria-label="Quality history tab"
              >
                Quality History ({history.length})
              </button>
            </div>
            
            <div className="phone-health-panel__actions">
              {activeTab === TAB_OPTIONS.CURRENT_HEALTH ? (
                <Button 
                  variant="primary"
                  onClick={runHealthCheck}
                  disabled={checking}
                  icon={checking ? <MdPlayArrow className="spin" /> : <MdPlayArrow />}
                  size="small"
                >
                  {checking ? 'Checking...' : 'Run Health Check'}
                </Button>
              ) : (
                <select 
                  className="date-range-select"
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)}
                  aria-label="Select date range for quality history"
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              )}
            </div>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner" aria-hidden="true"></div>
              <p>Loading phone health...</p>
            </div>
          ) : (
            <div
              className="phone-health-content-panel"
              role="tabpanel"
              aria-label={viewingHistory ? 'Historical health details' : (activeTab === TAB_OPTIONS.CURRENT_HEALTH ? 'Current health details' : 'Quality history timeline')}
            >
              {viewingHistory || activeTab === TAB_OPTIONS.CURRENT_HEALTH ? (
                // Current Health Tab Content
                <>
                  {health ? (
                    <>
                      {/* Health Details */}
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

                      {/* Recommendations */}
                      {recommendations.length > 0 && (
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
                  ) : (
                    <div className="empty-state">
                      <MdPhone className="empty-icon" />
                      <h3>No Health Data Available</h3>
                      <p>Run a health check to see your phone number status</p>
                      <Button 
                        variant="primary"
                        onClick={runHealthCheck}
                        icon={<MdPlayArrow />}
                      >
                        Run Health Check
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                // Quality History Tab Content
                <>
                  {historyLoading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading history...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="empty-state">
                      <MdBarChart className="empty-icon" />
                      <h3>No quality rating history</h3>
                      <p>Quality rating history will appear here as data becomes available</p>
                    </div>
                  ) : (
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
                                {Math.round((history.filter(h => h.rating === 'GREEN').length / history.length) * 100)}% of total
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
                                {Math.round((history.filter(h => h.rating === 'YELLOW').length / history.length) * 100)}% of total
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
                                {Math.round((history.filter(h => h.rating === 'RED').length / history.length) * 100)}% of total
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
                                    
                                    {false && (
                                      <div className="timeline-details">
                                        {/* Quality Metrics */}
                                        <div className="timeline-section">
                                          <h4 className="timeline-section-title"><MdTrendingUp /> Quality Metrics</h4>
                                          <div className="timeline-detail-grid">
                                            <div className="timeline-detail-item">
                                              <span className="timeline-detail-label">Quality Score</span>
                                              <span className="timeline-detail-value" style={{ color: getQualityColor(entry.qualityScore) }}>
                                                {entry.qualityScore || 'N/A'}
                                              </span>
                                            </div>
                                            <div className="timeline-detail-item">
                                              <span className="timeline-detail-label">Quality Rating</span>
                                              <span className="timeline-detail-value" style={{ color: config.color }}>
                                                {entry.rating}
                                              </span>
                                            </div>
                                            {entry.previousRating && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Previous Rating</span>
                                                <span className="timeline-detail-value" style={{ color: getQualityColor(entry.previousRating) }}>
                                                  {entry.previousRating}
                                                </span>
                                              </div>
                                            )}
                                            {entry.messagingLimit && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Messaging Limit</span>
                                                <span className="timeline-detail-value">
                                                  {entry.messagingLimit.toLocaleString()} / day
                                                </span>
                                              </div>
                                            )}
                                            {entry.currentUsage !== undefined && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Usage</span>
                                                <span className="timeline-detail-value">
                                                  {entry.currentUsage.toLocaleString()}
                                                </span>
                                              </div>
                                            )}
                                            {entry.messagingLimitTier && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Tier</span>
                                                <span className="timeline-detail-value">
                                                  {formatTier(entry.messagingLimitTier)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Account Details */}
                                        <div className="timeline-section">
                                          <h4 className="timeline-section-title"><MdPhoneIphone /> Account Details</h4>
                                          <div className="timeline-detail-grid">
                                            {entry.displayPhoneNumber && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Phone Number</span>
                                                <span className="timeline-detail-value">{entry.displayPhoneNumber}</span>
                                              </div>
                                            )}
                                            {entry.verifiedName && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Verified Name</span>
                                                <span className="timeline-detail-value">{entry.verifiedName}</span>
                                              </div>
                                            )}
                                            {entry.status && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Status</span>
                                                <span className="timeline-detail-value" style={{ 
                                                  color: entry.status === 'CONNECTED' ? '#4CAF50' : '#F44336'
                                                }}>
                                                  {formatStatus(entry.status)}
                                                </span>
                                              </div>
                                            )}
                                            {entry.nameStatus && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Name Status</span>
                                                <span className="timeline-detail-value">{formatStatus(entry.nameStatus)}</span>
                                              </div>
                                            )}
                                            {entry.codeVerificationStatus && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Code Verification</span>
                                                <span className="timeline-detail-value" style={{ 
                                                  color: entry.codeVerificationStatus === 'VERIFIED' ? '#4CAF50' : '#F44336'
                                                }}>
                                                  {formatVerification(entry.codeVerificationStatus)}
                                                </span>
                                              </div>
                                            )}
                                            {entry.accountMode && (
                                              <div className="timeline-detail-item">
                                                <span className="timeline-detail-label">Account Mode</span>
                                                <span className="timeline-detail-value" style={{ 
                                                  color: entry.accountMode === 'LIVE' ? '#4CAF50' : '#FF9800'
                                                }}>
                                                  {formatStatus(entry.accountMode)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Additional Info */}
                                        {(entry.reason || (entry.recommendations && entry.recommendations.length > 0)) && (
                                          <div className="timeline-section">
                                            <h4 className="timeline-section-title"><MdLightbulb /> Additional Information</h4>
                                            {entry.reason && (
                                              <div className="timeline-reason">
                                                <strong>Reason:</strong> {entry.reason}
                                              </div>
                                            )}
                                            {entry.recommendations && entry.recommendations.length > 0 && (
                                              <div className="timeline-recommendations">
                                                <strong>Recommendations:</strong>
                                                <ul>
                                                  {entry.recommendations.map((rec, i) => (
                                                    <li key={i}>{rec}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PhoneHealth;
