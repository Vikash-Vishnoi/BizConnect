const express = require('express');
const router = express.Router();

// Business management routes
router.use('/', require('./business/businessRoutes'));
router.use('/credentials', require('./business/credentialsRoutes'));
router.use('/verification', require('./business/verificationRoutes'));
router.use('/location', require('./business/businessLocationRoutes'));
router.use('/team', require('./business/teamRoutes'));
router.use('/profile', require('./business/profileRoutes'));

module.exports = router;
