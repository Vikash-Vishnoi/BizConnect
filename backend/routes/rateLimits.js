const express = require('express');
const router = express.Router();
const { auth, isAdmin, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const rateLimitService = require('../services/rateLimitService');

// @route GET /api/rate-limits
// @desc  Get recent rate limit records (business-level)
// @access Private
router.get('/', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const items = await rateLimitService.getLatest(req.businessId, 50);
    res.json({ items });
  } catch (err) {
    console.error('Get rate limits error:', err);
    res.status(500).json({ error: 'Failed to get rate limits' });
  }
});

// @route GET /api/admin/rate-limits
// @desc  Admin: get more detailed rate limit records
// @access Private + Admin
router.get('/admin', auth, requireBusiness, isAdmin, async (req, res) => {
  try {
    const items = await rateLimitService.getLatest(req.businessId, 500);
    res.json({ items });
  } catch (err) {
    console.error('Admin get rate limits error:', err);
    res.status(500).json({ error: 'Failed to get rate limits' });
  }
});

module.exports = router;
