/**
 * 📊 Template Analytics Page
 * 
 * Comprehensive analytics dashboard for message template performance tracking.
 * Displays usage statistics, delivery rates, read rates, and performance insights.
 * 
 * @component
 * 
 * @description
 * This page provides detailed analytics for WhatsApp message templates, including
 * usage counts, success rates, read rates, and performance indicators. Supports
 * date range filtering and multiple sorting options.
 * 
 * @features
 * - Template performance tracking with usage counts
 * - Success rate calculation (delivered/sent ratio)
 * - Read rate calculation (read/delivered ratio)
 * - Date range filtering (7d, 30d, 90d, all time)
 * - Multiple sorting options (usage, success, read, recent)
 * - Summary statistics cards (active templates, total sent/delivered/read)
 * - Performance indicators (excellent/good/needs work)
 * - Insights section with top performers
 * - Color-coded rate bars for visual feedback
 * - Category badges for template categorization
 * - Empty state for no analytics data
 * 
 * @state
 * - templates: Array of template analytics data
 * - loading: Initial data loading state
 * - dateRange: Selected date range filter (7d, 30d, 90d, all)
 * - sortBy: Selected sorting option (usage, success, read, recent)
 * 
 * @api
 * - GET /templates/analytics - Fetches template analytics with filters
 * 
 * @routes
 * - /analytics/templates - Template performance analysis page
 * 
 * @example
 * // Template analytics object structure
 * {
 *   _id: 'template_id',
 *   name: 'Welcome Message',
 *   category: 'MARKETING',
 *   status: 'APPROVED',
 *   usageCount: 150,
 *   sent: 150,
 *   delivered: 145,
 *   read: 120
 * }
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as templateService from '../../services/templates/templateService';
import Navbar from '../../components/Navbar';
import { MdRefresh, MdTrendingUp, MdListAlt, MdSend, MdCheckCircle, MdVisibility } from 'react-icons/md';
import './TemplateAnalytics.css';

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
 * Sort options for template list
 * @constant {Array<Object>}
 */
const SORT_OPTIONS = [
  { value: 'usage', label: 'Usage Count' },
  { value: 'success', label: 'Success Rate' },
  { value: 'read', label: 'Read Rate' },
  { value: 'recent', label: 'Recently Used' }
];

/**
 * Performance thresholds for rating
 * @constant {Object}
 */
const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: { success: 80, read: 60 },
  GOOD: { success: 60, read: 40 }
};

/**
 * Performance colors by threshold
 * @constant {Object}
 */
const PERFORMANCE_COLORS = {
  HIGH: '#4CAF50',
  MEDIUM: '#FF9800',
  LOW: '#F44336'
};

/**
 * Summary card icons
 * @constant {Object}
 */
const SUMMARY_ICONS = {
  TEMPLATES: <MdListAlt fontSize="1.5rem" color="#1976d2" />,
  SENT: <MdSend fontSize="1.5rem" color="#0288d1" />,
  DELIVERED: <MdCheckCircle fontSize="1.5rem" color="#43a047" />,
  READ: <MdVisibility fontSize="1.5rem" color="#fbc02d" />
};

