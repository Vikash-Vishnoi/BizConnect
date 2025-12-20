/**
 * Business Team Management Routes
 * @module routes/business/teamRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../core/database/models/Business');
const User = require('../../../core/database/models/User');
const { requireBusinessAdmin, canModify, enforceSingleBusinessAdmin } = require('../../../core/middlewares/authorization');
const { businessContext } = require('../../../core/middlewares/businessContext');
const { asyncHandler, NotFoundError, ValidationError, AuthorizationError, ConflictError } = require('../../../core/middlewares/errorHandler');
const logger = require('../../../common/helpers/logger');
const { validateBusiness } = require('../../../common/utils/validators');
const { ERROR_CODES, HTTP_STATUS } = require('../../../common/constants');

// ============================================================================
// CONSTANTS
// ============================================================================

const USER_TYPES = {
  MANAGER: 'manager',
  NORMAL_USER: 'normal_user'
};

const ALLOWED_USER_TYPES = [USER_TYPES.MANAGER, USER_TYPES.NORMAL_USER];

const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  INVALID_USER_TYPE: 'Invalid user type. Must be manager or normal_user',
  NO_PERMISSION: 'You do not have permission to manage team',
  CANNOT_REMOVE_OWNER: 'Cannot remove business owner from team'
};

// ============================================================================
// ROUTES
// ============================================================================

// POST /:id/team - Add team member
// RBAC: Business Admin+ only
router.post('/:id/team', 
  requireBusinessAdmin, 
  businessContext,
  enforceSingleBusinessAdmin,    // SECURITY: Prevent multiple business_admins
  async (req, res) => {
    const startTime = Date.now();
    try {
      const business = await validateBusiness(req.params.id);
      
      if (!req.user.hasPermission('manage', 'team')) {
        throw new AuthorizationError(ERROR_MESSAGES.NO_PERMISSION);
      }
      
      const { userId, email, userType } = req.body;
      
      let targetUser;
      if (userId) {
        targetUser = await User.findById(userId);
      } else if (email) {
        targetUser = await User.findOne({ email: email.toLowerCase() });
      }
      
      if (!targetUser) {
        throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      
      // Validate userType assignment
      if (!ALLOWED_USER_TYPES.includes(userType)) {
        throw new ValidationError(ERROR_MESSAGES.INVALID_USER_TYPE);
      }
      
      await business.addTeamMember(
        targetUser._id,
        userType,
        req.userId
      );
      
      await User.findByIdAndUpdate(targetUser._id, {
        businessId: business._id,
        userType: userType
      });
      
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { business },
        message: 'Team member added successfully',
        processingTime
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof NotFoundError || error instanceof ValidationError || 
          error instanceof AuthorizationError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Error adding team member', {
        error: error.message,
        businessId: req.params.id,
        processingTime
      });
      throw error;
    }
  });

// PUT /:id/team/:userId - Update team member role
// RBAC: Business Admin+ only
router.put('/:id/team/:userId', 
  requireBusinessAdmin,
  businessContext,
  enforceSingleBusinessAdmin,    // SECURITY: Prevent multiple business_admins
  async (req, res) => {
    const startTime = Date.now();
    try {
      const business = await validateBusiness(req.params.id);
      
      if (!req.user.hasPermission('manage', 'team')) {
        throw new AuthorizationError(ERROR_MESSAGES.NO_PERMISSION);
      }
      
      const { userType } = req.body;
      
      // Validate userType
      if (!ALLOWED_USER_TYPES.includes(userType)) {
        throw new ValidationError(ERROR_MESSAGES.INVALID_USER_TYPE);
      }
      
      await business.updateTeamMemberRole(req.params.userId, userType);
      
      await User.findByIdAndUpdate(req.params.userId, {
        userType: userType
      });
      
      const processingTime = Date.now() - startTime;
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { business },
        message: 'Team member updated successfully',
        processingTime
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof NotFoundError || error instanceof ValidationError || 
          error instanceof AuthorizationError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Error updating team member', {
        error: error.message,
        businessId: req.params.id,
        processingTime
      });
      throw error;
    }
  });

// DELETE /:id/team/:userId - Remove team member
router.delete('/:id/team/:userId', requireBusinessAdmin, businessContext, async (req, res) => {
  const startTime = Date.now();
  try {
    const business = await validateBusiness(req.params.id);
      
    if (!req.user.hasPermission('manage', 'team')) {
      throw new AuthorizationError(ERROR_MESSAGES.NO_PERMISSION);
    }
    
    if (business.owner.toString() === req.params.userId) {
      throw new ValidationError(ERROR_MESSAGES.CANNOT_REMOVE_OWNER);
    }
    
    await business.removeTeamMember(req.params.userId);
    
    await User.findByIdAndUpdate(
      req.params.userId,
      {
        businessId: null,
        userType: USER_TYPES.NORMAL_USER
      }
    );
    
    const processingTime = Date.now() - startTime;
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'Team member removed successfully',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof NotFoundError || error instanceof ValidationError || 
        error instanceof AuthorizationError || error instanceof ConflictError) {
      throw error;
    }
    
    logger.error('Error removing team member', {
      error: error.message,
      businessId: req.params.id,
      processingTime
    });
    throw error;
  }
});

module.exports = router;
