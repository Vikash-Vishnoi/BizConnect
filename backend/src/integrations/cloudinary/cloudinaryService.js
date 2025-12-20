/**
 * Cloudinary Service
 * Handles media uploads to Cloudinary for WhatsApp Business integration
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../../common/helpers/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

class CloudinaryService {
  /**
   * Upload media file to Cloudinary
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - MIME type of the file
   * @param {string} filename - Original filename
   * @param {string} folder - Cloudinary folder (default: 'whatsapp-media')
   * @returns {Promise<Object>} Upload result with URL
   */
  async uploadMedia(fileBuffer, mimeType, filename, folder = 'whatsapp-media') {
    try {
      // Determine resource type from MIME type
      const resourceType = this.getResourceType(mimeType);
      
      // Convert buffer to base64 data URI
      const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      // Extract file extension
      const fileExtension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
      const baseFilename = filename.replace(/\.[^/.]+$/, '');

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64Data, {
        resource_type: resourceType,
        folder: folder,
        public_id: `${Date.now()}-${baseFilename}`,
        format: fileExtension || undefined, // Preserve original file extension
        overwrite: false,
        use_filename: true,
        unique_filename: true,
        // Optimization settings
        quality: 'auto',
        fetch_format: 'auto'
      });

      logger.info('Media uploaded to Cloudinary', {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      logger.error('Cloudinary upload error', {
        error: error.message,
        filename
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload multiple files to Cloudinary
   * @param {Array} files - Array of {buffer, mimeType, filename}
   * @param {string} folder - Cloudinary folder
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleMedia(files, folder = 'whatsapp-media') {
    const uploadPromises = files.map(file => 
      this.uploadMedia(file.buffer, file.mimeType, file.filename, folder)
    );
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete media from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMedia(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      logger.info('Media deleted from Cloudinary', {
        publicId,
        result: result.result
      });

      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      logger.error('Cloudinary deletion error', {
        error: error.message,
        publicId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get optimized URL for media
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Transformation options
   * @returns {string} Optimized URL
   */
  getOptimizedUrl(publicId, options = {}) {
    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };
    
    return cloudinary.url(publicId, defaultOptions);
  }

  /**
   * Determine Cloudinary resource type from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} Resource type (image, video, raw)
   */
  getResourceType(mimeType) {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'video'; // Cloudinary uses 'video' for audio files
    } else if (mimeType === 'application/pdf') {
      return 'image'; // Use 'image' for PDFs to allow inline viewing
    } else {
      return 'raw'; // Other documents
    }
  }

  /**
   * Get media info from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Resource type
   * @returns {Promise<Object>} Media info
   */
  async getMediaInfo(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        success: true,
        info: result
      };
    } catch (error) {
      logger.error('Cloudinary get info error', {
        error: error.message,
        publicId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new CloudinaryService();
