const express = require('express');
const router = express.Router();

// Analytics routes
router.use('/', require('./analytics/analyticsRoutes'));
router.use('/spending', require('./analytics/spendingRoutes'));
router.use('/audit-logs', require('./analytics/index'));
router.use('/export', require('./analytics/exportRoutes'));

module.exports = router;
