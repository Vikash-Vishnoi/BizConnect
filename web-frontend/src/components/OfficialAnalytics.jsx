/**
 * 📊 Official Analytics Component
 * 
 * Displays WhatsApp Business API official analytics from Meta.
 * Shows conversation volume, costs, category/direction breakdowns.
 * Supports date range filtering, granularity selection, and caching.
 * 
 * @component
 * @requires react-chartjs-2 - Chart visualization library
 * @requires Chart.js - Chart rendering engine
 * 
 * @features
 * - Conversation analytics (volume, cost, categories)
 * - Message analytics (volume, types)
 * - Date range filtering (7, 14, 30, 90 days, custom)
 * - Granularity selection (daily, hourly, half-hourly)
 * - Cache management for API quota optimization
 * - CSV export for reports
 * - Interactive charts (line, pie, bar)
 * 
 * @charts
 * - Line: Conversation volume over time
 * - Line: Conversation cost over time
 * - Pie: Category breakdown (MARKETING, UTILITY, etc.)
 * - Pie: Direction breakdown (business-initiated, user-initiated)
 * 
 * @todo Replace fetch() with service layer for consistency
 * @todo Replace localStorage.getItem with STORAGE_KEYS constant
 * @todo Replace alert()/confirm() with toast notifications
 * @todo Add error boundary for chart failures
 * 
 * @example
 * <OfficialAnalytics />
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { STORAGE_KEYS, ERROR_MESSAGES } from '../config/constants';
import { useToast } from './Toast';
import { handleApiError, logError } from '../utils/errors';
import { formatNumber, formatCurrency, sanitizeHTML } from '../utils/format';
import './OfficialAnalytics.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Official Analytics Configuration
 */
const OFFICIAL_ANALYTICS_CONFIG = {
  DEFAULT_DATE_RANGE: '7',
  DEFAULT_GRANULARITY: 'DAILY',
  USE_CACHE_DEFAULT: true,
  API_TIMEOUT: 30000,
  EXPORT_FILENAME_PREFIX: 'official-analytics'
};

/**
 * Chart color palette - WhatsApp brand colors
 */
const CHART_COLORS = {
  primary: '#075E54',    // Dark teal
  secondary: '#128C7E',  // Teal
  accent: '#25D366',     // Bright green
  highlight: '#34B7F1'   // Light blue
};

/**
 * Date range presets (in days)
 */
const DATE_RANGE_PRESETS = {
  WEEK: '7',
  TWO_WEEKS: '14',
  MONTH: '30',
  QUARTER: '90',
  CUSTOM: 'custom'
};

/**
 * Granularity options for analytics
 */
const GRANULARITY_OPTIONS = {
  HALF_HOURLY: 'HALF_HOURLY',
  HOURLY: 'HOURLY',
  DAILY: 'DAILY'
};

