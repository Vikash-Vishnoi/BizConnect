const express = require('express');
const router = express.Router();
const { auth, requireBusiness, requireBusinessPermission } = require('../middleware/auth');
const OptInConsent = require('../models/OptInConsent');

/**
 * @route   GET /api/opt-in
 * @desc    Get all consent records
 * @access  Private
 */
router.get('/', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { optedOut, channel, verified, limit = 100, skip = 0 } = req.query;
    
    const query = { businessId: req.businessId };
    
    if (optedOut !== undefined) {
      query.optedOut = optedOut === 'true';
    }
    
    if (channel) {
      query[`channels.${channel}.consented`] = true;
    }
    
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    
    const consents = await OptInConsent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await OptInConsent.countDocuments(query);
    
    res.json({
      consents: consents.map(c => c.getSummary()),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get consents error:', error);
    res.status(500).json({ error: 'Failed to get consent records' });
  }
});

/**
 * @route   GET /api/opt-in/stats
 * @desc    Get opt-in/opt-out statistics
 * @access  Private
 */
router.get('/stats', auth, requireBusiness, requireBusinessPermission('view_analytics'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await OptInConsent.getOptOutStats(req.businessId, parseInt(days));
    
    // Get channel breakdown
    const channelStats = await Promise.all([
      OptInConsent.countDocuments({
        businessId: req.businessId,
        'channels.marketing.consented': true,
        optedOut: false
      }),
      OptInConsent.countDocuments({
        businessId: req.businessId,
        'channels.service.consented': true,
        optedOut: false
      }),
      OptInConsent.countDocuments({
        businessId: req.businessId,
        'channels.promotional.consented': true,
        optedOut: false
      }),
      OptInConsent.countDocuments({
        businessId: req.businessId,
        'channels.transactional.consented': true,
        optedOut: false
      })
    ]);
    
    res.json({
      ...stats,
      channels: {
        marketing: channelStats[0],
        service: channelStats[1],
        promotional: channelStats[2],
        transactional: channelStats[3]
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * @route   GET /api/opt-in/:phoneNumber
 * @desc    Get consent record for a phone number
 * @access  Private
 */
router.get('/:phoneNumber', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    res.json({
      consent: {
        ...consent.toObject(),
        summary: consent.getSummary()
      }
    });
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json({ error: 'Failed to get consent record' });
  }
});

/**
 * @route   POST /api/opt-in/:phoneNumber/grant
 * @desc    Grant consent for a channel
 * @access  Private
 */
router.post('/:phoneNumber/grant', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { channel = 'marketing', source = 'manual', metadata = {} } = req.body;
    
    if (!['marketing', 'service', 'transactional', 'promotional'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }
    
    const consent = await OptInConsent.getOrCreate(req.businessId, req.params.phoneNumber);
    
    await consent.grantConsent(channel, source, metadata);
    
    res.json({
      message: 'Consent granted successfully',
      consent: consent.getSummary()
    });
  } catch (error) {
    console.error('Grant consent error:', error);
    res.status(500).json({ error: 'Failed to grant consent' });
  }
});

/**
 * @route   POST /api/opt-in/:phoneNumber/revoke
 * @desc    Revoke consent for a channel
 * @access  Private
 */
router.post('/:phoneNumber/revoke', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { channel = 'marketing', reason = 'user_request', source = 'manual' } = req.body;
    
    if (!['marketing', 'service', 'transactional', 'promotional'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }
    
    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    await consent.revokeConsent(channel, reason, source);
    
    res.json({
      message: 'Consent revoked successfully',
      consent: consent.getSummary()
    });
  } catch (error) {
    console.error('Revoke consent error:', error);
    res.status(500).json({ error: 'Failed to revoke consent' });
  }
});

/**
 * @route   POST /api/opt-in/:phoneNumber/opt-out
 * @desc    Opt out completely (all channels)
 * @access  Private
 */
router.post('/:phoneNumber/opt-out', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { reason = 'user_request', source = 'manual' } = req.body;
    
    const consent = await OptInConsent.getOrCreate(req.businessId, req.params.phoneNumber);
    
    await consent.optOutCompletely(reason, source);
    
    res.json({
      message: 'Contact opted out successfully',
      consent: consent.getSummary()
    });
  } catch (error) {
    console.error('Opt out error:', error);
    res.status(500).json({ error: 'Failed to opt out contact' });
  }
});

