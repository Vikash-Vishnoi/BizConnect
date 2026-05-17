/**
 * ⚠️ Errors & Alerts Monitoring Page
 * 
 * @component ErrorsAndAlerts
 * 
 * @description
 * Unified monitoring interface for tracking and managing message delivery errors
 * and system alerts. Features tabbed navigation with comprehensive filtering,
 * statistics dashboard, and action capabilities (retry, dismiss, acknowledge, resolve).
 * 
 * @features
 * - Tab-based interface with pill-style navigation (Message Errors | System Alerts)
 * - Message errors tracking with retry/dismiss actions
 * - System alerts monitoring with acknowledge/resolve workflow
 * - Real-time statistics dashboard for both tabs
 * - Advanced filtering (error type, alert severity)
 * - Pagination for message errors
 * - Empty states for better UX
 * - Responsive design matching PhoneHealth patterns
 * 
 * @state
 * - activeTab: Current view ('errors' | 'alerts')
 * - errors: Failed message records with retry/dismiss state
 * - alerts: System alert records with acknowledgment/resolution state
 * - errorFilter: Active error type filter
 * - alertFilter: Active alert severity filter
 * - currentPage: Pagination state for errors
 * - alertStats: Statistics for alert severity levels
 * 
 * @api
 * Message Errors:
 * - GET /messages/failed - Fetch failed messages with pagination
 * - POST /messages/:id/retry - Queue message for retry
 * - PUT /messages/:id/dismiss - Dismiss error record
 * 
 * System Alerts:
 * - GET /alerts - Fetch system alerts with filters
 * - GET /alerts/stats - Retrieve alert statistics
 * - PUT /alerts/:id/acknowledge - Mark alert as acknowledged
 * - PUT /alerts/:id/resolve - Mark alert as resolved
 * 
 * @routes
 * - /errors-alerts - Main monitoring interface
 * 
 * @example
 * // Route configuration
 * <Route path="/errors-alerts" element={<ErrorsAndAlerts />} />
 */

// ============================================
// IMPORTS
// ============================================

// React & Routing
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Icons
import { 
  MdBarChart, 
  MdLoop, 
  MdClose, 
  MdError, 
  MdCheckCircle,
  MdAccessTime
} from 'react-icons/md';

// Components
import Navbar from '../../components/Navbar';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorCard from '../../components/cards/ErrorCard';
import AlertCard from '../../components/cards/AlertCard';

// Contexts & Services
import { useToast } from '../../components/Toast';
import * as alertService from '../../services/core/alertService';
import { get, post, put } from '../../services/api';

// Constants & Utils
import { 
  ERROR_TYPES, 
  PAGINATION_CONFIG, 
  TABS,
  ALERT_SEVERITIES 
} from '../../constants/errorAlertsConstants';
import { 
  getErrorIcon, 
  getErrorColor,
  getSeverityIcon,
  getSeverityColor
} from '../../utils/errorAlertsUtils';

// Styles
import '../../components/Stats.css';
import './ErrorsAndAlerts.css';

// ============================================
// MAIN COMPONENT
// ============================================

