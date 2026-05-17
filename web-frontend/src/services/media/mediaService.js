/**
 * 📁 Media Service
 * Handles media file upload, storage, and management for WhatsApp messages
 * Supports images, videos, audio, and documents
 * 
 * @module services/media/mediaService
 */

import { get, post, put, del, uploadFile as upload, downloadFile } from '../api';

/**
 * Upload media file to server and WhatsApp
 * @param {File} file - File object to upload
 * @param {Function} [onProgress] - Progress callback (percentage)
 * @returns {Promise<Object>} Upload response with media ID and URL
 */
export const uploadMedia = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return await upload('/media/upload', formData, onProgress);
};

/**
 * Upload multiple media files in batch
 * @param {File[]} files - Array of file objects
 * @param {Function} [onProgress] - Progress callback for all files
 * @returns {Promise<Object[]>} Array of upload responses
 */
export const uploadMultipleMedia = async (files, onProgress) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`files[${index}]`, file);
  });
  return await upload('/media/upload/batch', formData, onProgress);
};

/**
 * Get media list with filtering and pagination
 * @param {Object} [params] - Query parameters
 * @param {string} [params.type] - Filter by type (image, video, audio, document)
 * @param {string} [params.search] - Search by filename
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<Object>} Paginated media list
 */
export const getMedia = async (params) => {
  return await get('/media', params);
};

/**
 * Get media statistics
 * @returns {Promise<Object>} Media stats (total count, size, by type)
 */
export const getMediaStats = async () => {
  return await get('/media/stats');
};

/**
 * Get media by ID
 * @param {string} id - Media ID
 * @returns {Promise<Object>} Media details and metadata
 */
export const getMediaById = async (id) => {
  return await get(`/media/${id}`);
};

/**
 * Get media download URL (temporary signed URL)
 * @param {string} id - Media ID
 * @returns {Promise<Object>} Temporary download URL
 */
export const getMediaUrl = async (id) => {
  return await get(`/media/${id}/url`);
};

/**
 * Download media file to local device
 * @param {string} id - Media ID
 * @param {string} [filename] - Optional custom filename
 * @returns {Promise<Blob>} File blob for download
 */
export const downloadMedia = async (id, filename) => {
  const response = await get(`/media/${id}/download`, {}, { responseType: 'blob' });
  
  // Trigger browser download
  if (filename) {
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
  
  return response;
};

/**
 * Update media metadata (name, description, tags)
 * @param {string} id - Media ID
 * @param {Object} data - Updated metadata
 * @param {string} [data.name] - Custom name
 * @param {string} [data.description] - Description
 * @param {string[]} [data.tags] - Tags for organization
 * @returns {Promise<Object>} Updated media object
 */
export const updateMedia = async (id, data) => {
  return await put(`/media/${id}`, data);
};

/**
 * Delete media file
 * @param {string} id - Media ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteMedia = async (id) => {
  return await del(`/media/${id}`);
};

/**
 * Get media storage usage summary
 * @returns {Promise<Object>} Storage usage (used, total, percentage)
 */
export const getStorageUsage = async () => {
  return await get('/media/storage/usage');
};

/**
 * Validate media file before upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result with errors if any
 */
export const validateMediaFile = (file) => {
  const MAX_SIZE = 16 * 1024 * 1024; // 16MB for WhatsApp
  const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    video: ['video/mp4', 'video/3gpp'],
    audio: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    document: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/msword', 
               'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.openxmlformats-officedocument.presentationml.presentation',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  };

  const errors = [];

  // Check file size
  if (file.size > MAX_SIZE) {
    errors.push(`File size exceeds 16MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  // Check file type
  const isValidType = Object.values(ALLOWED_TYPES).flat().includes(file.type);
  if (!isValidType) {
    errors.push(`File type ${file.type} is not supported`);
  }

  return {
    valid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
    }
  };
};

// Default export with all media service methods
export default {
  uploadMedia,
  uploadMultipleMedia,
  getMedia,
  getMediaStats,
  getMediaById,
  getMediaUrl,
  downloadMedia,
  updateMedia,
  deleteMedia,
  getStorageUsage,
  validateMediaFile,
};

