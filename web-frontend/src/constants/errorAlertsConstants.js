/**
 * Constants for Errors & Alerts Page
 * Defines error types, alert severities, and configuration objects
 */

import {
  MdError,
  MdWarning,
  MdInfo,
  MdSignalWifiOff,
  MdBlock,
  MdSpeed,
  MdDescription
} from 'react-icons/md';

// ============================================
// ERROR TYPES & CONFIGURATION
// ============================================

/**
 * Available error types for message failures
 */
export const ERROR_TYPES = [
  'all',
  'NETWORK_ERROR',
  'INVALID_NUMBER',
  'BLOCKED',
  'RATE_LIMIT',
  'TEMPLATE_ERROR',
  'OTHER'
];

/**
 * Configuration for each error type
 * Defines color, icon, and label for UI display
 */
export const ERROR_CONFIG = {
  NETWORK_ERROR: {
    color: '#FF9800',
    icon: MdSignalWifiOff,
    label: 'Network Error'
  },
  INVALID_NUMBER: {
    color: '#F44336',
    icon: MdError,
    label: 'Invalid Number'
  },
  BLOCKED: {
    color: '#E91E63',
    icon: MdBlock,
    label: 'Blocked'
  },
  RATE_LIMIT: {
    color: '#FFC107',
    icon: MdSpeed,
    label: 'Rate Limit'
  },
  TEMPLATE_ERROR: {
    color: '#9C27B0',
    icon: MdDescription,
    label: 'Template Error'
  },
  OTHER: {
    color: '#9E9E9E',
    icon: MdWarning,
    label: 'Other'
  }
};

// ============================================
// ALERT SEVERITY & CONFIGURATION
// ============================================

/**
 * Available alert severity levels
 */
export const ALERT_SEVERITIES = [
  'all',
  'unresolved',
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW'
];

/**
 * Configuration for each alert severity level
 * Defines color, icon component, and label for UI display
 */
export const SEVERITY_CONFIG = {
  CRITICAL: {
    color: '#dc3545',
    icon: MdError,
    label: 'CRITICAL'
  },
  HIGH: {
    color: '#fd7e14',
    icon: MdWarning,
    label: 'HIGH'
  },
  MEDIUM: {
    color: '#ffc107',
    icon: MdInfo,
    label: 'MEDIUM'
  },
  LOW: {
    color: '#17a2b8',
    icon: MdInfo,
    label: 'LOW'
  },
  DEFAULT: {
    color: '#6c757d',
    icon: MdInfo,
    label: 'UNKNOWN'
  }
};

// ============================================
// PAGINATION CONFIGURATION
// ============================================

/**
 * Pagination settings for errors list
 */
export const PAGINATION_CONFIG = {
  ERRORS_PER_PAGE: 15
};

// ============================================
// TAB CONFIGURATION
// ============================================

/**
 * Available tabs for the page
 */
export const TABS = {
  ERRORS: 'errors',
  ALERTS: 'alerts'
};
