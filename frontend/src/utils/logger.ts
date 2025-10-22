/**
 * Logger Utility
 * Provides conditional logging based on environment
 * Use this instead of console.log to prevent production logging
 */

const isDevelopment = __DEV__;

export const logger = {
  /**
   * Development only log - won't show in production
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },

  /**
   * Development only info - won't show in production
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Development only warn - won't show in production
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error logging - ALWAYS shows (even in production)
   * Sanitized for security
   */
  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, log generic message
      console.error('[ERROR]', 'An error occurred');
    }
  },

  /**
   * Debug logging - development only
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Network/API logging - development only
   */
  api: (method: string, url: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`[API] ${method} ${url}`, data || '');
    }
  },

  /**
   * Navigation logging - development only
   */
  navigation: (screen: string, params?: any): void => {
    if (isDevelopment) {
      console.log(`[NAV] → ${screen}`, params || '');
    }
  },

  /**
   * Socket event logging - development only
   */
  socket: (event: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`[SOCKET] ${event}`, data || '');
    }
  },
};

export default logger;
