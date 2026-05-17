/**
 * Utility Functions for Errors & Alerts Page
 * Helper functions for icon selection and color mapping
 */

import { ERROR_CONFIG, SEVERITY_CONFIG } from '../constants/errorAlertsConstants';

// ============================================
// ERROR UTILITIES
// ============================================

/**
 * Get icon component for error type
 * @param {string} errorType - Error type identifier
 * @returns {React.Component} Icon component
 */
export const getErrorIcon = (errorType) => {
  const config = ERROR_CONFIG[errorType] || ERROR_CONFIG.OTHER;
  return config.icon;
};

/**
 * Get color for error type
 * @param {string} errorType - Error type identifier
 * @returns {string} Color hex code
 */
export const getErrorColor = (errorType) => {
  const config = ERROR_CONFIG[errorType] || ERROR_CONFIG.OTHER;
  return config.color;
};

/**
 * Get label for error type
 * @param {string} errorType - Error type identifier
 * @returns {string} Human-readable label
 */
export const getErrorLabel = (errorType) => {
  const config = ERROR_CONFIG[errorType] || ERROR_CONFIG.OTHER;
  return config.label;
};

// ============================================
// ALERT UTILITIES
// ============================================

/**
 * Get icon component for alert severity
 * @param {string} severity - Alert severity level
 * @returns {React.Component} Icon component
 */
export const getSeverityIcon = (severity) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.DEFAULT;
  return config.icon;
};

/**
 * Get color for alert severity
 * @param {string} severity - Alert severity level
 * @returns {string} Color hex code
 */
export const getSeverityColor = (severity) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.DEFAULT;
  return config.color;
};

/**
 * Get label for alert severity
 * @param {string} severity - Alert severity level
 * @returns {string} Human-readable label
 */
export const getSeverityLabel = (severity) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.DEFAULT;
  return config.label;
};

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Calculate time ago from date
 * @param {string|Date} date - Date to calculate from
 * @returns {string} Time ago string (e.g., "2 hours ago")
 */
export const getTimeAgo = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date() - dateObj) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  } catch (error) {
    return 'N/A';
  }
};
