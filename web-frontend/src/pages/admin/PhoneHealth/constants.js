import { MdCheckCircle, MdWarning, MdError } from 'react-icons/md';

/**
 * Tab options for navigation
 * @constant {Object}
 */
export const TAB_OPTIONS = {
  CURRENT_HEALTH: 'current_health',
  QUALITY_HISTORY: 'quality_history'
};

/**
 * Date range filter options
 * @constant {Array<Object>}
 */
export const DATE_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' }
];

/**
 * Quality rating configuration with icons and colors
 * @constant {Object}
 */
export const QUALITY_RATINGS = {
  GREEN: {
    icon: MdCheckCircle,
    color: '#4CAF50',
    label: 'High Quality',
    description: 'High quality - Excellent messaging performance'
  },
  YELLOW: {
    icon: MdWarning,
    color: '#FF9800',
    label: 'Medium Quality',
    description: 'Medium quality - Monitor your messaging practices'
  },
  RED: {
    icon: MdError,
    color: '#F44336',
    label: 'Low Quality',
    description: 'Low quality - Immediate action required'
  },
  UNKNOWN: {
    icon: MdError,
    color: '#9E9E9E',
    label: 'Unknown',
    description: 'Quality status unknown'
  }
};

/**
 * Health score thresholds for color coding
 * @constant {Object}
 */
export const HEALTH_THRESHOLDS = {
  GOOD: 80,
  WARNING: 50
};

/**
 * Health score colors by threshold
 * @constant {Object}
 */
export const HEALTH_COLORS = {
  GOOD: '#4CAF50',
  WARNING: '#FF9800',
  CRITICAL: '#F44336'
};

/**
 * Gets quality rating icon component based on rating
 */
export const getQualityIcon = (rating) => {
  const iconStyle = { fontSize: '24px' };
  const config = QUALITY_RATINGS[rating] || QUALITY_RATINGS.UNKNOWN;
  const Icon = config.icon;
  return <Icon style={{ ...iconStyle, color: config.color }} />;
};

/**
 * Gets quality rating color
 */
export const getQualityColor = (rating) => {
  return (QUALITY_RATINGS[rating] || QUALITY_RATINGS.UNKNOWN).color;
};

/**
 * Gets quality rating label
 */
export const getQualityLabel = (rating) => {
  return (QUALITY_RATINGS[rating] || QUALITY_RATINGS.UNKNOWN).label;
};

/**
 * Gets health score color based on threshold
 */
export const getHealthScoreColor = (score) => {
  if (score >= HEALTH_THRESHOLDS.GOOD) return HEALTH_COLORS.GOOD;
  if (score >= HEALTH_THRESHOLDS.WARNING) return HEALTH_COLORS.WARNING;
  return HEALTH_COLORS.CRITICAL;
};

/**
 * Formats date string to localized format
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Helper to format status strings to be more readable
 * e.g. "CONNECTED" -> "Connected"
 */
export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
};

/**
 * Helper to format messaging tier
 * e.g. "TIER_1K" -> "1k Messages/Day"
 */
export const formatTier = (tier) => {
  if (!tier) return 'Unknown';
  if (tier === 'TIER_1K') return '1k Messages/Day';
  if (tier === 'TIER_10K') return '10k Messages/Day';
  if (tier === 'TIER_100K') return '100k Messages/Day';
  if (tier === 'TIER_UNLIMITED') return 'Unlimited Messages';
  return formatStatus(tier);
};

/**
 * Helper to format verification status
 */
export const formatVerification = (status) => {
  if (status === 'VERIFIED') return 'Verified';
  if (status === 'NOT_VERIFIED') return 'Not Verified';
  if (status === 'EXPIRED') return 'Expired';
  return formatStatus(status);
};
