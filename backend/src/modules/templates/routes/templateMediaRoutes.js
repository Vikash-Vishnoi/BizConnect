/**
 * Template Media Routes
 * Handles media uploads for template headers (IMAGE, VIDEO, DOCUMENT)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate: auth } = require('../../../core/middlewares/auth');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { requireBusinessPermission } = require('../../../core/middlewares/authorization');
const cloudinaryService = require('../../../integrations/cloudinary/cloudinaryService');
const logger = require('../../../common/helpers/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../../../common/constants');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for templates (documents can be large)
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/3gpp',
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * @route   POST /api/templates/media/upload
 * @desc    Upload media for template header (IMAGE, VIDEO, DOCUMENT)
 * @access  Private
 */
router.post('/upload', auth, businessContext, requireBusinessPermission('manage', 'templates'), upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'No file uploaded',
        errorCode: ERROR_CODES.VALIDATION_ERROR
      });
    }

    const { headerType } = req.body; // IMAGE, VIDEO, or DOCUMENT

    logger.info('Uploading template media to Cloudinary', {
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      headerType,
      businessId: req.business._id.toString()
    });

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinaryService.uploadMedia(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      `whatsapp-templates/${req.business._id.toString()}`
    );

    if (!cloudinaryResult.success) {
      const error = new Error(cloudinaryResult.error);
      error.code = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
      throw error;
    }

    const processingTime = Date.now() - startTime;
    logger.info('Template media uploaded to Cloudinary successfully', {
      cloudinaryUrl: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId,
      filename: req.file.originalname,
      headerType,
      businessId: req.business._id.toString(),
      processingTime
    });

    // Return media info for template creation
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      media: {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        headerType: headerType,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        uploadedAt: new Date()
      },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Template media upload error', {
      error: error.message,
      filename: req.file?.originalname,
      businessId: req.business?._id?.toString(),
      processingTime
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to upload template media',
      errorCode: error.code || ERROR_CODES.INTERNAL_ERROR,
      processingTime
    });
  }
});

/**
 * @route   DELETE /api/templates/media/:publicId
 * @desc    Delete template media from Cloudinary
 * @access  Private
 */
router.delete('/media/:publicId', auth, businessContext, requireBusinessPermission('manage', 'templates'), async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    // Decode publicId (it may be URL encoded)
    const decodedPublicId = decodeURIComponent(publicId);

    logger.info('Deleting template media from Cloudinary', {
      publicId: decodedPublicId,
      resourceType,
      businessId: req.business._id.toString()
    });

    const result = await cloudinaryService.deleteMedia(decodedPublicId, resourceType);

    if (!result.success) {
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        error: result.error,
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      });
    }

    res.json({
      success: true,
      message: 'Template media deleted successfully'
    });
  } catch (error) {
    logger.error('Template media deletion error', {
      error: error.message,
      publicId: req.params.publicId,
      businessId: req.business?._id?.toString()
    });

    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message || 'Failed to delete template media',
      errorCode: ERROR_CODES.INTERNAL_ERROR
    });
  }
});

module.exports = router;
