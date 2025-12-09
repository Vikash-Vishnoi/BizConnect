/**
 * 📁 Media Service
 * Handles media upload and management
 */

import { get, post, put, uploadFile as upload } from '../api';

/**
 * Upload media file
 */
export const uploadMedia = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return await upload('/media/upload', formData, onProgress);
};

/**
 * Get media list
 */
export const getMedia = async (params) => {
  return await get('/media', params);
};

/**
 * Get media statistics
 */
export const getMediaStats = async () => {
  return await get('/media/stats');
};

/**
 * Get media by ID
 */
export const getMediaById = async (id) => {
  return await get(`/media/${id}`);
};

/**
 * Get media download URL
 */
export const getMediaUrl = async (id) => {
  return await get(`/media/${id}/url`);
};

/**
 * Download media file
 */
export const downloadMedia = async (id) => {
  return await get(`/media/${id}/download`, {}, { responseType: 'blob' });
};

/**
 * Update media metadata
 */
export const updateMedia = async (id, data) => {
  return await put(`/media/${id}`, data);
};

