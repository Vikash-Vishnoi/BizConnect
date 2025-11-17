const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in query results by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // New RBAC role (takes precedence over legacy role field)
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Welcome message configuration per user
  welcomeMessageConfig: {
    enabled: {
      type: Boolean,
      default: true
    },
    strategy: {
      type: String,
      enum: ['template', 'text'],
      default: 'template'
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null
    },
    textMessage: {
      type: String,
      default: 'Hello! 👋 Thank you for contacting us. We\'ve received your message and will respond shortly.'
    },
    delay: {
      type: Number,
      default: 2000,
      min: 0,
      max: 60000
    },
    businessHoursEnabled: {
      type: Boolean,
      default: false
    },
    businessHours: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    },
    outsideHoursMessage: {
      type: String,
      default: 'Hello! 👋 Thank you for contacting us. We\'re currently outside business hours but will respond when we\'re back.'
    }
  },
  // Business location configuration
  businessLocation: {
    enabled: {
      type: Boolean,
      default: false
    },
    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
      default: null
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
      default: null
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    updatedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Get user's effective role (prioritize roleId over legacy role field)
userSchema.methods.getEffectiveRole = async function() {
  if (this.roleId) {
    const Role = require('./Role');
    return await Role.getRoleWithPermissions(this.roleId);
  }
  
  // Fallback to legacy role system
  return {
    name: this.role === 'admin' ? 'Admin (Legacy)' : 'User (Legacy)',
    code: this.role,
    permissions: [],
    isSystemRole: true,
    isLegacy: true
  };
};

// Check if user has a specific permission
userSchema.methods.hasPermission = async function(permissionCode) {
  // Legacy admin has all permissions
  if (this.role === 'admin' && !this.roleId) {
    return true;
  }
  
  if (!this.roleId) {
    return false;
  }
  
  const Role = require('./Role');
  const role = await Role.getRoleWithPermissions(this.roleId);
  
  if (!role) {
    return false;
  }
  
  return role.hasPermission(permissionCode);
};

// Get all user permissions
userSchema.methods.getPermissions = async function() {
  // Legacy admin has all permissions
  if (this.role === 'admin' && !this.roleId) {
    const Permission = require('./Permission');
    return await Permission.find({ isActive: true });
  }
  
  if (!this.roleId) {
    return [];
  }
  
  const Role = require('./Role');
  const role = await Role.findById(this.roleId).populate('permissions');
  
  return role ? role.permissions : [];
};

// Check if user has any of the specified permissions
userSchema.methods.hasAnyPermission = async function(permissionCodes) {
  for (const code of permissionCodes) {
    if (await this.hasPermission(code)) {
      return true;
    }
  }
  return false;
};

// Check if user has all of the specified permissions
userSchema.methods.hasAllPermissions = async function(permissionCodes) {
  for (const code of permissionCodes) {
    if (!(await this.hasPermission(code))) {
      return false;
    }
  }
  return true;
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
