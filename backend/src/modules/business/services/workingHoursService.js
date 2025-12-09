const Business = require('../../../core/database/models/Business');
const Template = require('../../../core/database/models/Template');
const logger = require('../../../common/helpers/logger');

/**
 * Working Hours Service
 * Manages working hours functionality and auto-replies
 * 
 * P1 FIX: After-hours auto-reply automation
 */

class WorkingHoursService {
  /**
   * Check if current time is within working hours
   * @param {Object} business - Business document
   * @returns {boolean} True if within working hours
   */
  isWithinWorkingHours(business) {
    if (!business.settings?.workingHours?.enabled) {
      return true; // Always within hours if feature disabled
    }

    const workingHours = business.settings.workingHours;
    if (!workingHours.schedule || workingHours.schedule.length === 0) {
      return true; // No schedule defined
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    // Find schedule for current day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[dayOfWeek];
    
    const daySchedule = workingHours.schedule.find(s => s.day === currentDayName);
    
    if (!daySchedule || !daySchedule.enabled) {
      return false; // Day is not a working day
    }

    // Parse time strings (format: "HH:MM")
    const [openHour, openMin] = daySchedule.openTime.split(':').map(Number);
    const [closeHour, closeMin] = daySchedule.closeTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    return currentTime >= openMinutes && currentTime < closeMinutes;
  }

  /**
   * Get auto-reply template
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Template or null
   */
  async getAutoReplyTemplate(businessId) {
    try {
      const business = await Business.findById(businessId);
      if (!business?.settings?.workingHours?.templateId) {
        return null;
      }

      const template = await Template.findById(business.settings.workingHours.templateId);
      return template;

    } catch (error) {
      logger.error('Get auto-reply template error', { businessId, error: error.message });
      return null;
    }
  }

  /**
   * Update working hours schedule
   * @param {string} businessId - Business ID
   * @param {Object} schedule - Working hours configuration
   * @returns {Promise<Object>} Updated business
   */
  async updateWorkingHours(businessId, schedule) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Validate schedule format
      if (schedule.schedule) {
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (const day of schedule.schedule) {
          if (!validDays.includes(day.day)) {
            throw new Error(`Invalid day: ${day.day}`);
          }
          if (day.enabled && (!day.openTime || !day.closeTime)) {
            throw new Error(`Missing times for ${day.day}`);
          }
        }
      }

      // Update working hours
      business.settings.workingHours = {
        enabled: schedule.enabled !== undefined ? schedule.enabled : business.settings.workingHours.enabled,
        templateId: schedule.templateId || business.settings.workingHours.templateId,
        schedule: schedule.schedule || business.settings.workingHours.schedule || []
      };

      await business.save();

      logger.info('Working hours updated', { businessId });

      return business;

    } catch (error) {
      logger.error('Update working hours error', { businessId, error: error.message });
      throw error;
    }
  }

  /**
   * Get next available time message
   * @param {Object} business - Business document
   * @returns {string} Message about next available time
   */
  getNextAvailableMessage(business) {
    if (!business.settings?.workingHours?.schedule) {
      return 'We will respond as soon as possible.';
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const schedule = business.settings.workingHours.schedule;

    // Find next working day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 7; i++) {
      const checkDay = (dayOfWeek + i) % 7;
      const dayName = dayNames[checkDay];
      const daySchedule = schedule.find(s => s.day === dayName && s.enabled);
      
      if (daySchedule) {
        if (i === 0) {
          // Today - check if still coming
          return `We're currently closed. We'll be back at ${daySchedule.openTime}.`;
        } else if (i === 1) {
          return `We're currently closed. We'll be back tomorrow at ${daySchedule.openTime}.`;
        } else {
          const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          return `We're currently closed. We'll be back on ${dayNameCapitalized} at ${daySchedule.openTime}.`;
        }
      }
    }

    return 'We are currently closed. Please check back later.';
  }
}

module.exports = new WorkingHoursService();
