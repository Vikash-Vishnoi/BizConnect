/**
 * Template Media Service
 * Handles media uploads for template headers (IMAGE, VIDEO, DOCUMENT)
 */

import { uploadFile } from '../api';

/**
 * Upload media for template header
 * @param {File} file - File object to upload
 * @param {string} headerType - Header type (IMAGE, VIDEO, DOCUMENT)
 * @param {Function} [onProgress] - Progress callback (0-100)
 * @returns {Promise<Object>} Upload response with Cloudinary URL
 */
export const uploadTemplateMedia = async (file, headerType, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('headerType', headerType);
  
  return await uploadFile('/templates/media/upload', formData, onProgress);
};

/**
 * Delete template media from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<Object>} Deletion response
 */
export const deleteTemplateMedia = async (publicId, resourceType = 'image') => {
  const encodedPublicId = encodeURIComponent(publicId);
  const response = await fetch(`/api/templates/media/${encodedPublicId}?resourceType=${resourceType}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-business-id': localStorage.getItem('businessId')
    }
  });
  
  return response.json();
};

export default {
  uploadTemplateMedia,
  deleteTemplateMedia
};
