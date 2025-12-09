/**
 * Phone Number Health Check Service
 * 
 * Automatically checks phone number health status every 6 hours
 * Updates health records and generates alerts/recommendations
 */

const cron = require('node-cron');
const { Business } = require('../../database/models');
const WhatsAppService = require('../whatsapp/whatsappService');
const whatsappService = new WhatsAppService();

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
      console.log('⚠️ Health check service is already running');
      return;
    }

    // Run every 6 hours (at :00 minutes)
    // Cron format: minute hour day month weekday
    // */6 * * * * would run every 6 hours
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      await this.runHealthCheck();
    });

    this.isRunning = true;
    console.log('✅ Phone number health check service started (runs every 6 hours)');
  }

  /**
   * Stop the health check cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('⏹️ Phone number health check service stopped');
    }
  }

  /**
   * Run health check for all users
   */
  async runHealthCheck() {
    try {
      console.log('🔍 Running scheduled phone number health check...');
      const startTime = Date.now();

      // Get all active businesses with WhatsApp configured
      const businesses = await Business.find({ 
        'whatsappConfig.phoneNumberId': { $exists: true },
        active: true
      });
      
      if (businesses.length === 0) {
        console.log('   No businesses found to check');
        return;
      }

      let checked = 0;
      let failed = 0;
      let alerts = 0;

      for (const business of businesses) {
        try {
          // Check if health check is needed (more than 6 hours since last check)
          const lastChecked = business.phoneNumberQuality?.lastCheckedAt;
          const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
          
          if (lastChecked && lastChecked > sixHoursAgo) {
            console.log(`   Skipping business ${business.businessName} - checked recently`);
            continue;
          }

          // Fetch health data from WhatsApp API
          const result = await whatsappService.checkPhoneHealth(business);

          if (!result.success) {
            console.error(`   Failed to fetch health for business ${business.businessName}:`, result.error);
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
          const unresolvedAlerts = business.alerts?.filter(a => a.status !== 'RESOLVED').length || 0;
          alerts += unresolvedAlerts;

          console.log(`   ✅ Business ${business.businessName}: ${business.phoneNumberQuality?.currentRating}, Alerts: ${unresolvedAlerts}`);

        } catch (businessError) {
          console.error(`   Error checking business ${business.businessName}:`, businessError.message);
          failed++;
        }
      }

      const duration = Date.now() - startTime;
      console.log('✅ Health check complete');
      console.log(`   Checked: ${checked}, Failed: ${failed}, Total Alerts: ${alerts}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

    } catch (error) {
      console.error('❌ Health check service error:', error);
    }
  }

  /**
   * Run health check for a specific business
   * @param {ObjectId} businessId - Business ID
   */
  async checkBusiness(businessId) {
    try {
      console.log(`🔍 Running health check for business ${businessId}...`);

      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Fetch health data from WhatsApp API
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

      console.log('✅ Business health check complete');
      return business;

    } catch (error) {
      console.error('❌ User health check error:', error);
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
