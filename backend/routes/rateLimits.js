const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const rateLimitService = require('../services/rateLimitService');

// @route GET /api/rate-limits
// @desc  Get recent rate limit records (user-level)
// @access Private
router.get('/', auth, async (req, res) => {
  try {
    const items = await rateLimitService.getLatest(50);
    res.json({ items });
  } catch (err) {
    console.error('Get rate limits error:', err);
    res.status(500).json({ error: 'Failed to get rate limits' });
  }
});

// @route GET /api/admin/rate-limits
// @desc  Admin: get more detailed rate limit records
// @access Private + Admin
router.get('/admin', auth, isAdmin, async (req, res) => {
  try {
    const items = await rateLimitService.getLatest(500);
    res.json({ items });
  } catch (err) {
    console.error('Admin get rate limits error:', err);
    res.status(500).json({ error: 'Failed to get rate limits' });
  }
});

module.exports = router;
