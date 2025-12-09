/**
 * Business Team Management Routes
 * @module routes/business/teamRoutes
 */

const express = require('express');
const router = express.Router();
const Business = require('../../../database/models/Business');
const User = require('../../../database/models/User');
const { requireBusinessAdmin, canModify } = require('../../../api/middlewares/userTypeAuth');
const { enforceSingleBusinessAdmin } = require('../../../api/middlewares/businessSecurity');
const { requireBusinessAdmin: requireBusinessAdminRBAC } = require('../../../api/middlewares/rbac');
 
// POST /:id/team - Add team member
// RBAC: Business Admin+ only
router.post('/:id/team', 
  requireBusinessAdminRBAC,
  requireBusinessAdmin, 
  enforceSingleBusinessAdmin,    // SECURITY: Prevent multiple business_admins
  async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (!req.user.hasPermission('manage', 'team')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage team'
      });
    }
    
    const { userId, email, userType } = req.body;
    
    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Validate userType assignment
    const allowedUserTypes = ['manager', 'normal_user'];
    if (!allowedUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user type. Must be manager or normal_user'
      });
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
    
    res.json({
      success: true,
      message: 'Team member added successfully',
      data: business
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add team member'
    });
  }
});

// PUT /:id/team/:userId - Update team member role
// RBAC: Business Admin+ only
router.put('/:id/team/:userId', 
  requireBusinessAdminRBAC,
  requireBusinessAdmin,
  enforceSingleBusinessAdmin,    // SECURITY: Prevent multiple business_admins
  async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (!req.user.hasPermission('manage', 'team')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage team'
      });
    }
    
    const { userType } = req.body;
    
    // Validate userType
    const allowedUserTypes = ['manager', 'normal_user'];
    if (!allowedUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user type. Must be manager or normal_user'
      });
    }
    
    await business.updateTeamMemberRole(req.params.userId, userType);
    
    await User.findByIdAndUpdate(req.params.userId, {
      userType: userType
    });
    
    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: business
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team member'
    });
  }
});

// DELETE /:id/team/:userId - Remove team member
router.delete('/:id/team/:userId', requireBusinessAdmin, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    if (!req.user.hasPermission('manage', 'team')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to manage team'
      });
    }
    
    if (business.owner.toString() === req.params.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove business owner from team'
      });
    }
    
    await business.removeTeamMember(req.params.userId);
    
    await User.findByIdAndUpdate(
      req.params.userId,
      {
        businessId: null,
        userType: 'normal_user'
      }
    );
    
    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member'
    });
  }
});

module.exports = router;
