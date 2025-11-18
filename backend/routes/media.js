/**
 * Media Routes
 * 
 * Endpoints for managing media files in WhatsApp Business API
 * Upload, download, delete, and track media usage
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const Media = require('../models/Media');
const WhatsAppService = require('../services/whatsappService');

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit (WhatsApp limit)
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/webp',
      // Videos
      'video/mp4', 'video/3gpp',
      // Audio
      'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${file.mimetype}`));
    }
  }
});

// @route   POST /api/media/upload
// @desc    Upload media file to WhatsApp
// @access  Private
router.post('/upload', auth, requireBusiness, requireBusinessPermission('manage_conversations'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category, description, tags, autoDelete, autoDeleteAfterDays } = req.body;

    console.log('📤 Uploading file to WhatsApp...');
    console.log('   Filename:', req.file.originalname);
    console.log('   Size:', req.file.size);
    console.log('   MIME type:', req.file.mimetype);

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Upload to WhatsApp
    const result = await whatsappService.uploadMedia(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Determine media type from MIME type
    let mediaType = 'document';
    if (req.file.mimetype.startsWith('image/')) mediaType = 'image';
    else if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) mediaType = 'audio';
    else if (req.file.mimetype === 'image/webp' && req.body.isSticker) mediaType = 'sticker';

    // Save media record to database
    const media = new Media({
      businessId: req.businessId,
      whatsappMediaId: result.mediaId,
      filename: req.file.originalname,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      mediaType: mediaType,
      uploadedBy: req.user?.email || req.userId,
      category: category || 'general',
      description: description || '',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      autoDelete: autoDelete === 'true',
      autoDeleteAfterDays: parseInt(autoDeleteAfterDays) || 30
    });

    // Schedule auto-delete if enabled
    if (media.autoDelete) {
      await media.scheduleDelete();
    }

    await media.save();

    console.log('✅ Media uploaded and saved to database');

    res.status(201).json({
      success: true,
      media: {
        id: media._id,
        whatsappMediaId: media.whatsappMediaId,
        filename: media.filename,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        mediaType: media.mediaType,
        uploadedAt: media.uploadedAt
      }
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload media' });
  }
});

// @route   GET /api/media
// @desc    Get business's media files with filters
// @access  Private
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { mediaType, status, page, limit, sortBy, sortOrder } = req.query;

    const result = await Media.getUserMedia(req.businessId, {
      mediaType,
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy: sortBy || 'uploadedAt',
      sortOrder: sortOrder === 'asc' ? 1 : -1
    });

    res.json(result);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// @route   GET /api/media/stats
// @desc    Get media statistics
// @access  Private
router.get('/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const stats = await Media.getStats(req.businessId);
    res.json(stats);
  } catch (error) {
    console.error('Get media stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// @route   GET /api/media/:id
// @desc    Get single media file details
// @access  Private
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({ media });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// @route   GET /api/media/:id/url
// @desc    Get WhatsApp download URL for media
// @access  Private
router.get('/:id/url', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Get URL from WhatsApp
    const result = await whatsappService.getMediaUrl(media.whatsappMediaId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Update URL expiration
    media.whatsappUrl = result.url;
    media.urlExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await media.save();

    res.json({
      url: result.url,
      mimeType: result.mimeType,
      fileSize: result.fileSize,
      expiresAt: media.urlExpiresAt
    });
  } catch (error) {
    console.error('Get media URL error:', error);
    res.status(500).json({ error: 'Failed to get media URL' });
  }
});

// @route   GET /api/media/:id/download
// @desc    Download media file
// @access  Private
router.get('/:id/download', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Download from WhatsApp
    const result = await whatsappService.downloadMedia(media.whatsappMediaId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Set response headers
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${media.filename}"`);
    res.setHeader('Content-Length', result.fileSize);

    // Send file
    res.send(result.buffer);
  } catch (error) {
    console.error('Download media error:', error);
    res.status(500).json({ error: 'Failed to download media' });
  }
});

// @route   DELETE /api/media/:id
// @desc    Delete media file
// @access  Private
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Delete from WhatsApp
    const result = await whatsappService.deleteMedia(media.whatsappMediaId);

    if (!result.success && !result.message) {
      console.warn('WhatsApp delete failed, marking as deleted in DB anyway');
    }

    // Mark as deleted in database
    await media.markDeleted();

    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// @route   DELETE /api/media
// @desc    Bulk delete media files
// @access  Private
router.delete('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { mediaIds } = req.body;

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({ error: 'mediaIds array required' });
    }

    // Find media files
    const mediaFiles = await Media.find({
      _id: { $in: mediaIds },
      businessId: req.businessId
    });

    if (mediaFiles.length === 0) {
      return res.status(404).json({ error: 'No media files found' });
    }

    // Get business credentials and create WhatsApp service instance
    const credentials = await req.business.getWhatsAppCredentials();
    const whatsappService = new WhatsAppService(credentials);

    // Delete from WhatsApp
    const deleteResults = await Promise.all(
      mediaFiles.map(media => whatsappService.deleteMedia(media.whatsappMediaId))
    );

    // Mark as deleted in database
    await Media.bulkDelete(mediaIds);

    const successCount = deleteResults.filter(r => r.success || r.message).length;

    res.json({
      success: true,
      message: `Deleted ${successCount} of ${mediaFiles.length} media files`,
      deleted: successCount,
      total: mediaFiles.length
    });
  } catch (error) {
    console.error('Bulk delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media files' });
  }
});

// @route   PUT /api/media/:id
// @desc    Update media metadata
// @access  Private
router.put('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { category, description, tags, autoDelete, autoDeleteAfterDays } = req.body;

    const media = await Media.findOne({
      _id: req.params.id,
      businessId: req.businessId
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Update fields
    if (category) media.category = category;
    if (description !== undefined) media.description = description;
    if (tags) media.tags = tags.split(',').map(t => t.trim());
    if (autoDelete !== undefined) media.autoDelete = autoDelete === 'true' || autoDelete === true;
    if (autoDeleteAfterDays) media.autoDeleteAfterDays = parseInt(autoDeleteAfterDays);

    // Update auto-delete schedule if changed
    if (media.autoDelete && autoDeleteAfterDays) {
      await media.scheduleDelete(parseInt(autoDeleteAfterDays));
    }

    await media.save();

    res.json({ success: true, media });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

module.exports = router;
