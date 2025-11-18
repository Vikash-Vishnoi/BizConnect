/**
 * Database Optimization Routes
 * 
 * Admin routes for database maintenance and optimization
 * 
 * @route /api/database
 */

const express = require('express');
const router = express.Router();
const { auth, requireBusiness } = require('../middleware/auth');
const DatabaseOptimizationService = require('../services/databaseOptimizationService');

/**
 * @route   POST /api/database/optimize/indexes
 * @desc    Create all optimal database indexes
 * @access  Private (Admin)
 */
router.post('/optimize/indexes', auth, requireBusiness, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await DatabaseOptimizationService.createOptimalIndexes();

    res.json({
      success: true,
      message: 'Database indexes created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating indexes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create indexes',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/database/indexes
 * @desc    Get information about all database indexes
 * @access  Private (Admin)
 */
router.get('/indexes', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const indexInfo = await DatabaseOptimizationService.getIndexInfo();

    res.json({
      success: true,
      data: indexInfo
    });
  } catch (error) {
    console.error('Error getting index info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get index information',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/database/archive/campaigns
 * @desc    Archive old completed campaigns
 * @access  Private (Admin)
 */
router.post('/archive/campaigns', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { daysOld = 90 } = req.body;

    const result = await DatabaseOptimizationService.archiveOldCampaigns(daysOld, req.businessId);

    res.json({
      success: true,
      message: `Archived ${result.archivedCount} campaigns`,
      data: result
    });
  } catch (error) {
    console.error('Error archiving campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive campaigns',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/database/archive/conversations
 * @desc    Archive old inactive conversations
 * @access  Private (Admin)
 */
router.post('/archive/conversations', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { daysOld = 180 } = req.body;

    const result = await DatabaseOptimizationService.archiveOldConversations(daysOld, req.businessId);

    res.json({
      success: true,
      message: `Archived ${result.archivedCount} conversations`,
      data: result
    });
  } catch (error) {
    console.error('Error archiving conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversations',
      error: error.message
    });
  }
});

/**
 * CLEANUP ROUTES DISABLED
 * 
 * All data is preserved permanently per user requirement.
 * No deletion functionality is available.
 * Use archiving instead to organize old data.
 */

/**
 * @route   POST /api/database/optimize/conversations
 * @desc    Optimize large conversations by limiting message array size
 * @access  Private (Admin)
 */
router.post('/optimize/conversations', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { maxMessages = 1000 } = req.body;

    const result = await DatabaseOptimizationService.optimizeConversationSize(maxMessages, req.businessId);

    res.json({
      success: true,
      message: `Optimized ${result.optimizedCount} conversations`,
      data: result
    });
  } catch (error) {
    console.error('Error optimizing conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize conversations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/database/stats
 * @desc    Get database statistics and health metrics
 * @access  Private (Admin)
 */
router.get('/stats', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = await DatabaseOptimizationService.getDatabaseStats(req.businessId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/database/analyze
 * @desc    Analyze database performance and get recommendations
 * @access  Private (Admin)
 */
router.get('/analyze', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const analysis = await DatabaseOptimizationService.analyzePerformance(req.businessId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze database',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/database/optimize/full
 * @desc    Run full database optimization (all tasks)
 * @access  Private (Admin)
 */
router.post('/optimize/full', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const options = {
      createIndexes: req.body.createIndexes !== false,
      archiveCampaigns: req.body.archiveCampaigns !== false,
      archiveConversations: req.body.archiveConversations === true,
      campaignArchiveDays: req.body.campaignArchiveDays || 90,
      conversationArchiveDays: req.body.conversationArchiveDays || 180
    };

    const result = await DatabaseOptimizationService.runFullOptimization(options, req.businessId);

    res.json({
      success: true,
      message: 'Full database optimization completed',
      data: result
    });
  } catch (error) {
    console.error('Error running full optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run full optimization',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/database/maintenance
 * @desc    Run scheduled maintenance tasks
 * @access  Private (Admin)
 */
router.post('/maintenance', auth, requireBusiness, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await DatabaseOptimizationService.scheduledMaintenance();

    res.json({
      success: true,
      message: 'Scheduled maintenance completed',
      data: result
    });
  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run maintenance',
      error: error.message
    });
  }
});

module.exports = router;
