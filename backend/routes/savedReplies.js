const express = require('express');
const router = express.Router();
const SavedReply = require('../models/SavedReply');
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');

// Get all saved replies for the authenticated user
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { category, search, isActive = 'true' } = req.query;

    // Build filter
    const filter = {
      businessId: req.businessId,
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { shortcut: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const savedReplies = await SavedReply.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: savedReplies,
      count: savedReplies.length,
    });
  } catch (error) {
    console.error('Error fetching saved replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved replies',
      error: error.message,
    });
  }
});

// Get a single saved reply by ID
router.get('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const savedReply = await SavedReply.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(404).json({
        success: false,
        message: 'Saved reply not found',
      });
    }

    res.json({
      success: true,
      data: savedReply,
    });
  } catch (error) {
    console.error('Error fetching saved reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved reply',
      error: error.message,
    });
  }
});

// Create a new saved reply
router.post('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { shortcut, message, category } = req.body;

    // Validation
    if (!shortcut || !shortcut.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Shortcut is required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    if (message.length > 4096) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds WhatsApp limit (4096 characters)',
      });
    }

    // Check for duplicate shortcut
    const existingReply = await SavedReply.findOne({
      businessId: req.businessId,
      shortcut: shortcut.trim(),
      isActive: true,
    });

    if (existingReply) {
      return res.status(400).json({
        success: false,
        message: 'A saved reply with this shortcut already exists',
      });
    }

    // Create saved reply
    const savedReply = new SavedReply({
      businessId: req.businessId,
      shortcut: shortcut.trim(),
      message: message.trim(),
      category: category || 'other',
    });

    await savedReply.save();

    res.status(201).json({
      success: true,
      message: 'Saved reply created successfully',
      data: savedReply,
    });
  } catch (error) {
    console.error('Error creating saved reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create saved reply',
      error: error.message,
    });
  }
});

// Update a saved reply
router.put('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { shortcut, message, category, isActive } = req.body;

    const savedReply = await SavedReply.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(404).json({
        success: false,
        message: 'Saved reply not found',
      });
    }

    // Validation
    if (message && message.length > 4096) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds WhatsApp limit (4096 characters)',
      });
    }

    // Check for duplicate shortcut (if changing shortcut)
    if (shortcut && shortcut.trim() !== savedReply.shortcut) {
      const existingReply = await SavedReply.findOne({
        businessId: req.businessId,
        shortcut: shortcut.trim(),
        isActive: true,
        _id: { $ne: req.params.id },
      });

      if (existingReply) {
        return res.status(400).json({
          success: false,
          message: 'A saved reply with this shortcut already exists',
        });
      }
    }

    // Update fields
    if (shortcut !== undefined) savedReply.shortcut = shortcut.trim();
    if (message !== undefined) savedReply.message = message.trim();
    if (category !== undefined) savedReply.category = category;
    if (isActive !== undefined) savedReply.isActive = isActive;

    await savedReply.save();

    res.json({
      success: true,
      message: 'Saved reply updated successfully',
      data: savedReply,
    });
  } catch (error) {
    console.error('Error updating saved reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update saved reply',
      error: error.message,
    });
  }
});

// Delete a saved reply
router.delete('/:id', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const savedReply = await SavedReply.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(404).json({
        success: false,
        message: 'Saved reply not found',
      });
    }

    res.json({
      success: true,
      message: 'Saved reply deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting saved reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete saved reply',
      error: error.message,
    });
  }
});

// Increment usage count for a saved reply
router.post('/:id/use', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const savedReply = await SavedReply.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!savedReply) {
      return res.status(404).json({
        success: false,
        message: 'Saved reply not found',
      });
    }

    await savedReply.incrementUsage();

    res.json({
      success: true,
      message: 'Usage count incremented',
      data: savedReply,
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment usage count',
      error: error.message,
    });
  }
});

// Get popular saved replies (most used)
router.get('/stats/popular', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const popularReplies = await SavedReply.find({
      businessId: req.businessId,
      isActive: true,
      usageCount: { $gt: 0 },
    })
      .sort({ usageCount: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: popularReplies,
    });
  } catch (error) {
    console.error('Error fetching popular replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular replies',
      error: error.message,
    });
  }
});

module.exports = router;
