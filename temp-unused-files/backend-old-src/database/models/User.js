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
  refreshToken: {
    type: String,
    select: false // Don't include refresh token in query results by default
  },
  refreshTokenExpiry: {
    type: Date,
    select: false
  },
  userType: {
    type: String,
    enum: ['super_admin', 'business_admin', 'manager', 'normal_user'],
    default: 'business_admin', // Changed: First registration = business_admin
    required: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    default: null
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
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

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.getRoleInfo = function() {
  const roleMap = {
    super_admin: {
      name: 'Super Admin',
      description: 'App Owner - Full system access',
      level: 1
    },
    business_admin: {
      name: 'Business Admin',
      description: 'Business Owner - Full business access',
      level: 2
    },
    manager: {
      name: 'Manager',
      description: 'Complete inbox access, view-only for other modules',
      level: 3
    },
    normal_user: {
      name: 'Normal User',
      description: 'View-only access to all business modules',
      level: 4
    }
  };
  
  return roleMap[this.userType] || roleMap.normal_user;
};

userSchema.methods.hasPermission = function(action) {
  if (this.userType === 'super_admin') return true;
  
  if (this.userType === 'business_admin') return true;
  
  if (this.userType === 'manager') {
    return action === 'read' || action === 'view' || action === 'manage_inbox';
  }
  
  if (this.userType === 'normal_user') {
    return action === 'read' || action === 'view';
  }
  
  return false;
};

userSchema.methods.canAccessBusiness = function(businessId) {
  if (this.userType === 'super_admin') {
    return true;
  }
  
  if (!this.businessId) {
    return false;
  }
  
  return this.businessId.toString() === businessId.toString();
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
