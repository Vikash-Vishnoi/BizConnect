import api from './api';

export const monitoringAPI = {
  getRateLimits: async () => {
    try {
      const response = await api.get('/rate-limits');
      return response.data.items || [];
    } catch (error: any) {
      console.error('Failed to fetch rate limits:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch rate limits');
    }
  },
};

export default monitoringAPI;