/**
 * @route   POST /api/opt-in/:phoneNumber/opt-in
 * @desc    Opt back in
 * @access  Private
 */
router.post('/:phoneNumber/opt-in', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { channels = ['marketing'], source = 'manual' } = req.body;
    
    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    await consent.optBackIn(channels, source);
    
    res.json({
      message: 'Contact opted back in successfully',
      consent: consent.getSummary()
    });
  } catch (error) {
    console.error('Opt in error:', error);
    res.status(500).json({ error: 'Failed to opt in contact' });
  }
});

/**
 * @route   POST /api/opt-in/:phoneNumber/verify
 * @desc    Verify consent (double opt-in)
 * @access  Private
 */
router.post('/:phoneNumber/verify', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { method = 'manual' } = req.body;
    
    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    await consent.verifyConsent(method);
    
    res.json({
      message: 'Consent verified successfully',
      consent: consent.getSummary()
    });
  } catch (error) {
    console.error('Verify consent error:', error);
    res.status(500).json({ error: 'Failed to verify consent' });
  }
});

/**
 * @route   GET /api/opt-in/:phoneNumber/history
 * @desc    Get consent history for a contact
 * @access  Private
 */
router.get('/:phoneNumber/history', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    res.json({
      history: consent.consentHistory.sort((a, b) => b.timestamp - a.timestamp),
      phoneNumber: consent.phoneNumber
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get consent history' });
  }
});

/**
 * @route   POST /api/opt-in/bulk-import
 * @desc    Bulk import consent records
 * @access  Private
 */
router.post('/bulk-import', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { contacts, channel = 'marketing', source = 'import' } = req.body;
    
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Contacts array is required' });
    }
    
    const results = await OptInConsent.bulkImport(
      req.businessId,
      contacts,
      channel,
      source
    );
    
    res.json({
      message: 'Bulk import completed',
      results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

/**
 * @route   GET /api/opt-in/channel/:channel/contacts
 * @desc    Get all contacts consented to a specific channel
 * @access  Private
 */
router.get('/channel/:channel/contacts', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { channel } = req.params;
    
    if (!['marketing', 'service', 'transactional', 'promotional'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }
    
    const contacts = await OptInConsent.getConsentedContacts(req.businessId, channel);
    
    res.json({
      contacts: contacts.map(c => c.getSummary()),
      count: contacts.length,
      channel
    });
  } catch (error) {
    console.error('Get channel contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

/**
 * @route   PUT /api/opt-in/:phoneNumber/preferences
 * @desc    Update contact preferences
 * @access  Private
 */
router.put('/:phoneNumber/preferences', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { frequency, quietHours, preferredLanguage, topics } = req.body;
    
    const consent = await OptInConsent.findOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    if (frequency) consent.preferences.frequency = frequency;
    if (quietHours) consent.preferences.quietHours = quietHours;
    if (preferredLanguage) consent.preferences.preferredLanguage = preferredLanguage;
    if (topics) consent.preferences.topics = topics;
    
    await consent.save();
    
    res.json({
      message: 'Preferences updated successfully',
      preferences: consent.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * @route   POST /api/opt-in/:phoneNumber/flag
 * @desc    Set flags (spam, blocked, invalid, doNotContact)
 * @access  Private
 */
router.post('/:phoneNumber/flag', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const { flag, value = true } = req.body;
    
    if (!['spam', 'blocked', 'invalid', 'doNotContact'].includes(flag)) {
      return res.status(400).json({ error: 'Invalid flag' });
    }
    
    const consent = await OptInConsent.getOrCreate(req.businessId, req.params.phoneNumber);
    
    consent.flags[flag] = value;
    await consent.save();
    
    res.json({
      message: 'Flag updated successfully',
      flags: consent.flags
    });
  } catch (error) {
    console.error('Update flag error:', error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

/**
 * @route   DELETE /api/opt-in/:phoneNumber
 * @desc    Delete consent record (GDPR right to be forgotten)
 * @access  Private
 */
router.delete('/:phoneNumber', auth, requireBusiness, requireBusinessPermission('manage_conversations'), async (req, res) => {
  try {
    const result = await OptInConsent.deleteOne({
      businessId: req.businessId,
      phoneNumber: req.params.phoneNumber
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    res.json({
      message: 'Consent record deleted successfully (GDPR compliance)'
    });
  } catch (error) {
    console.error('Delete consent error:', error);
    res.status(500).json({ error: 'Failed to delete consent record' });
  }
});

module.exports = router;