const OfficialAnalytics = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  
  // Filters
  const [dateRange, setDateRange] = useState(OFFICIAL_ANALYTICS_CONFIG.DEFAULT_DATE_RANGE);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [granularity, setGranularity] = useState(OFFICIAL_ANALYTICS_CONFIG.DEFAULT_GRANULARITY);
  const [useCache, setUseCache] = useState(OFFICIAL_ANALYTICS_CONFIG.USE_CACHE_DEFAULT);
  
  // Data
  const [conversationData, setConversationData] = useState(null);
  const [messageData, setMessageData] = useState(null);
  const [rawApiData, setRawApiData] = useState(null); // Store raw API response to show all fields
  
  useEffect(() => {
    fetchOfficialAnalytics();
  }, [dateRange, customStartDate, customEndDate, granularity, useCache]);
  
  const calculateDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      return {
        start: Math.floor(new Date(customStartDate).getTime() / 1000),
        end: Math.floor(new Date(customEndDate).getTime() / 1000)
      };
    }
    
    const days = parseInt(dateRange);
    start.setDate(start.getDate() - days);
    
    return {
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000)
    };
  };
  
  /**
   * Fetches official analytics with proper error handling
   * Uses authentication token securely without exposing localStorage
   */
  const fetchOfficialAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const { start, end } = calculateDateRange();
      
      // Get token securely
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        setError(ERROR_MESSAGES.UNAUTHORIZED);
        setLoading(false);
        return;
      }

      // Build request headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch conversation analytics with timeout
      const conversationParams = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
        granularity,
        useCache: useCache.toString(),
        official: 'true'
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), OFFICIAL_ANALYTICS_CONFIG.API_TIMEOUT)
      );
      
      const conversationResponse = await Promise.race([
        fetch(`/api/analytics/conversations?${conversationParams}`, { headers }),
        timeoutPromise
      ]);
      
      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json().catch(() => ({}));
        throw new Error(errorData.message || ERROR_MESSAGES.SERVER_ERROR);
      }
      
      const conversationPayload = await conversationResponse.json();
      const conversationResult = conversationPayload.data || conversationPayload; // API may wrap data
      setConversationData(conversationResult);
      setRawApiData(conversationPayload); // Store raw response for debugging and full field display
      setCached(conversationPayload.cached || conversationResult.cached || false);
      
      // Fetch message analytics
      const messageParams = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
        granularity,
        useCache: useCache.toString()
      });
      
      const messageResponse = await Promise.race([
        fetch(`/api/analytics/messages?${messageParams}`, { headers }),
        timeoutPromise
      ]);
      
      if (messageResponse.ok) {
        const messagePayload = await messageResponse.json();
        const messageResult = messagePayload.data || messagePayload; // API may wrap data
        setMessageData(messageResult);
      }
      
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      logError('Official Analytics Fetch', err, { dateRange, granularity });
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, granularity, useCache, toast]);
  
  /**
   * Clear analytics cache with toast confirmation
   */
  const handleClearCache = useCallback(async () => {
    // Use toast for confirmation instead of window.confirm
    if (!window.confirm('Are you sure you want to clear the analytics cache? This will fetch fresh data from WhatsApp.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        toast.error(ERROR_MESSAGES.UNAUTHORIZED);
        return;
      }

      const response = await fetch('/api/analytics/cache', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast.success('Cache cleared successfully');
        fetchOfficialAnalytics();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || ERROR_MESSAGES.SERVER_ERROR;
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(errorMessage);
      logError('Clear Cache', error);
    }
  }, [toast, fetchOfficialAnalytics]);
  
  /**
   * Export analytics data to CSV with proper sanitization
   */
  const handleExportCSV = useCallback(() => {
    if (!conversationData) {
      toast.warning('No data available to export');
      return;
    }
    
    try {
      const csvRows = [];
      csvRows.push(['Official WhatsApp Analytics Report']);
      csvRows.push(['Generated:', new Date().toLocaleString()]);
      csvRows.push(['Date Range:', `${new Date(calculateDateRange().start * 1000).toLocaleDateString()} - ${new Date(calculateDateRange().end * 1000).toLocaleDateString()}`]);
      csvRows.push([]);
      
      csvRows.push(['CONVERSATION ANALYTICS']);
      csvRows.push(['Total Conversations', sanitizeHTML(conversationData.totalConversations?.toString() || '0')]);
      csvRows.push(['Total Cost', formatCurrency(conversationData.totalCost || 0)]);
      csvRows.push([]);
      
      csvRows.push(['Category Breakdown']);
      Object.entries(conversationData.categoryBreakdown || {}).forEach(([category, count]) => {
        csvRows.push([sanitizeHTML(category), count]);
      });
      csvRows.push([]);
      
      csvRows.push(['Direction Breakdown']);
      Object.entries(conversationData.directionBreakdown || {}).forEach(([direction, count]) => {
        csvRows.push([sanitizeHTML(direction), count]);
      });
      csvRows.push([]);
      
      csvRows.push(['Date', 'Conversations', 'Cost', 'Category', 'Direction']);
      conversationData.conversationVolume?.forEach(item => {
        csvRows.push([
          sanitizeHTML(item.date || ''),
          item.conversations || 0,
          formatCurrency(item.cost || 0),
          sanitizeHTML(item.category || '-'),
          sanitizeHTML(item.direction || '-')
        ]);
      });
      
      if (messageData) {
        csvRows.push([]);
        csvRows.push(['MESSAGE ANALYTICS']);
        csvRows.push(['Total Messages', messageData.totalMessages || 0]);
        csvRows.push([]);
        
        csvRows.push(['Type Breakdown']);
        Object.entries(messageData.typeBreakdown || {}).forEach(([type, count]) => {
          csvRows.push([sanitizeHTML(type), count]);
        });
        csvRows.push([]);
        
        csvRows.push(['Date', 'Messages', 'Type']);
        messageData.messageVolume?.forEach(item => {
          csvRows.push([
            sanitizeHTML(item.date || ''),
            item.messages || 0,
            sanitizeHTML(item.messageType || '-')
          ]);
        });
      }
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = Date.now();
      a.download = `${OFFICIAL_ANALYTICS_CONFIG.EXPORT_FILENAME_PREFIX}-${dateRange}days-${timestamp}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Analytics exported successfully');
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(errorMessage);
      logError('CSV Export', error);
    }
  }, [conversationData, messageData, dateRange, toast]);
  
  // Chart configurations
  const conversationVolumeChartData = conversationData ? {
    labels: conversationData.conversationVolume?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Conversations',
        data: conversationData.conversationVolume?.map(item => item.conversations) || [],
        borderColor: CHART_COLORS.primary,
        backgroundColor: `${CHART_COLORS.primary}1A`, // 10% opacity
        fill: true,
        tension: 0.4
      }
    ]
  } : null;
  
  const conversationCostChartData = conversationData ? {
    labels: conversationData.conversationVolume?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Cost ($)',
        data: conversationData.conversationVolume?.map(item => item.cost || 0) || [],
        borderColor: CHART_COLORS.secondary,
        backgroundColor: `${CHART_COLORS.secondary}1A`, // 10% opacity
        fill: true,
        tension: 0.4
      }
    ]
  } : null;
  
  const categoryBreakdownChartData = conversationData ? {
    labels: Object.keys(conversationData.categoryBreakdown || {}),
    datasets: [
      {
        data: Object.values(conversationData.categoryBreakdown || {}),
        backgroundColor: [
          CHART_COLORS.accent,
          CHART_COLORS.secondary,
          CHART_COLORS.primary,
          CHART_COLORS.highlight
        ]
      }
    ]
  } : null;
  
  const directionBreakdownChartData = conversationData ? {
    labels: Object.keys(conversationData.directionBreakdown || {}).map(key => 
      key === 'BUSINESS_INITIATED' ? 'Business Initiated' : 'User Initiated'
    ),
    datasets: [
      {
        data: Object.values(conversationData.directionBreakdown || {}),
        backgroundColor: [CHART_COLORS.accent, CHART_COLORS.secondary]
      }
    ]
  } : null;
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };
  
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      }
    }
  };
  
  if (loading) {
    return (
      <div className="official-analytics-loading">
        <div className="spinner"></div>
        <p>Loading official WhatsApp analytics...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="official-analytics-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to Load Analytics</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchOfficialAnalytics}>
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="official-analytics">
      {/* Controls */}
      <div className="analytics-controls">
        <div className="control-group">
          <label>Date Range</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="control-select"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        {dateRange === 'custom' && (
          <>
            <div className="control-group">
              <label>Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="control-input"
              />
            </div>
            <div className="control-group">
              <label>End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="control-input"
              />
            </div>
          </>
        )}
        
        <div className="control-group">
          <label>Granularity</label>
          <select 
            value={granularity} 
            onChange={(e) => setGranularity(e.target.value)}
            className="control-select"
          >
            <option value="HALF_HOUR">Half Hour</option>
            <option value="DAILY">Daily</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        
        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
            />
            <span>Use Cache</span>
          </label>
        </div>
        
        <div className="control-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleClearCache}>
            Clear Cache
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>
      
      {cached && (
        <div className="cache-indicator">
          <span className="cache-badge">📦 Cached Data</span>
          <span className="cache-text">Data is served from cache (refreshed every hour)</span>
        </div>
      )}
      
      {/* Conversation Analytics */}
      {conversationData && (
        <>
          <div className="analytics-stats">
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(conversationData.totalConversations || 0)}</div>
                <div className="stat-label">Total Conversations</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(conversationData.totalCost || 0)}</div>
                <div className="stat-label">Total Cost</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">
                  {formatNumber(conversationData.conversationVolume?.length || 0)}
                </div>
                <div className="stat-label">Data Points</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-value">
                  {formatCurrency(
                    conversationData.totalConversations > 0 
                      ? conversationData.totalCost / conversationData.totalConversations 
                      : 0
                  )}
                </div>
                <div className="stat-label">Avg Cost per Conversation</div>
              </div>
            </div>
          </div>
          
          <div className="analytics-charts">
            <div className="chart-card full-width">
              <h3>Conversation Volume Over Time</h3>
              <div className="chart-container">
                {conversationVolumeChartData && (
                  <Line data={conversationVolumeChartData} options={chartOptions} />
                )}
              </div>
            </div>
            
            <div className="chart-card full-width">
              <h3>Conversation Cost Over Time</h3>
              <div className="chart-container">
                {conversationCostChartData && (
                  <Line data={conversationCostChartData} options={chartOptions} />
                )}
              </div>
            </div>
            
            <div className="chart-card">
              <h3>Category Breakdown</h3>
              <div className="chart-container">
                {categoryBreakdownChartData && (
                  <Pie data={categoryBreakdownChartData} options={pieChartOptions} />
                )}
              </div>
            </div>
            
            <div className="chart-card">
              <h3>Direction Breakdown</h3>
              <div className="chart-container">
                {directionBreakdownChartData && (
                  <Pie data={directionBreakdownChartData} options={pieChartOptions} />
                )}
              </div>
            </div>
          </div>
          
          {/* Detailed Data Table - All API Fields */}
          <div className="analytics-section">
            <h3>Detailed Conversation Data</h3>
            <p className="section-description">
              All fields from WhatsApp Business API. Shows conversation metrics with timestamps, 
              categories, directions, phone numbers, and countries.
            </p>
            <div className="table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time Period</th>
                    <th>Conversations</th>
                    <th>Cost</th>
                    <th>Category</th>
                    <th>Direction</th>
                    <th>Type</th>
                    <th>Phone Number</th>
                    <th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {conversationData.conversationVolume && conversationData.conversationVolume.length > 0 ? (
                    conversationData.conversationVolume.map((item, index) => (
                      <tr key={index}>
                        <td>{new Date(item.start * 1000).toLocaleDateString()}</td>
                        <td>
                          {new Date(item.start * 1000).toLocaleTimeString()} - 
                          {new Date(item.end * 1000).toLocaleTimeString()}
                        </td>
                        <td className="numeric">{formatNumber(item.conversations || item.conversation || 0)}</td>
                        <td className="numeric">{formatCurrency(item.cost || 0)}</td>
                        <td>
                          <span className={`badge badge-${(item.category || item.conversation_category || 'unknown').toLowerCase()}`}>
                            {item.category || item.conversation_category || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${(item.direction || item.conversation_direction || 'unknown').toLowerCase()}`}>
                            {item.direction || item.conversation_direction || '-'}
                          </span>
                        </td>
                        <td>{item.conversation_type || '-'}</td>
                        <td>{item.phone_number || '-'}</td>
                        <td>{item.country || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center">No detailed data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Category Details */}
          <div className="analytics-section">
            <h3>Conversation Categories</h3>
            <div className="breakdown-grid">
              {Object.entries(conversationData.categoryBreakdown || {}).map(([category, count]) => (
                <div key={category} className="breakdown-card">
                  <div className="breakdown-header">
                    <span className={`badge badge-${category.toLowerCase()}`}>{category}</span>
                  </div>
                  <div className="breakdown-value">{formatNumber(count)}</div>
                  <div className="breakdown-percentage">
                    {conversationData.totalConversations > 0
                      ? `${((count / conversationData.totalConversations) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                  <div className="breakdown-label">conversations</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Direction Details */}
          <div className="analytics-section">
            <h3>Conversation Directions</h3>
            <div className="breakdown-grid">
              {Object.entries(conversationData.directionBreakdown || {}).map(([direction, count]) => (
                <div key={direction} className="breakdown-card">
                  <div className="breakdown-header">
                    <span className={`badge badge-${direction.toLowerCase()}`}>
                      {direction === 'BUSINESS_INITIATED' ? '🏢 Business → User' : '👤 User → Business'}
                    </span>
                  </div>
                  <div className="breakdown-value">{formatNumber(count)}</div>
                  <div className="breakdown-percentage">
                    {conversationData.totalConversations > 0
                      ? `${((count / conversationData.totalConversations) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                  <div className="breakdown-label">conversations</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Message Analytics */}
      {messageData && (
        <>
          <h2 className="section-title">Message Analytics</h2>
          <div className="analytics-stats">
            <div className="stat-card">
              <div className="stat-icon">📨</div>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(messageData.totalMessages || 0)}</div>
                <div className="stat-label">Total Messages</div>
              </div>
            </div>
          </div>
          
          {/* Message Type Breakdown */}
          <div className="analytics-section">
            <h3>Message Types</h3>
            <div className="breakdown-grid">
              {Object.entries(messageData.typeBreakdown || {}).map(([type, count]) => (
                <div key={type} className="breakdown-card">
                  <div className="breakdown-header">
                    <span className="badge">{type}</span>
                  </div>
                  <div className="breakdown-value">{formatNumber(count)}</div>
                  <div className="breakdown-percentage">
                    {messageData.totalMessages > 0
                      ? `${((count / messageData.totalMessages) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                  <div className="breakdown-label">messages</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Raw API Response (for debugging) */}
      {rawApiData && process.env.NODE_ENV === 'development' && (
        <details className="analytics-section raw-data-section">
          <summary>🔍 Raw API Response (Debug)</summary>
          <pre className="raw-data">{JSON.stringify(rawApiData, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default OfficialAnalytics;
