const express = require('express');
const router = express.Router();

// Media routes
router.use('/', require('./media/index'));

module.exports = router;
