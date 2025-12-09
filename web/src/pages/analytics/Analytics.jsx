import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
import { useToast } from '../../components/Toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as analyticsService from '../../services/analytics/analyticsService';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import OfficialAnalytics from '../../components/OfficialAnalytics';
import { MdDownload, MdRefresh, MdTrendingUp, MdTrendingDown } from 'react-icons/md';
import './Analytics.css';

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

const Analytics = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' or 'official'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    totalMessages: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    deliveryRate: 0,
    readRate: 0
  });
  const [messageVolumeData, setMessageVolumeData] = useState([]);
  const [deliveryStatusData, setDeliveryStatusData] = useState({
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0
  });
  const [templatePerformanceData, setTemplatePerformanceData] = useState([]);

  useEffect(() => {
    if (user?.businessId) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [dateRange, startDate, endDate, user?.businessId]);

  const fetchAnalytics = async () => {
    // Don't fetch if no business is set up
    if (!user?.businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Build query params
      const params = {};
      if (dateRange !== 'custom') {
        params.range = dateRange;
      } else if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const data = await analyticsService.getDashboardAnalytics(params);

      // Set stats
      setStats({
        totalMessages: data.totalMessages || 0,
        delivered: data.delivered || 0,
        read: data.read || 0,
        failed: data.failed || 0,
        deliveryRate: data.deliveryRate || 0,
        readRate: data.readRate || 0
      });

      // Set message volume data
      setMessageVolumeData(data.messageVolume || []);

      // Set delivery status data
      setDeliveryStatusData({
        sent: data.deliveryStatus?.sent || 0,
        delivered: data.deliveryStatus?.delivered || 0,
        read: data.deliveryStatus?.read || 0,
        failed: data.deliveryStatus?.failed || 0
      });

      // Set template performance data
      setTemplatePerformanceData(data.templatePerformance || []);

    } catch (err) {
      console.error('Analytics fetch error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to fetch analytics';
      setError(errorMsg);
      
      // Check if error is related to business setup
      if (errorMsg.toLowerCase().includes('business') || errorMsg.toLowerCase().includes('x-business-id')) {
        // Don't show toast, just set error to trigger BusinessSetupRequired display
        setError('BUSINESS_SETUP_REQUIRED');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      // Use analytics service for export
      const params = {};
      if (dateRange !== 'custom') {
        params.range = dateRange;
      } else if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const blob = await analyticsService.exportAnalytics({ ...params, format: 'csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('📊 Analytics exported to CSV successfully');
    } catch (err) {
      toast.error('Failed to export analytics');
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('📄 Preparing PDF export...');
      // Create printable version
      window.print();
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  };

  // Chart configurations
  const messageVolumeChartData = {
    labels: messageVolumeData.map(item => item.date),
    datasets: [
      {
        label: 'Messages Sent',
        data: messageVolumeData.map(item => item.count),
        borderColor: '#25D366',
        backgroundColor: 'rgba(37, 211, 102, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const messageVolumeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Message Volume Over Time'
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

  const deliveryStatusChartData = {
    labels: ['Sent', 'Delivered', 'Read', 'Failed'],
    datasets: [
      {
        data: [
          deliveryStatusData.sent,
          deliveryStatusData.delivered,
          deliveryStatusData.read,
          deliveryStatusData.failed
        ],
        backgroundColor: [
          '#128C7E',
          '#25D366',
          '#075E54',
          '#DC3545'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const deliveryStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Delivery Status Distribution'
      }
    }
  };

  const templatePerformanceChartData = {
    labels: templatePerformanceData.map(item => item.name),
    datasets: [
      {
        label: 'Messages Sent',
        data: templatePerformanceData.map(item => item.sent),
        backgroundColor: '#25D366'
      },
      {
        label: 'Delivered',
        data: templatePerformanceData.map(item => item.delivered),
        backgroundColor: '#128C7E'
      },
      {
        label: 'Read',
        data: templatePerformanceData.map(item => item.read),
        backgroundColor: '#075E54'
      }
    ]
  };

  const templatePerformanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Template Performance Comparison'
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

  // Check if business setup is complete
  if (!user?.businessId) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <BusinessSetupRequired 
            title="Business Setup Required"
            message="Please complete your business setup to access analytics"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-title">Analytics & Reports</h1>
            <p className="page-subtitle">Track your messaging performance and insights</p>
          </div>
          <div className="page-actions">
            <Button variant="outline" size="small" onClick={handleExportCSV}>
              <MdDownload /> Export CSV
            </Button>
            <Button variant="outline" size="small" onClick={handleExportPDF}>
              <MdDownload /> Export PDF
            </Button>
          </div>
        </div>

        {/* Analytics Tabs */}
        <div className="analytics-tabs">
          <button
            className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Analytics
          </button>
          <button
            className={`tab-button ${activeTab === 'official' ? 'active' : ''}`}
            onClick={() => setActiveTab('official')}
          >
            Official WhatsApp Metrics
          </button>
        </div>

        {error === 'BUSINESS_SETUP_REQUIRED' && activeTab === 'custom' ? (
          <BusinessSetupRequired 
            title="Business Setup Required"
            message="Please complete your business setup to access analytics data"
          />
        ) : error && activeTab === 'custom' ? (
          <div className="error-banner">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : null}
        
        {/* Render tab content */}
        {activeTab === 'official' ? (
          <OfficialAnalytics />
        ) : (
          <>

        <div className="date-range-selector">
          <button
            className={dateRange === '7days' ? 'active' : ''}
            onClick={() => setDateRange('7days')}
          >
            Last 7 Days
          </button>
          <button
            className={dateRange === '30days' ? 'active' : ''}
            onClick={() => setDateRange('30days')}
          >
            Last 30 Days
          </button>
          <button
            className={dateRange === '90days' ? 'active' : ''}
            onClick={() => setDateRange('90days')}
          >
            Last 90 Days
          </button>
          <button
            className={dateRange === 'custom' ? 'active' : ''}
            onClick={() => setDateRange('custom')}
          >
            Custom Range
          </button>
        </div>

        {dateRange === 'custom' && (
          <div className="custom-date-range">
            <div className="date-input-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="date-input-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton type="dashboard" />
        ) : (
          <>
            <div className="stats-grid">
              <Card className="stat-card" hoverable>
                <div className="stat-icon stat-icon-primary">
                  <MdTrendingUp />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Messages</p>
                  <h2 className="stat-value">{stats.totalMessages.toLocaleString()}</h2>
                </div>
              </Card>

              <Card className="stat-card" hoverable>
                <div className="stat-icon stat-icon-success">
                  <MdTrendingUp />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Delivered</p>
                  <h2 className="stat-value">{stats.delivered.toLocaleString()}</h2>
                  <span className="stat-badge success">{stats.deliveryRate}%</span>
                </div>
              </Card>

              <Card className="stat-card" hoverable>
                <div className="stat-icon stat-icon-info">
                  <MdTrendingUp />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Read</p>
                  <h2 className="stat-value">{stats.read.toLocaleString()}</h2>
                  <p className="stat-change">{stats.readRate}%</p>
                </div>
              </Card>

              <Card className="stat-card" hoverable>
                <div className="stat-icon stat-icon-danger">
                  <MdTrendingDown />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Failed</p>
                  <h2 className="stat-value">{stats.failed.toLocaleString()}</h2>
                </div>
              </Card>
            </div>

            <div className="charts-grid">
              <Card className="chart-card full-width">
                <div className="chart-container">
                  <Line data={messageVolumeChartData} options={messageVolumeChartOptions} />
                </div>
              </Card>

              <Card className="chart-card">
                <div className="chart-container">
                  <Pie data={deliveryStatusChartData} options={deliveryStatusChartOptions} />
                </div>
              </Card>

              <Card className="chart-card">
                <div className="chart-container">
                  <Bar data={templatePerformanceChartData} options={templatePerformanceChartOptions} />
                </div>
              </Card>
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default Analytics;



