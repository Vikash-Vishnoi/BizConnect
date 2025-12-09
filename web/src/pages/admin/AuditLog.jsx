import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { API_BASE_URL } from '../../config/api';
import './AuditLog.css';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 20;

  const actionTypes = [
    'ALL',
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'VIEW',
    'EXPORT'
  ];

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: logsPerPage,
        ...(filters.user && { user: filters.user }),
        ...(filters.action && filters.action !== 'ALL' && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`${API_BASE_URL}/analytics/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ user: '', action: '', startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  const getActionIcon = (action) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return '+';
      case 'UPDATE': return '✏';
      case 'DELETE': return '×';
      case 'LOGIN': return '▶';
      case 'LOGOUT': return '■';
      case 'VIEW': return '●';
      case 'EXPORT': return '↑';
      default: return '•';
    }
  };

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return '#4CAF50';
      case 'UPDATE': return '#2196F3';
      case 'DELETE': return '#F44336';
      case 'LOGIN': return '#4CAF50';
      case 'LOGOUT': return '#9E9E9E';
      case 'VIEW': return '#667eea';
      case 'EXPORT': return '#FF9800';
      default: return '#666';
    }
  };

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
      <div className="audit-log-container">
        <div className="audit-log-header">
          <div>
            <h1>Audit Log</h1>
            <p>Track all user actions and system changes</p>
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>User</label>
            <input
              type="text"
              placeholder="Search audit logs by user email or action type"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              {actionTypes.map(type => (
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
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            🔄 Clear Filters
          </button>
        </div>

        <div className="logs-table-container">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No audit logs found</h3>
              <p>No logs match your current filters</p>
            </div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
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
                          {log.user?.email?.[0]?.toUpperCase() || '?'}
                        </span>
                        <div>
                          <div className="user-name">{log.user?.name || 'Unknown'}</div>
                          <div className="user-email">{log.user?.email || 'N/A'}</div>
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
                    <td className="details-cell">
                      {log.details || log.description || 'No details'}
                    </td>
                    <td className="ip-cell">
                      {log.ipAddress || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
    </>
  );
};

export default AuditLog;

