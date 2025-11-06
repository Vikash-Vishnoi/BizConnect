const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  service: { type: String, default: 'whatsapp' },
  endpoint: { type: String },
  headers: { type: mongoose.Schema.Types.Mixed },
  limit: { type: Number },
  remaining: { type: Number },
  resetAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

rateLimitSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RateLimit', rateLimitSchema);
