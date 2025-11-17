const express = require('express');
const router = express.Router();
const { auth, isAdmin, requirePermission } = require('../middleware/auth');
const { Role, Permission, User } = require('../models');

/**
 * RBAC Routes
 * 
 * Endpoints for managing roles and permissions
 */

// @route   GET /api/rbac/roles
// @desc    Get all roles
// @access  Private (Admin)
router.get('/roles', auth, isAdmin, async (req, res) => {
  try {
    const roles = await Role.getActiveRoles();
    
    // Get user counts for each role
    const userCounts = await Role.getUserCountByRole();
    
    // Merge user counts with roles
    const rolesWithCounts = roles.map(role => {
      const countData = userCounts.find(c => c.roleId.toString() === role._id.toString());
      return {
        ...role.toObject(),
        userCount: countData ? countData.userCount : 0
      };
    });
    
    res.json({
      success: true,
      roles: rolesWithCounts
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
});

// @route   GET /api/rbac/roles/:id
// @desc    Get role details with permissions
// @access  Private (Admin)
router.get('/roles/:id', auth, isAdmin, async (req, res) => {
  try {
    const role = await Role.getRoleWithPermissions(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Get user count
    const userCounts = await Role.getUserCountByRole();
    const countData = userCounts.find(c => c.roleId.toString() === role._id.toString());
    
    res.json({
      success: true,
      role: {
        ...role.toObject(),
        userCount: countData ? countData.userCount : 0
      }
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role details'
    });
  }
});

// @route   POST /api/rbac/roles
// @desc    Create a new custom role
// @access  Private (Admin)
router.post('/roles', auth, isAdmin, async (req, res) => {
  try {
    const { name, code, description, permissions } = req.body;
    
    // Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }
    
    // Create role
    const role = await Role.createCustomRole({
      name,
      code,
      description,
      permissions: permissions || []
    }, req.userId);
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role
    });
  } catch (error) {
    console.error('Error creating role:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Role with this name or code already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create role'
    });
  }
});

// @route   PUT /api/rbac/roles/:id
// @desc    Update role details
// @access  Private (Admin)
router.put('/roles/:id', auth, isAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Prevent editing system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        error: 'System roles cannot be modified'
      });
    }
    
    const { name, description, permissions } = req.body;
    
    // Update role
    if (name) role.name = name;
    if (description) role.description = description;
    if (permissions) role.permissions = permissions;
    role.updatedBy = req.userId;
    
    await role.save();
    
    res.json({
      success: true,
      message: 'Role updated successfully',
      role
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role'
    });
  }
});

// @route   DELETE /api/rbac/roles/:id
// @desc    Delete a custom role
// @access  Private (Admin)
router.delete('/roles/:id', auth, isAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Prevent deleting system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        error: 'System roles cannot be deleted'
      });
    }
    
    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ roleId: role._id });
    
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`
      });
    }
    
    // Soft delete (deactivate)
    role.isActive = false;
    await role.save();
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role'
    });
  }
});

// @route   GET /api/rbac/permissions
// @desc    Get all permissions grouped by category
// @access  Private (Admin)
router.get('/permissions', auth, isAdmin, async (req, res) => {
  try {
    const grouped = await Permission.getGroupedPermissions();
    
    res.json({
      success: true,
      permissions: grouped
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
});

// @route   POST /api/rbac/roles/:id/permissions
// @desc    Assign permissions to a role
// @access  Private (Admin)
router.post('/roles/:id/permissions', auth, isAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Prevent editing system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        error: 'System role permissions cannot be modified'
      });
    }
    
    const { permissionIds } = req.body;
    
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Permission IDs array is required'
      });
    }
    
    // Verify all permissions exist
    const permissions = await Permission.find({
      _id: { $in: permissionIds },
      isActive: true
    });
    
    if (permissions.length !== permissionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more invalid permission IDs'
      });
    }
    
    // Add permissions (avoiding duplicates)
    for (const permId of permissionIds) {
      await role.addPermission(permId);
    }
    
    const updatedRole = await Role.getRoleWithPermissions(role._id);
    
    res.json({
      success: true,
      message: 'Permissions assigned successfully',
      role: updatedRole
    });
  } catch (error) {
    console.error('Error assigning permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign permissions'
    });
  }
});

// @route   DELETE /api/rbac/roles/:id/permissions/:permissionId
// @desc    Remove permission from a role
// @access  Private (Admin)
router.delete('/roles/:id/permissions/:permissionId', auth, isAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    // Prevent editing system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        error: 'System role permissions cannot be modified'
      });
    }
    
    await role.removePermission(req.params.permissionId);
    
    const updatedRole = await Role.getRoleWithPermissions(role._id);
    
    res.json({
      success: true,
      message: 'Permission removed successfully',
      role: updatedRole
    });
  } catch (error) {
    console.error('Error removing permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove permission'
    });
  }
});

// @route   GET /api/rbac/users/:userId/permissions
// @desc    Get user's effective permissions
// @access  Private (Admin or Self)
router.get('/users/:userId/permissions', auth, async (req, res) => {
  try {
    // Only allow users to view their own permissions or admins to view any
    if (req.userId.toString() !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const permissions = await user.getPermissions();
    const role = await user.getEffectiveRole();
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      role: {
        name: role.name,
        code: role.code,
        isLegacy: role.isLegacy || false
      },
      permissions: permissions.map(p => ({
        id: p._id,
        name: p.name,
        code: p.code,
        description: p.description,
        category: p.category,
        resource: p.resource,
        action: p.action
      }))
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user permissions'
    });
  }
});

// @route   PUT /api/rbac/users/:userId/role
// @desc    Assign role to a user
// @access  Private (Admin)
router.put('/users/:userId/role', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'Role ID is required'
      });
    }
    
    // Verify role exists
    const role = await Role.findById(roleId);
    
    if (!role || !role.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Role not found or inactive'
      });
    }
    
    // Update user role
    user.roleId = roleId;
    await user.save();
    
    res.json({
      success: true,
      message: 'Role assigned successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roleId: user.roleId
      },
      role: {
        id: role._id,
        name: role.name,
        code: role.code
      }
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign role'
    });
  }
});

// @route   POST /api/rbac/seed
// @desc    Seed default permissions and roles (development only)
// @access  Private (Admin)
router.post('/seed', auth, isAdmin, async (req, res) => {
  try {
    // Seed permissions first
    const permResult = await Permission.seedPermissions();
    
    // Then seed roles
    const roleResult = await Role.seedRoles();
    
    res.json({
      success: true,
      message: 'RBAC system seeded successfully',
      permissions: permResult,
      roles: roleResult
    });
  } catch (error) {
    console.error('Error seeding RBAC:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed RBAC system'
    });
  }
});

module.exports = router;
