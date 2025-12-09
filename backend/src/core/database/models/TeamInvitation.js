const mongoose = require('mongoose');

/**
 * Team Invitation Model
 * Manages team member invitations with role assignment
 */

const teamInvitationSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business ID is required'],
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: ['manager', 'normal_user'],
    required: [true, 'Role is required'],
    default: 'normal_user'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    },
    index: true
  },
},
 {
  timestamps: true
});

teamInvitationSchema.index({ businessId: 1, email: 1 });
teamInvitationSchema.index({ status: 1, expiresAt: 1 });
teamInvitationSchema.index({ token: 1 }, { unique: true });

teamInvitationSchema.methods.isExpired = function() {
  return this.expiresAt < new Date() || this.status === 'expired';
};

teamInvitationSchema.methods.markExpired = async function() {
  this.status = 'expired';
  await this.save();
};

teamInvitationSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result;
};

module.exports = mongoose.model('TeamInvitation', teamInvitationSchema);
