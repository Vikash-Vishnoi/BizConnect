import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get webhook URL from backend configuration
 * @returns {Promise<Object>} Configuration data including webhook URL
 */
export const getWebhookUrl = async () => {
  const response = await axios.get(`${API_URL}/config/webhook-url`);
  return response.data;
};

/**
 * Get general configuration information
 * @returns {Promise<Object>} Configuration data
 */
export const getConfigInfo = async () => {
  const response = await axios.get(`${API_URL}/config/info`);
  return response.data;
};
