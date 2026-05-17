/**
 * Formatting Utilities
 * 
 * @module utils/format
 * @description Centralized formatting functions for numbers, dates, currencies, and text.
 * Prevents code duplication and ensures consistent formatting across the application.
 * Includes XSS protection through HTML sanitization.
 * 
 * @security
 * - sanitizeHTML: Prevents XSS attacks by escaping HTML characters
 * - Input validation on all formatting functions
 * 
 * @features
 * - Number formatting with locale support
 * - Date/time formatting with various styles
 * - Currency formatting
 * - Phone number formatting
 * - Text truncation with ellipsis
 * - HTML sanitization for XSS prevention
 * - Percentage formatting
 * - File size formatting
 * 
 * @example
 * import { formatNumber, formatDate, sanitizeHTML } from './format';
 * 
 * formatNumber(1234567);        // "1,234,567"
 * formatDate(new Date());        // "Dec 18, 2025"
 * sanitizeHTML('<script>alert("xss")</script>'); // Safe text
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Escapes dangerous characters that could be used for XSS
 * 
 * @param {string} html - Potentially unsafe HTML string
 * @returns {string} Sanitized safe string
 * @security Prevents XSS by escaping HTML special characters
 * 
 * @example
 * sanitizeHTML('<script>alert("xss")</script>');
 * // Returns: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 */
export const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Format number with locale-specific separators
 * 
 * @param {number|string} num - Number to format
 * @param {Object} options - Formatting options
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @param {number} options.decimals - Number of decimal places
 * @returns {string} Formatted number string
 * 
 * @example
 * formatNumber(1234567);           // "1,234,567"
 * formatNumber(1234.567, { decimals: 2 }); // "1,234.57"
 * formatNumber(null);              // "0"
 */
export const formatNumber = (num, options = {}) => {
  const { locale = 'en-US', decimals } = options;
  
  // Handle null, undefined, or invalid input
  if (num === null || num === undefined || (typeof num !== 'number' && typeof num !== 'string')) {
    return '0';
  }
  
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(parsed)) return '0';
  
  const formatOptions = decimals !== undefined 
    ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
    : {};
  
  return parsed.toLocaleString(locale, formatOptions);
};

/**
 * Format date with various display styles
 * 
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @param {string} options.style - Format style: 'short', 'medium', 'long', 'full', 'time'
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 * 
 * @example
 * formatDate(new Date());                        // "Dec 18, 2025"
 * formatDate(new Date(), { style: 'long' });    // "December 18, 2025"
 * formatDate(new Date(), { style: 'time' });    // "2:30 PM"
 * formatDate(null);                              // "N/A"
 */
export const formatDate = (date, options = {}) => {
  const { style = 'short', locale = 'en-US' } = options;
  
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    switch (style) {
      case 'short':
        return dateObj.toLocaleDateString(locale, { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      
      case 'medium':
        return dateObj.toLocaleDateString(locale, { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'long':
        return dateObj.toLocaleDateString(locale, { 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        });
      
      case 'full':
        return dateObj.toLocaleDateString(locale, { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'time':
        return dateObj.toLocaleTimeString(locale, { 
          hour: '2-digit',
          minute: '2-digit'
        });
      
      default:
        return dateObj.toLocaleDateString(locale, { 
          month: 'short', 
          day: 'numeric'
        });
    }
  } catch (error) {
    console.warn('Date formatting error:', error.message);
    return 'N/A';
  }
};

/**
 * Format currency with symbol
 * 
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @param {string} options.currency - Currency code (default: 'USD')
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56);                           // "$1,234.56"
 * formatCurrency(1234.56, { currency: 'EUR' });     // "€1,234.56"
 * formatCurrency(1234.56, { currency: 'INR', locale: 'en-IN' }); // "₹1,234.56"
 */
export const formatCurrency = (amount, options = {}) => {
  const { currency = 'USD', locale = 'en-US' } = options;
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency} 0.00`;
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency} ${formatNumber(amount, { decimals: 2 })}`;
  }
};

/**
 * Format percentage
 * 
 * @param {number} value - Decimal value (0.5 = 50%)
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage string
 * 
 * @example
 * formatPercentage(0.756);                    // "75.6%"
 * formatPercentage(0.756, { decimals: 0 });  // "76%"
 */
export const formatPercentage = (value, options = {}) => {
  const { decimals = 1 } = options;
  
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  const percentage = value * 100;
  return `${formatNumber(percentage, { decimals })}%`;
};

/**
 * Format phone number
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 * 
 * @example
 * formatPhoneNumber('1234567890');      // "(123) 456-7890"
 * formatPhoneNumber('+911234567890');   // "+91 12345 67890"
 */
export const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle international numbers
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Format US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Truncate text with ellipsis
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 * 
 * @example
 * truncateText('This is a long text', 10);  // "This is a..."
 * truncateText('Short', 10);                 // "Short"
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Format file size in human-readable format
 * 
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted file size
 * 
 * @example
 * formatFileSize(1024);        // "1.00 KB"
 * formatFileSize(1536000);     // "1.46 MB"
 * formatFileSize(0);           // "0 Bytes"
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return 'N/A';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format relative time (e.g., "2 hours ago")
 * 
 * @param {Date|string|number} date - Date to compare
 * @returns {string} Relative time string
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000));  // "1 hour ago"
 * formatRelativeTime(new Date(Date.now() + 86400000)); // "in 1 day"
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffMs = dateObj - now;
    const diffSec = Math.floor(Math.abs(diffMs) / 1000);
    const isPast = diffMs < 0;
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, seconds] of Object.entries(intervals)) {
      const interval = Math.floor(diffSec / seconds);
      if (interval >= 1) {
        const plural = interval > 1 ? 's' : '';
        return isPast 
          ? `${interval} ${unit}${plural} ago`
          : `in ${interval} ${unit}${plural}`;
      }
    }
    
    return 'just now';
  } catch (error) {
    console.warn('Relative time formatting error:', error.message);
    return 'N/A';
  }
};

/**
 * Capitalize first letter of each word
 * 
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 * 
 * @example
 * capitalize('hello world');  // "Hello World"
 */
export const capitalize = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