const ErrorsAndAlerts = () => {
  // ============================================
  // HOOKS
  // ============================================
  
  const toast = useToast();
  const navigate = useNavigate();

  // ============================================
  // STATE - Tab & View Management
  // ============================================
  
  const [activeTab, setActiveTab] = useState(TABS.ERRORS);

  // ============================================
  // STATE - Message Errors
  // ============================================
  
  const [errors, setErrors] = useState([]);
  const [errorsLoading, setErrorsLoading] = useState(true);
  const [errorFilter, setErrorFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorStats, setErrorStats] = useState(null);

  // ============================================
  // STATE - System Alerts
  // ============================================
  
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertFilter, setAlertFilter] = useState('all');
  const [alertStats, setAlertStats] = useState(null);

  // ============================================
  // HELPERS
  // ============================================

  const filterErrorsByType = useCallback((errorsList, type) => {
    if (type === 'all') return errorsList;
    const normalized = type?.toUpperCase();
    return (errorsList || []).filter(err => (err?.errorType || '').toUpperCase() === normalized);
  }, []);

  // ============================================
  // EFFECTS - Data Fetching
  // ============================================
  
  // Fetch errors when tab/filter/page changes
  useEffect(() => {
    if (activeTab === TABS.ERRORS) {
      fetchErrors();
    }
  }, [activeTab, errorFilter, currentPage]);

  // Fetch alerts when tab/filter changes
  useEffect(() => {
    if (activeTab === TABS.ALERTS) {
      fetchAlerts();
    }
  }, [activeTab, alertFilter]);

  // ============================================
  // MESSAGE ERROR HANDLERS
  // ============================================
  
  /**
   * Fetch failed messages with pagination and filters
   */
  const fetchErrors = async () => {
    setErrorsLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: PAGINATION_CONFIG.ERRORS_PER_PAGE
      };
      
      if (errorFilter !== 'all') {
        params.errorType = errorFilter;
      }

      const response = await get('/messages/failed', params);
      const rawErrors = response.messages || response.data?.messages || [];
      const filteredErrors = filterErrorsByType(rawErrors, errorFilter);
      const totalFromApi = response.totalPages || response.data?.totalPages;
      const derivedPages = Math.max(1, Math.ceil(filteredErrors.length / PAGINATION_CONFIG.ERRORS_PER_PAGE));

      setErrors(filteredErrors);
      setTotalPages(errorFilter === 'all' && totalFromApi ? totalFromApi : derivedPages);
      setErrorStats(response.stats || response.data?.stats);
    } catch (error) {
      console.error('Failed to fetch errors:', error);
      toast.error('Failed to load message errors');
      setErrors([]);
    } finally {
      setErrorsLoading(false);
    }
  };

  /**
   * Retry a failed message
   * @param {string} messageId - Message ID to retry
   */
  // Retry and dismiss actions removed per request

  // ============================================
  // SYSTEM ALERT HANDLERS
  // ============================================
  
  /**
   * Fetch system alerts with filters
   */
  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      let response;
      let statsResponse;

      if (alertFilter === 'all') {
        response = await alertService.getAlerts();
      } else if (alertFilter === 'unresolved') {
        response = await alertService.getAlerts({ resolved: false });
      } else {
        response = await alertService.getAlerts({ severity: alertFilter.toUpperCase() });
      }

      statsResponse = await alertService.getAlertStats();
      
      // Extract alerts array from response
      const fetchedAlerts = response?.data?.alerts || response?.alerts || response || [];
      const stats = statsResponse?.data || statsResponse;
      
      setAlerts(Array.isArray(fetchedAlerts) ? fetchedAlerts : []);
      setAlertStats(stats);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load alerts');
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID to acknowledge
   */
  const handleAcknowledge = async (alertId) => {
    try {
      await alertService.acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch (error) {
      console.error('Acknowledge failed:', error);
      toast.error(error.message || 'Failed to acknowledge alert');
    }
  };

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID to resolve
   */
  const handleResolve = async (alertId) => {
    try {
      await alertService.resolveAlert(alertId);
      toast.success('Alert resolved');
      fetchAlerts();
    } catch (error) {
      console.error('Resolve failed:', error);
      toast.error(error.message || 'Failed to resolve alert');
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  
  /**
   * Render tab navigation
   */
  const renderTabs = () => (
    <div className="tabs-container">
      <div className="errors-alerts-tabs" role="tablist" aria-label="Errors and alerts sections">
        <button
          className={`tab-btn ${activeTab === TABS.ERRORS ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.ERRORS)}
          role="tab"
          aria-selected={activeTab === TABS.ERRORS}
          aria-label="Message errors tab"
        >
          <MdError />
          Message Errors
        </button>
        <button
          className={`tab-btn ${activeTab === TABS.ALERTS ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.ALERTS)}
          role="tab"
          aria-selected={activeTab === TABS.ALERTS}
          aria-label="System alerts tab"
        >
          <MdBarChart />
          System Alerts
        </button>
      </div>
    </div>
  );

  /**
   * Render errors tab content
   */
  const renderErrorsTab = () => {
    if (errorsLoading) {
      return <LoadingSkeleton type="list" />;
    }

    return (
      <>
        {/* Statistics */}
        {errorStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--danger"><MdClose /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Total Errors</p>
                <div className="stat-card__value">{errorStats.total || 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--info"><MdLoop /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Retrying</p>
                <div className="stat-card__value">{errorStats.retrying || 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--success"><MdCheckCircle /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Dismissed</p>
                <div className="stat-card__value">{errorStats.dismissed || 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--warning"><MdAccessTime /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Last 24h</p>
                <div className="stat-card__value">{errorStats.last24h || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filters">
            {ERROR_TYPES.map((type) => {
              const ErrorIcon = type !== 'all' ? getErrorIcon(type) : null;
              const errorColor = type !== 'all' ? getErrorColor(type) : null;
              
              return (
                <button
                  key={type}
                  className={`filter-btn ${errorFilter === type ? 'active' : ''}`}
                  onClick={() => {
                    setErrorFilter(type);
                    setCurrentPage(1);
                  }}
                >
                  <>
                    {type !== 'all' && ErrorIcon && <ErrorIcon />}
                    {type === 'all' ? 'All Errors' : type.replace(/_/g, ' ')}
                  </>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error List */}
        {errors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MdCheckCircle style={{ fontSize: '80px', color: '#4CAF50' }} />
            </div>
            <h3>No message errors</h3>
            <p>All messages have been delivered successfully</p>
          </div>
        ) : (
          <>
            <div className="items-list">
                  {errors.map((error, index) => (
                    <ErrorCard
                      key={error?._id || error?.id || error?.messageId || `${error?.errorType || 'error'}-${error?.createdAt || error?.timestamp || 'unknown'}-${index}`}
                      error={error}
                    />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <div className="page-info">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  /**
   * Render alerts tab content
   */
  const renderAlertsTab = () => {
    if (alertsLoading) {
      return <LoadingSkeleton type="list" />;
    }

    return (
      <>
        {/* Statistics */}
        {alertStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--danger">{React.createElement(getSeverityIcon('CRITICAL'))}</div>
              <div className="stat-card__content">
                <p className="stat-card__label">Critical</p>
                <div className="stat-card__value">{alertStats.CRITICAL || 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--warning">{React.createElement(getSeverityIcon('HIGH'))}</div>
              <div className="stat-card__content">
                <p className="stat-card__label">High</p>
                <div className="stat-card__value">{alertStats.HIGH || 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--info">{React.createElement(getSeverityIcon('MEDIUM'))}</div>
              <div className="stat-card__content">
                <p className="stat-card__label">Medium</p>
                <div className="stat-card__value">{alertStats.MEDIUM || 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--success">{React.createElement(getSeverityIcon('LOW'))}</div>
              <div className="stat-card__content">
                <p className="stat-card__label">Low</p>
                <div className="stat-card__value">{alertStats.LOW || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filters">
            <button
              className={`filter-btn ${alertFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAlertFilter('all')}
            >
              All Alerts
            </button>
            <button
              className={`filter-btn ${alertFilter === 'unresolved' ? 'active' : ''}`}
              onClick={() => setAlertFilter('unresolved')}
            >
              Unresolved
            </button>
            <button
              className={`filter-btn ${alertFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setAlertFilter('critical')}
            >
              Critical Only
            </button>
          </div>
        </div>

        {/* Alert List */}
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MdCheckCircle style={{ fontSize: '80px', color: '#4CAF50' }} />
            </div>
            <h3>No alerts to display</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div className="items-list">
            {alerts.map((alert, index) => (
              <AlertCard
                key={alert?._id || alert?.id || `${alert?.severity || 'alert'}-${alert?.createdAt || alert?.timestamp || 'unknown'}-${index}`}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  
  return (
    <div className="page-container errors-alerts-page">
      <Navbar />
      <div className="page-content errors-alerts-content">
        {/* Header */}
        <div className="errors-alerts-header">
          <div className="errors-alerts-header-text">
            <h1 className="errors-alerts-title">
              <MdError style={{ verticalAlign: 'middle', marginRight: '8px' }} /> 
              Errors & Alerts
            </h1>
            <p className="errors-alerts-subtitle">
              Monitor message delivery issues and system notifications
            </p>
          </div>
        </div>

        {/* Tabs */}
        {renderTabs()}

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === TABS.ERRORS ? renderErrorsTab() : renderAlertsTab()}
        </div>
      </div>
    </div>
  );
};

export default ErrorsAndAlerts;
