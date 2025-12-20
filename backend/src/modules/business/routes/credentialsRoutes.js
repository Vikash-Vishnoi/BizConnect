/**
 * Business Credentials Routes
 * @module routes/business/credentialsRoutes
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Business = require('../../../core/database/models/Business');
const { requireBusinessAdmin } = require('../../../core/middlewares/authorization');
const { NotFoundError, AuthorizationError } = require('../../../core/middlewares/errorHandler');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');

// ============================================================================
// CONSTANTS
// ============================================================================

// Credential Fields
const CREDENTIAL_FIELD_ACCESS_TOKEN = 'accessToken';
const CREDENTIAL_FIELD_SYSTEM_USER_TOKEN = 'systemUserToken';
const CREDENTIAL_FIELD_APP_SECRET = 'appSecret';
const CREDENTIAL_FIELD_VERIFY_TOKEN = 'verifyToken';
const CREDENTIAL_FIELD_API_VERSION = 'apiVersion';

// Status Values
const STATUS_VERIFIED = 'verified';

// Token Generation
const TOKEN_BYTE_LENGTH = 32;
const TOKEN_ENCODING = 'hex';
const TOKEN_PREVIEW_LENGTH = 8;
const TOKEN_PREVIEW_SUFFIX = '...';
const TOKEN_PREVIEW_DEFAULT = 'none';

// Messages
const MSG_CREDENTIALS_UPDATED = 'Credentials updated successfully';
const MSG_VERIFY_TOKEN_REGENERATED = 'Verify token regenerated successfully';
const MSG_USAGE_RETRIEVED = 'Usage data retrieved successfully';

// Error Messages
const ERROR_BUSINESS_NOT_FOUND = 'Business not found';
const ERROR_ACCESS_DENIED = 'Access denied';
const ERROR_OWNER_ONLY = 'Only business owner can update credentials';
const ERROR_OWNER_REGENERATE_TOKEN = 'Only business owner can regenerate verify token';
const ERROR_FAILED_USAGE = 'Failed to fetch usage';
const ERROR_FAILED_REGENERATE_TOKEN = 'Failed to regenerate verify token';

// Audit Actions
const AUDIT_ACTION_REGENERATE_VERIFY_TOKEN = 'regenerate_verify_token';

// Audit Resources
const AUDIT_RESOURCE_BUSINESS = 'business';

// Default Values
const DEFAULT_METRICS_VALUE = 0;
const USAGE_PERIOD_ALL_TIME = 'all-time';

// Default Reasons
const DEFAULT_REASON_TOKEN_ROTATION = 'Security token rotation';

// ============================================================================
// ROUTES
// ============================================================================

// PUT /:id/credentials - Update WhatsApp credentials
// RBAC: Business Admin+ only - critical credentials
router.put('/:id/credentials', requireBusinessAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info('PUT /credentials starting', {
      businessId: req.params.id,
      userId: req.userId?.toString(),
      hasBody: !!req.body
    });

    const business = await Business.findById(req.params.id)
      .select('+whatsappConfig.accessToken +whatsappConfig.systemUserToken +whatsappConfig.appSecret');
  
    logger.info('Business found', {
      businessId: business?._id?.toString(),
      hasOwner: !!business?.owner,
      ownerValue: business?.owner?.toString()
    });

    if (!business) {
      throw new NotFoundError(ERROR_BUSINESS_NOT_FOUND);
    }
  
    if (business.owner.toString() !== req.userId.toString()) {
      logger.warn('Owner mismatch', {
        businessOwner: business.owner.toString(),
        requestUserId: req.userId.toString()
      });
      throw new AuthorizationError(ERROR_OWNER_ONLY);
    }
    
    const { accessToken, systemUserToken, appSecret, verifyToken, apiVersion } = req.body;
    
    logger.info('Updating credentials', {
      hasAccessToken: !!accessToken,
      hasSystemUserToken: !!systemUserToken,
      hasAppSecret: !!appSecret
    });

    if (accessToken) business.whatsappConfig.accessToken = accessToken;
    if (systemUserToken) business.whatsappConfig.systemUserToken = systemUserToken;
    if (appSecret) business.whatsappConfig.appSecret = appSecret;
    if (verifyToken) business.whatsappConfig.verifyToken = verifyToken;
    if (apiVersion) business.whatsappConfig.apiVersion = apiVersion;
    
    business.whatsappConfig.tokenLastRefreshedAt = new Date();
  
    logger.info('Saving business');
    await business.save();
    logger.info('Business saved successfully');
  
    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: MSG_CREDENTIALS_UPDATED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.id,
      processingTime
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update credentials',
      processingTime
    });
  }
});

// GET /:id/health - Get business health status
router.get('/:id/health', async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.params.id);
  
    if (!business.hasUser(req.userId)) {
      throw new AuthorizationError(ERROR_ACCESS_DENIED);
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
    
    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { health },
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.id,
      processingTime
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get health status',
      processingTime
    });
  }
});

// GET /:id/usage - Get usage statistics
router.get('/:id/usage', async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      throw new NotFoundError(ERROR_BUSINESS_NOT_FOUND);
    }
    
    if (!business.hasUser(req.userId)) {
      throw new AuthorizationError(ERROR_ACCESS_DENIED);
    }
    
    const usage = {
      messagesSent: business.metrics?.totalMessages || DEFAULT_METRICS_VALUE,
      conversationsActive: business.metrics?.activeConversations || DEFAULT_METRICS_VALUE,
      templatesApproved: business.metrics?.templatesApproved || DEFAULT_METRICS_VALUE,
      campaignsRun: business.metrics?.campaignsRun || DEFAULT_METRICS_VALUE,
      period: USAGE_PERIOD_ALL_TIME
    };
    
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: usage,
      message: MSG_USAGE_RETRIEVED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.id,
      processingTime
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get usage statistics',
      processingTime
    });
  }
});

// POST /:id/regenerate-verify-token - Regenerate webhook verify token
// RBAC: Business Admin+ only - security-critical operation
router.post('/:id/regenerate-verify-token', requireBusinessAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      throw new NotFoundError(ERROR_BUSINESS_NOT_FOUND);
    }
    
    if (business.owner.toString() !== req.userId.toString()) {
      throw new AuthorizationError(ERROR_OWNER_REGENERATE_TOKEN);
    } 
    
    // Generate new verify token
    const newVerifyToken = crypto.randomBytes(TOKEN_BYTE_LENGTH).toString(TOKEN_ENCODING);
    
    // Store old token for audit log
    const oldTokenPreview = business.whatsappConfig.verifyToken ? 
      business.whatsappConfig.verifyToken.substring(0, TOKEN_PREVIEW_LENGTH) + TOKEN_PREVIEW_SUFFIX : TOKEN_PREVIEW_DEFAULT;
    
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
        action: AUDIT_ACTION_REGENERATE_VERIFY_TOKEN,
        resource: AUDIT_RESOURCE_BUSINESS,
        resourceId: business._id,
        details: {
          oldTokenPreview,
          regeneratedAt: new Date(),
          reason: req.body.reason || DEFAULT_REASON_TOKEN_ROTATION
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (auditError) {
      logger.error('Failed to create audit log', {
        businessId: business._id?.toString(),
        error: auditError.message
      });
      // Don't fail the operation if audit logging fails
    }
    
    const processingTime = Date.now() - startTime;
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        message: MSG_VERIFY_TOKEN_REGENERATED,
        verifyToken: newVerifyToken,
        regeneratedAt: business.whatsappConfig.tokenLastRefreshedAt
      },
      message: MSG_VERIFY_TOKEN_REGENERATED,
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Route error', {
      error: error.message,
      stack: error.stack,
      businessId: req.params.id,
      processingTime
    });
    
    if (error instanceof NotFoundError) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: error.message,
        processingTime
      });
    }
    
    if (error instanceof AuthorizationError) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.AUTHORIZATION_ERROR,
        message: error.message,
        processingTime
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to regenerate verify token',
      processingTime
    });
  }
});

module.exports = router;
