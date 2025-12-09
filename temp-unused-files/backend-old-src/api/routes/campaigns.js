const express = require('express');
const router = express.Router();

// Campaign routes
router.use('/', require('./campaigns/campaignManagementRoutes'));
router.use('/operations', require('./campaigns/campaignOperationsRoutes'));
router.use('/flows', require('./campaigns/flowManagementRoutes'));
router.use('/flows/analytics', require('./campaigns/flowAnalyticsRoutes'));
router.use('/scheduled', require('./campaigns/index'));

module.exports = router;
