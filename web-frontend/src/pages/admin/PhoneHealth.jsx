/**
 * 📱 Phone Health Status Page
 * 
 * Admin page for monitoring WhatsApp Business API phone number health and quality rating.
 * Displays health score, quality metrics, messaging limits, and actionable recommendations.
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
import { MdPhoneIphone, MdPlayArrow, MdBarChart, MdPhone } from 'react-icons/md';
import '../../components/Stats.css';
import './PhoneHealth.css';

// Import extracted components and constants
import { TAB_OPTIONS, DATE_RANGES, formatDate } from './PhoneHealth/constants';
import StatsGrid from './PhoneHealth/components/StatsGrid';
import CurrentHealthTab from './PhoneHealth/components/CurrentHealthTab';
import QualityHistoryTab from './PhoneHealth/components/QualityHistoryTab';

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

  const fetchHistoricalHealthData = async (id) => {
    setLoading(true);
    try {
      const response = await phoneHealthService.getQualityHistory({ dateRange: 'all' });
      if (response.success && response.data) {
        const historyEntry = response.data.history.find(h => h._id === id);
        if (historyEntry) {
          const healthData = {
            qualityRating: historyEntry.rating || historyEntry.qualityRating || 'UNKNOWN',
            qualityScore: historyEntry.score || historyEntry.qualityScore || 'UNKNOWN',
            previousRating: historyEntry.previousRating,
            lastQualityUpdate: historyEntry.timestamp,
            messagingLimit: historyEntry.messagingLimit,
            currentUsage: historyEntry.currentUsage,
            messagingLimitTier: historyEntry.tier || historyEntry.messagingLimitTier,
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
            timestamp: historyEntry.timestamp,
            createdAt: historyEntry.createdAt
          };
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

  const fetchHealthData = async () => {
    setRefreshing(true);
    try {
      const response = await phoneHealthService.getPhoneHealth();
      if (response.success && response.data) {
        setHealth(response.data.health);
        setRecommendations([]); 
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
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
        <div className="phone-health-header">
          <div className="phone-health-header-text" style={{ textAlign: 'center', width: '100%', flex: 1 }}>
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

        <StatsGrid health={health} />

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
            <div className="phone-health-content-panel">
              {viewingHistory || activeTab === TAB_OPTIONS.CURRENT_HEALTH ? (
                <>
                  {health ? (
                    <CurrentHealthTab health={health} recommendations={recommendations} />
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
                    <QualityHistoryTab 
                      history={history} 
                      expandedEntries={expandedEntries}
                      toggleEntry={toggleEntry}
                    />
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
