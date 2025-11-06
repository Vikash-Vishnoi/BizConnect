const RateLimit = require('../models/RateLimit');

class RateLimitService {
  async record(headers = {}, endpoint = '') {
    try {
      // WhatsApp/Meta may include headers like x-app-usage, x-business-use-case-usage, rate-limit-limit, rate-limit-remaining, rate-limit-reset
      const parsed = {};

      if (headers['x-app-usage']) parsed.appUsage = headers['x-app-usage'];
      if (headers['x-business-use-case-usage']) parsed.businessUsage = headers['x-business-use-case-usage'];
      if (headers['rate-limit-limit']) parsed.limit = Number(headers['rate-limit-limit']);
      if (headers['rate-limit-remaining']) parsed.remaining = Number(headers['rate-limit-remaining']);
      if (headers['rate-limit-reset']) {
        const reset = Number(headers['rate-limit-reset']);
        // If reset is UNIX seconds
        parsed.resetAt = Number.isFinite(reset) ? new Date(reset * 1000) : undefined;
      }

      const doc = new RateLimit({
        endpoint,
        headers: parsed,
        limit: parsed.limit,
        remaining: parsed.remaining,
        resetAt: parsed.resetAt
      });

      await doc.save();
      return doc;
    } catch (err) {
      console.error('RateLimitService.record error:', err);
      return null;
    }
  }

  async getLatest(limit = 50) {
    return RateLimit.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

module.exports = new RateLimitService();
