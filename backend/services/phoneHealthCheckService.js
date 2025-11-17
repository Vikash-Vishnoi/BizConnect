/**
 * Phone Number Health Check Service
 * 
 * Automatically checks phone number health status every 6 hours
 * Updates health records and generates alerts/recommendations
 */

const cron = require('node-cron');
const PhoneNumberHealth = require('../models/PhoneNumberHealth');
const User = require('../models/User');
const whatsappService = require('./whatsappService');

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

      // Get all active users
      const users = await User.find({ role: { $in: ['user', 'admin'] } });
      
      if (users.length === 0) {
        console.log('   No users found to check');
        return;
      }

      let checked = 0;
      let failed = 0;
      let alerts = 0;

      for (const user of users) {
        try {
          // Check if health check is needed (more than 6 hours since last check)
          const needsCheck = await PhoneNumberHealth.needsCheck(user._id);
          
          if (!needsCheck) {
            console.log(`   Skipping user ${user.email} - checked recently`);
            continue;
          }

          // Fetch health data from WhatsApp API
          const result = await whatsappService.getPhoneNumberHealth();

          if (!result.success) {
            console.error(`   Failed to fetch health for user ${user.email}:`, result.error);
            failed++;
            continue;
          }

          // Find or create health record
          let health = await PhoneNumberHealth.findOne({ 
            userId: user._id,
            phoneNumberId: result.data.phoneNumberId
          });

          if (!health) {
            health = new PhoneNumberHealth({
              userId: user._id,
              phoneNumberId: result.data.phoneNumberId,
              phoneNumber: result.data.display_phone_number
            });
          }

          // Update health data
          health.updateFromApi(result.data);

          // Update metrics from conversation data
          await health.updateMetrics();

          // Save health record
          await health.save();

          checked++;

          // Count new alerts
          const newAlerts = health.alerts.filter(a => !a.acknowledged).length;
          alerts += newAlerts;

          console.log(`   ✅ User ${user.email}: ${health.qualityRating}, Score: ${health.healthScore}, Alerts: ${newAlerts}`);

        } catch (userError) {
          console.error(`   Error checking user ${user.email}:`, userError.message);
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
   * Run health check for a specific user
   * @param {ObjectId} userId - User ID
   */
  async checkUser(userId) {
    try {
      console.log(`🔍 Running health check for user ${userId}...`);

      // Fetch health data from WhatsApp API
      const result = await whatsappService.getPhoneNumberHealth();

      if (!result.success) {
        throw new Error(`Failed to fetch health data: ${result.error}`);
      }

      // Find or create health record
      let health = await PhoneNumberHealth.findOne({ 
        userId: userId,
        phoneNumberId: result.data.phoneNumberId
      });

      if (!health) {
        health = new PhoneNumberHealth({
          userId: userId,
          phoneNumberId: result.data.phoneNumberId,
          phoneNumber: result.data.display_phone_number
        });
      }

      // Update health data
      health.updateFromApi(result.data);

      // Update metrics
      await health.updateMetrics();

      // Save
      await health.save();

      console.log('✅ User health check complete');
      return health;

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
