/**
 * Consolidated Analytics Routes
 * @module routes/analytics/analyticsRoutes
 */
 
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { businessContext } = require('../../../core/middlewares/businessContext');

// Apply business context middleware to all analytics routes
router.use(businessContext);

// ============================================================================
// CONSOLIDATED DASHBOARD/OVERVIEW/SUMMARY ROUTE
// ============================================================================
router.get('/', analyticsController.getDashboard);

// ============================================================================
// CONSOLIDATED TIMESERIES ROUTE
// ============================================================================
router.get('/timeseries', analyticsController.getTimeseries);

// ============================================================================
// CONVERSATION ANALYTICS
// ============================================================================
router.get('/conversations', analyticsController.getConversations);

// ============================================================================
// MESSAGE ANALYTICS
// ============================================================================
router.get('/messages', analyticsController.getMessages);

// ============================================================================
// CAMPAIGN ANALYTICS
// ============================================================================
router.get('/campaigns', analyticsController.getCampaigns);

// ============================================================================
// QUALITY SCORE
// ============================================================================
router.get('/quality', analyticsController.getQuality);

// ============================================================================
// EXPORT ANALYTICS
// ============================================================================
router.post('/export', analyticsController.exportAnalytics);

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================
router.delete('/cache', analyticsController.clearCache);

module.exports = router;
