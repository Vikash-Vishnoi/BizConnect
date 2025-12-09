/**
 * Business Credentials Routes
 * @module routes/business/credentialsRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../core/database/models/Business');
const { requireBusinessAdmin } = require('../../../core/middlewares/rbac');

// PUT /:id/credentials - Update WhatsApp credentials
// RBAC: Business Admin+ only - critical credentials
router.put('/:id/credentials', requireBusinessAdmin, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .select('+whatsappConfig.accessToken +whatsappConfig.systemUserToken +whatsappConfig.appSecret');
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (business.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only business owner can update credentials'
      });
    }
    
    const { accessToken, systemUserToken, appSecret, verifyToken, apiVersion } = req.body;
    
    if (accessToken) business.whatsappConfig.accessToken = accessToken;
    if (systemUserToken) business.whatsappConfig.systemUserToken = systemUserToken;
    if (appSecret) business.whatsappConfig.appSecret = appSecret;
    if (verifyToken) business.whatsappConfig.verifyToken = verifyToken;
    if (apiVersion) business.whatsappConfig.apiVersion = apiVersion;
    
    business.whatsappConfig.tokenLastRefreshedAt = new Date();
    
    await business.save();
    
    res.json({
      success: true,
      message: 'Credentials updated successfully'
    });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update credentials'
    });
  }
});

// GET /:id/health - Get business health status
router.get('/:id/health', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const health = {
      businessId: business._id,
      name: business.name,
      phoneNumber: business.whatsappConfig.phoneNumber,
      phoneNumberId: business.whatsappConfig.phoneNumberId,
      verified: business.whatsappConfig.isVerified || false,
      qualityRating: business.metrics?.qualityRating || 'unknown',
      status: business.status,
      lastActivity: business.updatedAt
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching business health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business health'
    });
  }
});

// GET /:id/usage - Get usage statistics
router.get('/:id/usage', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (!business.hasUser(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const usage = {
      messagesSent: business.metrics?.totalMessages || 0,
      conversationsActive: business.metrics?.activeConversations || 0,
      templatesApproved: business.metrics?.templatesApproved || 0,
      campaignsRun: business.metrics?.campaignsRun || 0,
      period: 'all-time'
    };
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage'
    });
  }
});

// POST /:id/regenerate-verify-token - Regenerate webhook verify token
// RBAC: Business Admin+ only - security-critical operation
router.post('/:id/regenerate-verify-token', requireBusinessAdmin, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (business.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only business owner can regenerate verify token'
      });
    } 
    
    // Generate new verify token
    const crypto = require('crypto');
    const newVerifyToken = crypto.randomBytes(32).toString('hex');
    
    // Store old token for audit log
    const oldTokenPreview = business.whatsappConfig.verifyToken ? 
      business.whatsappConfig.verifyToken.substring(0, 8) + '...' : 'none';
    
    // Update business
    business.whatsappConfig.verifyToken = newVerifyToken;
    business.whatsappConfig.tokenLastRefreshedAt = new Date();
    
    await business.save();
    
    // Log the token regeneration in audit log
    try {
      const AuditLog = require('../../../core/database/models/AuditLog');
      await AuditLog.create({
        userId: req.userId,
        businessId: business._id,
        action: 'regenerate_verify_token',
        resource: 'business',
        resourceId: business._id,
        details: {
          oldTokenPreview,
          regeneratedAt: new Date(),
          reason: req.body.reason || 'Security token rotation'
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the operation if audit logging fails
    }
    
    res.json({
      success: true,
      message: 'Verify token regenerated successfully',
      verifyToken: newVerifyToken,
      regeneratedAt: business.whatsappConfig.tokenLastRefreshedAt
    });
  } catch (error) {
    console.error('Error regenerating verify token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate verify token'
    });
  }
});

module.exports = router;
