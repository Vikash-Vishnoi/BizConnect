const express = require('express');
const router = express.Router();

// Auth routes
router.use('/', require('./auth/index'));

module.exports = router;
