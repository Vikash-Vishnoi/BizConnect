

const isDevelopment = __DEV__;

export const logger = {

  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },


  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },


  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },


  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    } else {
      console.error('[ERROR]', 'An error occurred');
    }
  },


  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },


  api: (method: string, url: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`[API] ${method} ${url}`, data || '');
    }
  },


  navigation: (screen: string, params?: any): void => {
    if (isDevelopment) {
      console.log(`[NAV] → ${screen}`, params || '');
    }
  },


  socket: (event: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`[SOCKET] ${event}`, data || '');
    }
  },
};

export default logger;
