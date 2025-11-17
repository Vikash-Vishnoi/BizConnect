const mongoose = require('mongoose');

/**
 * Role Model
 * 
 * Defines user roles with assigned permissions
 * Supports both system roles and custom roles
 */

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isSystemRole: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
// Note: 'code' field already has unique: true, no need for separate index
roleSchema.index({ isActive: 1, isSystemRole: 1 });

/**
 * Check if role has a specific permission
 */
roleSchema.methods.hasPermission = function(permissionCode) {
  if (!this.populated('permissions')) {
    throw new Error('Permissions must be populated');
  }
  
  return this.permissions.some(perm => perm.code === permissionCode);
};

/**
 * Add permission to role
 */
roleSchema.methods.addPermission = async function(permissionId) {
  if (!this.permissions.includes(permissionId)) {
    this.permissions.push(permissionId);
    await this.save();
  }
};

/**
 * Remove permission from role
 */
roleSchema.methods.removePermission = async function(permissionId) {
  this.permissions = this.permissions.filter(
    id => id.toString() !== permissionId.toString()
  );
  await this.save();
};

/**
 * Seed default roles
 */
roleSchema.statics.seedRoles = async function() {
  const Permission = require('./Permission');
  
  // Get all permissions
  const allPermissions = await Permission.find({ isActive: true });
  
  // Define role permission mappings
  const roles = [
    {
      name: 'Super Admin',
      code: 'super_admin',
      description: 'Full system access with all permissions',
      isSystemRole: true,
      isDefault: false,
      permissions: allPermissions.map(p => p._id) // All permissions
    },
    {
      name: 'Admin',
      code: 'admin',
      description: 'Administrative access with most permissions',
      isSystemRole: true,
      isDefault: false,
      permissions: allPermissions
        .filter(p => p.code !== 'users.delete') // Cannot delete users
        .map(p => p._id)
    },
    {
      name: 'Manager',
      code: 'manager',
      description: 'Manage campaigns and view analytics',
      isSystemRole: true,
      isDefault: false,
      permissions: allPermissions
        .filter(p => 
          p.category === 'campaigns' ||
          p.category === 'templates' ||
          p.category === 'analytics' ||
          p.code === 'conversations.read' ||
          p.code === 'conversations.create' ||
          p.code === 'media.read' ||
          p.code === 'media.create'
        )
        .map(p => p._id)
    },
    {
      name: 'Agent',
      code: 'agent',
      description: 'Handle conversations and send messages',
      isSystemRole: true,
      isDefault: true, // Default role for new users
      permissions: allPermissions
        .filter(p =>
          p.code === 'conversations.read' ||
          p.code === 'conversations.create' ||
          p.code === 'conversations.manage' ||
          p.code === 'templates.read' ||
          p.code === 'media.read' ||
          p.code === 'media.create'
        )
        .map(p => p._id)
    },
    {
      name: 'Viewer',
      code: 'viewer',
      description: 'Read-only access to conversations and analytics',
      isSystemRole: true,
      isDefault: false,
      permissions: allPermissions
        .filter(p =>
          p.action === 'read' ||
          p.code === 'analytics.read'
        )
        .map(p => p._id)
    }
  ];
  
  let created = 0;
  let updated = 0;
  
  for (const roleData of roles) {
    const existing = await this.findOne({ code: roleData.code });
    
    if (!existing) {
      await this.create(roleData);
      created++;
    } else {
      // Update system roles
      await this.findByIdAndUpdate(existing._id, {
        $set: {
          permissions: roleData.permissions,
          description: roleData.description,
          isActive: true
        }
      });
      updated++;
    }
  }
  
  console.log(`✅ Roles seeded: ${created} created, ${updated} updated`);
  return { created, updated };
};

/**
 * Get role with populated permissions
 */
roleSchema.statics.getRoleWithPermissions = async function(roleId) {
  return this.findById(roleId).populate('permissions');
};

/**
 * Get default role
 */
roleSchema.statics.getDefaultRole = async function() {
  return this.findOne({ isDefault: true, isActive: true });
};

/**
 * Get all active roles
 */
roleSchema.statics.getActiveRoles = async function() {
  return this.find({ isActive: true })
    .sort({ isSystemRole: -1, name: 1 })
    .populate('permissions');
};

/**
 * Create custom role
 */
roleSchema.statics.createCustomRole = async function(data, createdBy) {
  const role = new this({
    name: data.name,
    code: data.code || data.name.toLowerCase().replace(/\s+/g, '_'),
    description: data.description,
    permissions: data.permissions || [],
    isSystemRole: false,
    isActive: true,
    createdBy: createdBy
  });
  
  await role.save();
  return role;
};

/**
 * Count users by role
 */
roleSchema.statics.getUserCountByRole = async function() {
  const User = require('./User');
  
  const counts = await User.aggregate([
    {
      $group: {
        _id: '$roleId',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const roles = await this.find({ isActive: true });
  
  const result = roles.map(role => {
    const countData = counts.find(c => c._id && c._id.toString() === role._id.toString());
    return {
      roleId: role._id,
      roleName: role.name,
      roleCode: role.code,
      userCount: countData ? countData.count : 0
    };
  });
  
  return result;
};

module.exports = mongoose.model('Role', roleSchema);
