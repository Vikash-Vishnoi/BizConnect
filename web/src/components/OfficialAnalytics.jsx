import React, { useState, useEffect } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import './OfficialAnalytics.css';

const OfficialAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  
  // Filters
  const [dateRange, setDateRange] = useState('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [granularity, setGranularity] = useState('DAILY');
  const [useCache, setUseCache] = useState(true);
  
  // Data
  const [conversationData, setConversationData] = useState(null);
  const [messageData, setMessageData] = useState(null);
  
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
  
  const fetchOfficialAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { start, end } = calculateDateRange();
      
      // Fetch conversation analytics
      const conversationParams = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
        granularity,
        useCache: useCache.toString()
      });
      
      const conversationResponse = await fetch(`/api/analytics/official/conversations?${conversationParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json();
        throw new Error(errorData.message || 'Failed to fetch conversation analytics');
      }
      
      const conversationResult = await conversationResponse.json();
      setConversationData(conversationResult);
      setCached(conversationResult.cached || false);
      
      // Fetch message analytics
      const messageParams = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
        granularity,
        useCache: useCache.toString()
      });
      
      const messageResponse = await fetch(`/api/analytics/official/messages?${messageParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (messageResponse.ok) {
        const messageResult = await messageResponse.json();
        setMessageData(messageResult);
      }
      
    } catch (err) {
      console.error('Official analytics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear the analytics cache?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/analytics/official/cache', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchOfficialAnalytics();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      alert('Failed to clear cache');
    }
  };
  
  const handleExportCSV = () => {
    if (!conversationData) return;
    
    const csvRows = [];
    csvRows.push(['Official WhatsApp Analytics Report']);
    csvRows.push(['Generated:', new Date().toLocaleString()]);
    csvRows.push(['Date Range:', `${new Date(calculateDateRange().start * 1000).toLocaleDateString()} - ${new Date(calculateDateRange().end * 1000).toLocaleDateString()}`]);
    csvRows.push([]);
    
    csvRows.push(['CONVERSATION ANALYTICS']);
    csvRows.push(['Total Conversations', conversationData.totalConversations]);
    csvRows.push(['Total Cost', `$${conversationData.totalCost?.toFixed(4) || 0}`]);
    csvRows.push([]);
    
    csvRows.push(['Category Breakdown']);
    Object.entries(conversationData.categoryBreakdown || {}).forEach(([category, count]) => {
      csvRows.push([category, count]);
    });
    csvRows.push([]);
    
    csvRows.push(['Direction Breakdown']);
    Object.entries(conversationData.directionBreakdown || {}).forEach(([direction, count]) => {
      csvRows.push([direction, count]);
    });
    csvRows.push([]);
    
    csvRows.push(['Date', 'Conversations', 'Cost', 'Category', 'Direction']);
    conversationData.conversationVolume?.forEach(item => {
      csvRows.push([
        item.date,
        item.conversations,
        `$${item.cost?.toFixed(4) || 0}`,
        item.category || '-',
        item.direction || '-'
      ]);
    });
    
    if (messageData) {
      csvRows.push([]);
      csvRows.push(['MESSAGE ANALYTICS']);
      csvRows.push(['Total Messages', messageData.totalMessages]);
      csvRows.push([]);
      
      csvRows.push(['Type Breakdown']);
      Object.entries(messageData.typeBreakdown || {}).forEach(([type, count]) => {
        csvRows.push([type, count]);
      });
      csvRows.push([]);
      
      csvRows.push(['Date', 'Messages', 'Type']);
      messageData.messageVolume?.forEach(item => {
        csvRows.push([
          item.date,
          item.messages,
          item.messageType || '-'
        ]);
      });
    }
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `official-analytics-${dateRange}days-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  
  // Chart configurations
  const conversationVolumeChartData = conversationData ? {
    labels: conversationData.conversationVolume?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Conversations',
        data: conversationData.conversationVolume?.map(item => item.conversations) || [],
        borderColor: '#075E54',
        backgroundColor: 'rgba(7, 94, 84, 0.1)',
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
        borderColor: '#128C7E',
        backgroundColor: 'rgba(18, 140, 126, 0.1)',
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
          '#25D366',
          '#128C7E',
          '#075E54',
          '#34B7F1'
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
        backgroundColor: ['#25D366', '#128C7E']
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
                <div className="stat-value">{conversationData.totalConversations}</div>
                <div className="stat-label">Total Conversations</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">${conversationData.totalCost?.toFixed(4) || '0.0000'}</div>
                <div className="stat-label">Total Cost</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">
                  {conversationData.conversationVolume?.length || 0}
                </div>
                <div className="stat-label">Data Points</div>
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
                <div className="stat-value">{messageData.totalMessages}</div>
                <div className="stat-label">Total Messages</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficialAnalytics;
