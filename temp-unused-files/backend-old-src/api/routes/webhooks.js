const express = require('express');
const router = express.Router();

// Webhook routes
router.use('/', require('./webhooks/index'));

module.exports = router;
