/**
 * @fileoverview Audit log viewer for tracking user actions and system changes.
 * 
 * @component AuditLog
 * 
 * @description
 * Admin page that displays a comprehensive audit trail of all user actions and system events.
 * Features filtering by user, action type, and date range with paginated results.
 * 
 * @features
 * - Comprehensive audit log table with user actions
 * - Filtering by user email, action type, and date range
 * - Pagination for large datasets (20 logs per page)
 * - Action badges with color-coded severity
 * - User avatars and detailed action metadata
 * - Resource type and ID tracking
 * - IP address logging
 * - Timestamp display with locale formatting
 * - Clear filters functionality
 * 
 * @state
 * - logs: Array of audit log entries
 * - loading: Loading state for API requests
 * - filters: { user, action, startDate, endDate }
 * - currentPage: Current page number
 * - totalPages: Total pages for pagination
 * 
 * @api
 * - GET /analytics/audit-logs: Fetch paginated audit logs with filters
 * 
 * @routes
 * - /admin/audit-log: Audit log viewer page
 * 
 * @example
 * // Route configuration
 * <Route path="/admin/audit-log" element={<AuditLog />} />
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import { API_BASE_URL } from '../../config/api';
import { STORAGE_KEYS } from '../../config/constants';
import { MdSecurity, MdCheckCircle, MdError, MdRefresh, MdSearch, MdClose, MdFilterList } from 'react-icons/md';
import '../../components/Stats.css';
import './AuditLog.css';

/**
 * Pagination configuration constants
 * @constant {Object}
 */
const PAGINATION_CONFIG = {
  LOGS_PER_PAGE: 20
};

/**
 * Action types for audit log filtering
 * @constant {Array<string>}
 */
const ACTION_TYPES = [
  'ALL',
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'VIEW',
  'EXPORT'
];

/**
 * Action color mapping for visual indicators
 * @constant {Object}
 */
const ACTION_COLORS = {
  CREATE: '#4CAF50',
  UPDATE: '#2196F3',
  DELETE: '#F44336',
  LOGIN: '#4CAF50',
  LOGOUT: '#9E9E9E',
  VIEW: '#667eea',
  EXPORT: '#FF9800',
  DEFAULT: '#666'
};

/**
 * Action icon mapping for visual indicators
 * @constant {Object}
 */
const ACTION_ICONS = {
  CREATE: '+',
  UPDATE: '✏',
  DELETE: '×',
  LOGIN: '▶',
  LOGOUT: '■',
  VIEW: '●',
  EXPORT: '↑',
  DEFAULT: '•'
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failure: 0
  });
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  /**
   * Fetches audit logs from API with current filters and pagination
   */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const params = new URLSearchParams({
        page: currentPage,
        limit: PAGINATION_CONFIG.LOGS_PER_PAGE,
        ...(filters.user && { user: filters.user }),
        ...(filters.action && filters.action !== 'ALL' && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      console.log('Fetching audit logs with params:', params.toString());

      const response = await fetch(`${API_BASE_URL}/analytics/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        console.log('Logs count:', data.logs?.length);
        const logsData = data.logs || [];
        setLogs(logsData);
        setTotalPages(data.totalPages || 1);
        
        // Calculate stats
        setStats({
          total: data.pagination?.total || logsData.length,
          success: logsData.filter(log => log.status === 'SUCCESS').length,
          failure: logsData.filter(log => log.status === 'FAILURE').length
        });
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates filter state and resets pagination
   * @param {string} field - Filter field name
   * @param {string} value - Filter value
   */
  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setCurrentPage(1);
  };

  /**
   * Clears all filters and resets pagination
   */
  const handleClearFilters = () => {
    setFilters({ user: '', action: '', startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  /**
   * Returns the icon symbol for an action type
   * @param {string} action - Action type
   * @returns {string} Icon symbol
   */
  const getActionIcon = (action) => {
    const key = action?.toUpperCase();
    return ACTION_ICONS[key] || ACTION_ICONS.DEFAULT;
  };

  /**
   * Returns the color code for an action type
   * @param {string} action - Action type
   * @returns {string} CSS color code
   */
  const getActionColor = (action) => {
    const key = action?.toUpperCase();
    return ACTION_COLORS[key] || ACTION_COLORS.DEFAULT;
  };

  /**
   * Formats timestamp for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && currentPage === 1) {
    return (
      <>
        <Navbar />
        <div className="audit-log-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading audit logs...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="audit-log-page page-container">
        <div className="audit-log-page-content">
          {/* Header */}
          <div className="audit-log-header">
            <div className="audit-log-header-text" style={{ textAlign: 'center', width: '100%' }}>
              <h1 className="audit-log-title">Audit Log</h1>
              <p className="audit-log-subtitle">Track all user actions and system changes • {logs.length} shown of {stats.total} total</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--primary"><MdSecurity /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Total Events</p>
                <div className="stat-card__value">{stats.total || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--success"><MdCheckCircle /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Successful</p>
                <div className="stat-card__value">{stats.success || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--danger"><MdError /></div>
              <div className="stat-card__content">
                <p className="stat-card__label">Failed</p>
                <div className="stat-card__value">{stats.failure || 0}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="filters-card">
            <div className="filter-section">
              <span className="filter-label"><MdFilterList /> Filters:</span>
              <div className="filter-row">
                <div className="filter-group">
                  <label>User</label>
                  <input
                    type="text"
                    placeholder="Search by user email..."
                    value={filters.user}
                    onChange={(e) => handleFilterChange('user', e.target.value)}
                    aria-label="Search by user"
                  />
                </div>
                <div className="filter-group">
                  <label>Action Type</label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    aria-label="Filter by action type"
                  >
                    {ACTION_TYPES.map(type => (
                      <option key={type} value={type === 'ALL' ? '' : type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
                <button className="filter-clear-btn" onClick={handleClearFilters}>
                  <MdRefresh /> Clear
                </button>
              </div>
            </div>
          </Card>

          {/* Audit Logs Table */}
          <Card className="logs-table-card">
            {logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No audit logs found</h3>
                <p>No logs match your current filters</p>
              </div>
            ) : (
              <div className="logs-table-container">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Status</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td className="timestamp-cell">
                          {formatDate(log.timestamp || log.createdAt)}
                        </td>
                        <td className="user-cell">
                          <div className="user-info">
                            <span className="user-avatar">
                              {log.userId?.email?.[0]?.toUpperCase() || '?'}
                            </span>
                            <div>
                              <div className="user-name">{log.userId?.name || 'Unknown'}</div>
                              <div className="user-email">{log.userId?.email || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="action-cell">
                          <span 
                            className="action-badge"
                            style={{ 
                              background: `${getActionColor(log.action)}20`,
                              color: getActionColor(log.action)
                            }}
                          >
                            {getActionIcon(log.action)} {log.action}
                          </span>
                        </td>
                        <td className="resource-cell">
                          <div className="resource-type">{log.resourceType || 'N/A'}</div>
                          {log.resourceId && (
                            <div className="resource-id">{log.resourceId.substring(0, 8)}...</div>
                          )}
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge status-${log.status?.toLowerCase()}`}>
                            {log.status || 'N/A'}
                          </span>
                        </td>
                        <td className="ip-cell">
                          {log.ipAddress || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

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
        </div>
      </div>
    </>
  );
};

export default AuditLog;

