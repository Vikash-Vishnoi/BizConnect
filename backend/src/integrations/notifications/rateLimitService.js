const RateLimit = require('../../core/database/models/RateLimit');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');

/**
 * Rate Limit Service Constants
 */
const RATE_LIMIT_HEADERS = {
  APP_USAGE: 'x-app-usage',
  BUSINESS_USAGE: 'x-business-use-case-usage',
  LIMIT: 'rate-limit-limit',
  REMAINING: 'rate-limit-remaining',
  RESET: 'rate-limit-reset'
};

const DEFAULT_QUERY_LIMIT = 50;

class RateLimitService {
  async record(headers = {}, endpoint = '') {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (!headers || typeof headers !== 'object') {
        logger.warn('Invalid headers provided to rate limit service', {
          code: ERROR_CODES.VALIDATION_ERROR
        });
        return null;
      }

      // WhatsApp/Meta may include headers like x-app-usage, x-business-use-case-usage, rate-limit-limit, rate-limit-remaining, rate-limit-reset
      const parsed = {};

      if (headers[RATE_LIMIT_HEADERS.APP_USAGE]) {
        parsed.appUsage = headers[RATE_LIMIT_HEADERS.APP_USAGE];
      }
      if (headers[RATE_LIMIT_HEADERS.BUSINESS_USAGE]) {
        parsed.businessUsage = headers[RATE_LIMIT_HEADERS.BUSINESS_USAGE];
      }
      if (headers[RATE_LIMIT_HEADERS.LIMIT]) {
        parsed.limit = Number(headers[RATE_LIMIT_HEADERS.LIMIT]);
      }
      if (headers[RATE_LIMIT_HEADERS.REMAINING]) {
        parsed.remaining = Number(headers[RATE_LIMIT_HEADERS.REMAINING]);
      }
      if (headers[RATE_LIMIT_HEADERS.RESET]) {
        const reset = Number(headers[RATE_LIMIT_HEADERS.RESET]);
        // If reset is UNIX seconds
        parsed.resetAt = Number.isFinite(reset) ? new Date(reset * TIME_CONSTANTS.SECOND_MS) : undefined;
      }

      const doc = new RateLimit({
        endpoint,
        headers: parsed,
        limit: parsed.limit,
        remaining: parsed.remaining,
        resetAt: parsed.resetAt
      });

      await doc.save();
      
      logger.debug('Rate limit recorded', {
        endpoint,
        remaining: parsed.remaining,
        limit: parsed.limit,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return doc;
    } catch (err) {
      logger.error('Failed to record rate limit', {
        endpoint,
        error: err.message,
        code: err.code || ERROR_CODES.INTERNAL_ERROR,
        processingTime: `${Date.now() - startTime}ms`
      });
      return null;
    }
  }

  async getLatest(limit = DEFAULT_QUERY_LIMIT) {
    try {
      const queryLimit = Math.min(parseInt(limit) || DEFAULT_QUERY_LIMIT, 100);
      return await RateLimit.find({}).sort({ createdAt: -1 }).limit(queryLimit).lean();
    } catch (err) {
      logger.error('Failed to fetch rate limits', {
        error: err.message,
        code: ERROR_CODES.DATABASE_ERROR
      });
      return [];
    }
  }
}

module.exports = new RateLimitService();
