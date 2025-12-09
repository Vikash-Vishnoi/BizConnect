const express = require('express');
const router = express.Router();

// Contact management routes
router.use('/', require('./contacts/index'));
router.use('/deduplication', require('./contacts/deduplicationRoutes'));
router.use('/rate-limits', require('./contacts/rateLimitRoutes'));
router.use('/tags', require('./contacts/tagManagementRoutes'));
router.use('/tags/analytics', require('./contacts/tagAnalyticsRoutes'));
router.use('/bulk', require('./contacts/bulkOperationsRoutes'));
router.use('/bulk/tags', require('./contacts/bulkTagsRoutes'));
router.use('/bulk/utility', require('./contacts/bulkUtilityRoutes'));
router.use('/search', require('./contacts/index'));

module.exports = router;
