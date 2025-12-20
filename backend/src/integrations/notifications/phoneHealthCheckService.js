/**
 * Phone Number Health Check Service
 * 
 * Automatically checks phone number health status every 6 hours
 * Updates health records and generates alerts/recommendations
 */

const cron = require('node-cron');
const logger = require('../../common/helpers/logger');
const { ERROR_CODES, TIME_CONSTANTS } = require('../../common/constants');
const { Business } = require('../../core/database/models');
const WhatsAppService = require('../whatsapp/whatsappService');

/**
 * Health Check Service Constants
 */
const HEALTH_CHECK_INTERVAL_HOURS = 6;
const HEALTH_CHECK_CRON = '0 */6 * * *'; // Every 6 hours at :00 minutes
const HEALTH_CHECK_THRESHOLD_MS = HEALTH_CHECK_INTERVAL_HOURS * TIME_CONSTANTS.HOUR_MS;

const ALERT_STATUS = {
  RESOLVED: 'RESOLVED',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE'
};

class PhoneHealthCheckService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Start the health check cron job
   * Runs every 6 hours
   */
  start() {
    if (this.isRunning) {
      logger.warn('Health check service is already running');
      return;
    }

    // Run every 6 hours (at :00 minutes)
    // Cron format: minute hour day month weekday
    this.cronJob = cron.schedule(HEALTH_CHECK_CRON, async () => {
      await this.runHealthCheck();
    });

    this.isRunning = true;
    logger.info(`Phone number health check service started (runs every ${HEALTH_CHECK_INTERVAL_HOURS} hours)`);
  }

  /**
   * Stop the health check cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      logger.info('Phone number health check service stopped');
    }
  }

  /**
   * Run health check for all users
   */
  async runHealthCheck() {
    try {
      logger.info('Running scheduled phone number health check');
      const startTime = Date.now();

      // Get all active businesses with WhatsApp configured
      const businesses = await Business.find({ 
        'whatsappConfig.phoneNumberId': { $exists: true },
        active: true
      });
      
      if (businesses.length === 0) {
        logger.info('No businesses found to check');
        return;
      }

      let checked = 0;
      let failed = 0;
      let alerts = 0;

      for (const business of businesses) {
        try {
          // Check if health check is needed (more than 6 hours since last check)
          const lastChecked = business.phoneNumberQuality?.lastCheckedAt;
          const thresholdTime = new Date(Date.now() - HEALTH_CHECK_THRESHOLD_MS);
          
          if (lastChecked && lastChecked > thresholdTime) {
            logger.debug('Skipping business - checked recently', {
              businessName: business.businessName,
              businessId: business._id.toString()
            });
            continue;
          }

          // Fetch health data from WhatsApp API
          const credentials = await business.getWhatsAppCredentials();
          const whatsappService = new WhatsAppService(credentials);
          const result = await whatsappService.checkPhoneHealth(business);

          if (!result.success) {
            logger.error('Failed to fetch health for business', {
              businessName: business.businessName,
              businessId: business._id.toString(),
              error: result.error,
              code: ERROR_CODES.EXTERNAL_SERVICE_ERROR
            });
            failed++;
            continue;
          }

          // Update phone quality
          await business.updatePhoneQuality({
            qualityRating: result.qualityRating,
            messagingLimitTier: result.messagingLimitTier,
            currentLimit: result.currentLimit
          });

          await business.save();

          checked++;

          // Count unresolved alerts
          const unresolvedAlerts = business.alerts?.filter(a => a.status !== ALERT_STATUS.RESOLVED).length || 0;
          alerts += unresolvedAlerts;

          logger.info('Business health check complete', {
            businessName: business.businessName,
            businessId: business._id.toString(),
            currentRating: business.phoneNumberQuality?.currentRating,
            unresolvedAlerts
          });

        } catch (businessError) {
          logger.error('Error checking business', {
            businessName: business.businessName,
            businessId: business._id?.toString(),
            error: businessError.message,
            code: businessError.code || ERROR_CODES.INTERNAL_ERROR
          });
          failed++;
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('Health check complete', {
        checked,
        failed,
        totalAlerts: alerts,
        processingTime: `${(processingTime / TIME_CONSTANTS.SECOND_MS).toFixed(2)}s`
      });

    } catch (error) {
      logger.error('Health check service error', {
        error: error.message,
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  /**
   * Run health check for a specific business
   * @param {ObjectId} businessId - Business ID
   */
  async checkBusiness(businessId) {
    try {
      logger.info('Running health check for business', { businessId });

      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Fetch health data from WhatsApp API
      const credentials = await business.getWhatsAppCredentials();
      const whatsappService = new WhatsAppService(credentials);
      const result = await whatsappService.checkPhoneHealth(business);

      if (!result.success) {
        throw new Error(`Failed to fetch health data: ${result.error}`);
      }

      // Update phone quality
      await business.updatePhoneQuality({
        qualityRating: result.qualityRating,
        messagingLimitTier: result.messagingLimitTier,
        phoneNumberId: result.data.phoneNumberId,
        phoneNumber: result.data.display_phone_number
      });

      logger.info('Business health check complete', { businessId });
      return business;

    } catch (error) {
      logger.error('User health check error', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDates() : null
    };
  }
}

module.exports = new PhoneHealthCheckService();
