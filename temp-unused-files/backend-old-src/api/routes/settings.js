const express = require('express');
const router = express.Router();

// Settings routes
router.use('/', require('./settings/index'));
router.use('/welcome-message', require('./settings/welcomeMessageRoutes'));
router.use('/business-profile', require('./settings/businessProfileRoutes'));
router.use('/limits', require('./settings/limitsRoutes'));
router.use('/alerts', require('./settings/alertsRoutes'));
router.use('/alerts/actions', require('./settings/alertActionRoutes'));
router.use('/alerts/query', require('./settings/alertQueryRoutes'));
router.use('/phone-health', require('./settings/healthMonitoringRoutes'));
router.use('/phone-health/alerts', require('./settings/healthAlertsRoutes'));
router.use('/rate-limits', require('./settings/index'));
router.use('/opt-in', require('./settings/optOutDetectionRoutes'));
router.use('/config', require('./settings/index'));

module.exports = router;
