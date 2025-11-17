const mongoose = require('mongoose');

/**
 * Permission Model
 * 
 * Defines granular permissions for RBAC system
 * 28 permissions across 7 resource categories
 */

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
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
  category: {
    type: String,
    enum: ['campaigns', 'templates', 'conversations', 'analytics', 'settings', 'users', 'media'],
    required: true
  },
  resource: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'execute', 'manage'],
    required: true
  },
  isSystemPermission: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
permissionSchema.index({ category: 1, isActive: 1 });
// Note: 'code' field already has unique: true, no need for separate index

/**
 * Seed default permissions
 */
permissionSchema.statics.seedPermissions = async function() {
  const permissions = [
    // CAMPAIGNS (6 permissions)
    {
      name: 'CREATE_CAMPAIGN',
      code: 'campaigns.create',
      description: 'Create new campaigns',
      category: 'campaigns',
      resource: 'Campaign',
      action: 'create'
    },
    {
      name: 'VIEW_CAMPAIGNS',
      code: 'campaigns.read',
      description: 'View campaigns',
      category: 'campaigns',
      resource: 'Campaign',
      action: 'read'
    },
    {
      name: 'UPDATE_CAMPAIGN',
      code: 'campaigns.update',
      description: 'Edit campaign details',
      category: 'campaigns',
      resource: 'Campaign',
      action: 'update'
    },
    {
      name: 'DELETE_CAMPAIGN',
      code: 'campaigns.delete',
      description: 'Delete campaigns',
      category: 'campaigns',
      resource: 'Campaign',
      action: 'delete'
    },
    {
      name: 'START_CAMPAIGN',
      code: 'campaigns.execute',
      description: 'Start/stop campaigns',
      category: 'campaigns',
      resource: 'Campaign',
      action: 'execute'
    },
    {
      name: 'MANAGE_CAMPAIGNS',
      code: 'campaigns.manage',
      description: 'Full campaign management',
      category: 'campaigns',
      resource: 'Campaign',
      action: 'manage'
    },
    
    // TEMPLATES (5 permissions)
    {
      name: 'CREATE_TEMPLATE',
      code: 'templates.create',
      description: 'Create message templates',
      category: 'templates',
      resource: 'Template',
      action: 'create'
    },
    {
      name: 'VIEW_TEMPLATES',
      code: 'templates.read',
      description: 'View templates',
      category: 'templates',
      resource: 'Template',
      action: 'read'
    },
    {
      name: 'UPDATE_TEMPLATE',
      code: 'templates.update',
      description: 'Edit templates',
      category: 'templates',
      resource: 'Template',
      action: 'update'
    },
    {
      name: 'DELETE_TEMPLATE',
      code: 'templates.delete',
      description: 'Delete templates',
      category: 'templates',
      resource: 'Template',
      action: 'delete'
    },
    {
      name: 'SUBMIT_TEMPLATE',
      code: 'templates.execute',
      description: 'Submit templates for approval',
      category: 'templates',
      resource: 'Template',
      action: 'execute'
    },
    
    // CONVERSATIONS (4 permissions)
    {
      name: 'VIEW_CONVERSATIONS',
      code: 'conversations.read',
      description: 'View conversations and messages',
      category: 'conversations',
      resource: 'Conversation',
      action: 'read'
    },
    {
      name: 'SEND_MESSAGE',
      code: 'conversations.create',
      description: 'Send messages to contacts',
      category: 'conversations',
      resource: 'Conversation',
      action: 'create'
    },
    {
      name: 'DELETE_MESSAGE',
      code: 'conversations.delete',
      description: 'Delete messages',
      category: 'conversations',
      resource: 'Conversation',
      action: 'delete'
    },
    {
      name: 'MANAGE_CONVERSATIONS',
      code: 'conversations.manage',
      description: 'Archive, assign, tag conversations',
      category: 'conversations',
      resource: 'Conversation',
      action: 'manage'
    },
    
    // ANALYTICS (2 permissions)
    {
      name: 'VIEW_ANALYTICS',
      code: 'analytics.read',
      description: 'View analytics and reports',
      category: 'analytics',
      resource: 'Analytics',
      action: 'read'
    },
    {
      name: 'EXPORT_DATA',
      code: 'analytics.execute',
      description: 'Export data and reports',
      category: 'analytics',
      resource: 'Analytics',
      action: 'execute'
    },
    
    // SETTINGS (4 permissions)
    {
      name: 'VIEW_SETTINGS',
      code: 'settings.read',
      description: 'View application settings',
      category: 'settings',
      resource: 'Settings',
      action: 'read'
    },
    {
      name: 'UPDATE_SETTINGS',
      code: 'settings.update',
      description: 'Modify application settings',
      category: 'settings',
      resource: 'Settings',
      action: 'update'
    },
    {
      name: 'MANAGE_AUTOMATIONS',
      code: 'settings.manage.automations',
      description: 'Create and manage automation rules',
      category: 'settings',
      resource: 'Settings',
      action: 'manage'
    },
    {
      name: 'MANAGE_INTEGRATIONS',
      code: 'settings.manage.integrations',
      description: 'Manage WhatsApp Business API settings',
      category: 'settings',
      resource: 'Settings',
      action: 'manage'
    },
    
    // USERS (4 permissions)
    {
      name: 'VIEW_USERS',
      code: 'users.read',
      description: 'View user accounts',
      category: 'users',
      resource: 'User',
      action: 'read'
    },
    {
      name: 'CREATE_USER',
      code: 'users.create',
      description: 'Create new user accounts',
      category: 'users',
      resource: 'User',
      action: 'create'
    },
    {
      name: 'UPDATE_USER',
      code: 'users.update',
      description: 'Edit user accounts',
      category: 'users',
      resource: 'User',
      action: 'update'
    },
    {
      name: 'DELETE_USER',
      code: 'users.delete',
      description: 'Delete user accounts',
      category: 'users',
      resource: 'User',
      action: 'delete'
    },
    
    // MEDIA (3 permissions)
    {
      name: 'VIEW_MEDIA',
      code: 'media.read',
      description: 'View media files',
      category: 'media',
      resource: 'Media',
      action: 'read'
    },
    {
      name: 'UPLOAD_MEDIA',
      code: 'media.create',
      description: 'Upload media files',
      category: 'media',
      resource: 'Media',
      action: 'create'
    },
    {
      name: 'DELETE_MEDIA',
      code: 'media.delete',
      description: 'Delete media files',
      category: 'media',
      resource: 'Media',
      action: 'delete'
    },
    
    // ✅ FEATURE 36: Audit Logs
    {
      name: 'VIEW_AUDIT_LOGS',
      code: 'audit.read',
      description: 'View audit logs and compliance records',
      category: 'audit',
      resource: 'AuditLog',
      action: 'read'
    },
    {
      name: 'EXPORT_AUDIT_LOGS',
      code: 'audit.export',
      description: 'Export audit logs to CSV',
      category: 'audit',
      resource: 'AuditLog',
      action: 'export'
    }
  ];
  
  let created = 0;
  let updated = 0;
  
  for (const perm of permissions) {
    const existing = await this.findOne({ code: perm.code });
    
    if (!existing) {
      await this.create(perm);
      created++;
    } else if (!existing.isSystemPermission) {
      // Update non-system permissions
      await this.findByIdAndUpdate(existing._id, perm);
      updated++;
    }
  }
  
  console.log(`✅ Permissions seeded: ${created} created, ${updated} updated`);
  return { created, updated };
};

/**
 * Get all permissions grouped by category
 */
permissionSchema.statics.getGroupedPermissions = async function() {
  const permissions = await this.find({ isActive: true }).sort({ category: 1, name: 1 });
  
  const grouped = {};
  
  permissions.forEach(perm => {
    if (!grouped[perm.category]) {
      grouped[perm.category] = [];
    }
    grouped[perm.category].push(perm);
  });
  
  return grouped;
};

/**
 * Get permissions by codes
 */
permissionSchema.statics.getByCode = async function(codes) {
  if (!Array.isArray(codes)) {
    codes = [codes];
  }
  
  return this.find({ code: { $in: codes }, isActive: true });
};

module.exports = mongoose.model('Permission', permissionSchema);
