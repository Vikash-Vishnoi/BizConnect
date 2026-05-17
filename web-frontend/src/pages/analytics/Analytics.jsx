/**
 * @component Analytics
 * @description Main analytics dashboard with custom metrics and official WhatsApp analytics integration
 * 
 * @features
 * - Dual analytics tabs (custom + official WhatsApp metrics)
 * - Date range filtering (7/30/90 days, custom range)
 * - Statistics dashboard (total messages, delivered, read, failed with rates)
 * - Chart visualizations (line, pie, bar charts)
 * - Message volume tracking over time
 * - Delivery status distribution
 * - Template performance comparison
 * - CSV and PDF export functionality
 * - Business setup validation
 * 
 * @state
 * - activeTab: Selected tab ('custom' or 'official')
 * - loading: Loading state for data fetch
 * - dateRange: Selected predefined range or 'custom'
 * - startDate/endDate: Custom date range values
 * - stats: Overall statistics (messages, delivery, read rates)
 * - messageVolumeData: Time-series data for line chart
 * - deliveryStatusData: Distribution data for pie chart
 * - templatePerformanceData: Comparison data for bar chart
 * 
 * @api
 * - GET /analytics/dashboard - Fetch dashboard analytics with date filters
 * - GET /analytics/export - Export analytics data (CSV/PDF)
 * 
 * @routes
 * /analytics - Main analytics dashboard
 * 
 * @dependencies
 * - Chart.js: Line, Pie, Bar chart components
 * - React Router: Navigation
 * - Analytics Service: Data fetching
 * 
 * @example
 * // Stats structure
 * {
 *   totalMessages: 10000,
 *   delivered: 9500,
 *   read: 7200,
 *   failed: 300,
 *   deliveryRate: 95,
 *   readRate: 72
 * }
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import BusinessSetupRequired from '../../components/BusinessSetupRequired';
import OfficialAnalytics from '../../components/OfficialAnalytics';
import './Analytics.css';

const Analytics = () => {
  const { user } = useAuth();

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
        </div>
        
        <OfficialAnalytics />
      </div>
    </div>
  );
};

export default Analytics;



