import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import * as templateService from '../../services/templates/templateService';
import Navbar from '../../components/Navbar';
import { MdRefresh, MdTrendingUp } from 'react-icons/md';
import './TemplateAnalytics.css';

const TemplateAnalytics = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [sortBy, setSortBy] = useState('usage');

  const dateRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    if (user?.businessId) {
      fetchTemplateAnalytics();
    }
  }, [dateRange, sortBy, user?.businessId]);

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

  const calculateSuccessRate = (template) => {
    if (!template.sent || template.sent === 0) return 0;
    return Math.round((template.delivered / template.sent) * 100);
  };

  const calculateReadRate = (template) => {
    if (!template.delivered || template.delivered === 0) return 0;
    return Math.round((template.read / template.delivered) * 100);
  };

  const getPerformanceColor = (rate) => {
    if (rate >= 80) return '#4CAF50';
    if (rate >= 60) return '#FF9800';
    return '#F44336';
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
            <label>Time Period</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="usage">Usage Count</option>
              <option value="success">Success Rate</option>
              <option value="read">Read Rate</option>
              <option value="recent">Recently Used</option>
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
              <div className="summary-card">
                <div className="summary-icon"></div>
                <div className="summary-content">
                  <div className="summary-value">{templates.length}</div>
                  <div className="summary-label">Active Templates</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon">📤</div>
                <div className="summary-content">
                  <div className="summary-value">
                    {templates.reduce((sum, t) => sum + (t.sent || 0), 0).toLocaleString()}
                  </div>
                  <div className="summary-label">Total Sent</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon"></div>
                <div className="summary-content">
                  <div className="summary-value">
                    {templates.reduce((sum, t) => sum + (t.delivered || 0), 0).toLocaleString()}
                  </div>
                  <div className="summary-label">Total Delivered</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon"></div>
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
                            {successRate >= 80 && readRate >= 60 ? (
                              <span className="perf-excellent">🔥 Excellent</span>
                            ) : successRate >= 60 && readRate >= 40 ? (
                              <span className="perf-good">✨ Good</span>
                            ) : (
                              <span className="perf-needs-improvement">Needs Work</span>
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