const TemplateAnalytics = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [sortBy, setSortBy] = useState('usage');

  useEffect(() => {
    if (user?.businessId) {
      fetchTemplateAnalytics();
    }
  }, [dateRange, sortBy, user?.businessId]);

  /**
   * Fetches template analytics data with current filters
   * 
   * @async
   * @function fetchTemplateAnalytics
   * @returns {Promise<void>}
   */
  const fetchTemplateAnalytics = async () => {
    setLoading(true);
    try {
      const data = await templateService.getTemplateAnalytics({
        dateRange,
        sortBy
      });
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch template analytics:', error);
      toast.error('Failed to load template analytics');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculates success rate (delivered/sent ratio)
   * 
   * @function calculateSuccessRate
   * @param {Object} template - Template analytics object
   * @returns {number} Success rate percentage (0-100)
   */
  const calculateSuccessRate = (template) => {
    if (!template.sent || template.sent === 0) return 0;
    return Math.round((template.delivered / template.sent) * 100);
  };

  /**
   * Calculates read rate (read/delivered ratio)
   * 
   * @function calculateReadRate
   * @param {Object} template - Template analytics object
   * @returns {number} Read rate percentage (0-100)
   */
  const calculateReadRate = (template) => {
    if (!template.delivered || template.delivered === 0) return 0;
    return Math.round((template.read / template.delivered) * 100);
  };

  /**
   * Gets performance color based on rate threshold
   * 
   * @function getPerformanceColor
   * @param {number} rate - Performance rate (0-100)
   * @returns {string} Hex color code
   */
  const getPerformanceColor = (rate) => {
    if (rate >= 80) return PERFORMANCE_COLORS.HIGH;
    if (rate >= 60) return PERFORMANCE_COLORS.MEDIUM;
    return PERFORMANCE_COLORS.LOW;
  };

  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired
            title="Business Setup Required"
            message="Please complete your business setup to view template analytics."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="template-analytics-container">
          <LoadingSkeleton type="table" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="template-analytics-container">
        <div className="template-analytics-header">
          <div>
            <h1>Template Analytics</h1>
            <p>Track performance and engagement metrics for your message templates</p>
          </div>
        </div>

        <div className="controls-section">
          <div className="control-group">
            <label htmlFor="date-range-filter">Time Period</label>
            <select 
              id="date-range-filter"
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Select time period for analytics"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="sort-by-filter">Sort By</label>
            <select 
              id="sort-by-filter"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Select sorting option"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No template analytics available</h3>
            <p>Start sending messages with templates to see analytics</p>
          </div>
        ) : (
          <>
            <div className="summary-cards">
              <div className="summary-card" aria-label="Active templates count">
                <div className="summary-icon">{SUMMARY_ICONS.TEMPLATES}</div>
                <div className="summary-content">
                  <div className="summary-value">{templates.length}</div>
                  <div className="summary-label">Active Templates</div>
                </div>
              </div>
              <div className="summary-card" aria-label="Total messages sent">
                <div className="summary-icon">{SUMMARY_ICONS.SENT}</div>
                <div className="summary-content">
                  <div className="summary-value">
                    {templates.reduce((sum, t) => sum + (t.sent || 0), 0).toLocaleString()}
                  </div>
                  <div className="summary-label">Total Sent</div>
                </div>
              </div>
              <div className="summary-card" aria-label="Total messages delivered">
                <div className="summary-icon">{SUMMARY_ICONS.DELIVERED}</div>
                <div className="summary-content">
                  <div className="summary-value">
                    {templates.reduce((sum, t) => sum + (t.delivered || 0), 0).toLocaleString()}
                  </div>
                  <div className="summary-label">Total Delivered</div>
                </div>
              </div>
              <div className="summary-card" aria-label="Total messages read">
                <div className="summary-icon">{SUMMARY_ICONS.READ}</div>
                <div className="summary-content">
                  <div className="summary-value">
                    {templates.reduce((sum, t) => sum + (t.read || 0), 0).toLocaleString()}
                  </div>
                  <div className="summary-label">Total Read</div>
                </div>
              </div>
            </div>

            <div className="templates-table-wrapper">
              <table className="templates-table">
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Category</th>
                    <th>Usage</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Read</th>
                    <th>Success Rate</th>
                    <th>Read Rate</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => {
                    const successRate = calculateSuccessRate(template);
                    const readRate = calculateReadRate(template);
                    return (
                      <tr key={template._id}>
                        <td className="template-name-cell">
                          <div className="template-name">{template.name}</div>
                          <div className="template-status">
                            {template.status}
                          </div>
                        </td>
                        <td>
                          <span className="category-badge">{template.category || 'N/A'}</span>
                        </td>
                        <td className="usage-cell">
                          <strong>{template.usageCount || 0}</strong> times
                        </td>
                        <td>{(template.sent || 0).toLocaleString()}</td>
                        <td>{(template.delivered || 0).toLocaleString()}</td>
                        <td>{(template.read || 0).toLocaleString()}</td>
                        <td>
                          <div className="rate-cell">
                            <div 
                              className="rate-bar"
                              style={{ 
                                width: `${successRate}%`,
                                background: getPerformanceColor(successRate)
                              }}
                            ></div>
                            <span className="rate-text">{successRate}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="rate-cell">
                            <div 
                              className="rate-bar"
                              style={{ 
                                width: `${readRate}%`,
                                background: getPerformanceColor(readRate)
                              }}
                            ></div>
                            <span className="rate-text">{readRate}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="performance-indicator">
                            {successRate >= PERFORMANCE_THRESHOLDS.EXCELLENT.success && readRate >= PERFORMANCE_THRESHOLDS.EXCELLENT.read ? (
                              <span className="perf-excellent">🔥 Excellent</span>
                            ) : successRate >= PERFORMANCE_THRESHOLDS.GOOD.success && readRate >= PERFORMANCE_THRESHOLDS.GOOD.read ? (
                              <span className="perf-good">✨ Good</span>
                            ) : (
                              <span className="perf-needs-improvement">⚠️ Needs Work</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="insights-section">
              <h3>💡 Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <h4>🏆 Top Performer</h4>
                  <p>{templates[0]?.name || 'N/A'}</p>
                  <span className="insight-value">{templates[0]?.usageCount || 0} uses</span>
                </div>
                <div className="insight-card">
                  <h4>📈 Highest Success Rate</h4>
                  <p>
                    {templates.sort((a, b) => calculateSuccessRate(b) - calculateSuccessRate(a))[0]?.name || 'N/A'}
                  </p>
                  <span className="insight-value">
                    {calculateSuccessRate(templates[0] || {})}% success
                  </span>
                </div>
                <div className="insight-card">
                  <h4>Most Engaging</h4>
                  <p>
                    {templates.sort((a, b) => calculateReadRate(b) - calculateReadRate(a))[0]?.name || 'N/A'}
                  </p>
                  <span className="insight-value">
                    {calculateReadRate(templates[0] || {})}% read rate
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TemplateAnalytics;



