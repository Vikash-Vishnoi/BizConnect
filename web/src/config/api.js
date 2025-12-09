/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Remove /api suffix if it exists for base server URL
export const SERVER_URL = API_BASE_URL.replace('/api', '');

export default {
  API_BASE_URL,
  API_URL,
  SERVER_URL
};
