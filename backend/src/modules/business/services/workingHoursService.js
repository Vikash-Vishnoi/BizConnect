const Business = require('../../../core/database/models/Business');
const Template = require('../../../core/database/models/Template');
const logger = require('../../../common/helpers/logger');

/**
 * Working Hours Service
 * Manages working hours functionality and auto-replies
 * 
 * P1 FIX: After-hours auto-reply automation
 */

// Service constants
const SERVICE_CONTEXT = 'WORKING_HOURS_SERVICE';
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MINUTES_PER_HOUR = 60;
const SUNDAY_INDEX = 0;
const SATURDAY_INDEX = 6;
const MAX_DAYS_TO_CHECK = 7;

// Error messages
const ERROR_MESSAGES = {
  BUSINESS_NOT_FOUND: 'Business not found',
  INVALID_DAY: 'Invalid day',
  MISSING_TIMES: 'Missing times for',
  GET_TEMPLATE_ERROR: 'Get auto-reply template error',
  UPDATE_ERROR: 'Update working hours error'
};

// Default messages
const DEFAULT_MESSAGES = {
  RESPOND_SOON: 'We will respond as soon as possible.',
  CLOSED: 'We are currently closed. Please check back later.',
  BACK_AT: "We're currently closed. We'll be back at",
  BACK_TOMORROW: "We're currently closed. We'll be back tomorrow at",
  BACK_ON: "We're currently closed. We'll be back on"
};

class WorkingHoursService {
  /**
   * Check if current time is within working hours
   * @param {Object} business - Business document
   * @returns {boolean} True if within working hours
   */
  isWithinWorkingHours(business) {
    try {
      if (!business.settings?.workingHours?.enabled) {
        return true; // Always within hours if feature disabled
      }

      const workingHours = business.settings.workingHours;
      if (!workingHours.schedule || workingHours.schedule.length === 0) {
        return true; // No schedule defined
      }

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentTime = now.getHours() * MINUTES_PER_HOUR + now.getMinutes(); // Minutes since midnight

      // Find schedule for current day
      const currentDayName = DAYS_OF_WEEK[dayOfWeek];
      
      const daySchedule = workingHours.schedule.find(s => s.day === currentDayName);
      
      if (!daySchedule || !daySchedule.enabled) {
        return false; // Day is not a working day
      }

      // Parse time strings (format: "HH:MM")
      const [openHour, openMin] = daySchedule.openTime.split(':').map(Number);
      const [closeHour, closeMin] = daySchedule.closeTime.split(':').map(Number);
      
      const openMinutes = openHour * MINUTES_PER_HOUR + openMin;
      const closeMinutes = closeHour * MINUTES_PER_HOUR + closeMin;

      return currentTime >= openMinutes && currentTime < closeMinutes;
    } catch (error) {
      logger.error('Error checking working hours', {
        context: SERVICE_CONTEXT,
        businessId: business._id?.toString(),
        error: error.message,
        stack: error.stack
      });
      return true; // Default to within hours on error
    }
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
      logger.error(ERROR_MESSAGES.GET_TEMPLATE_ERROR, { 
        context: SERVICE_CONTEXT,
        businessId: businessId?.toString(), 
        error: error.message,
        stack: error.stack
      });
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
        const error = new Error(ERROR_MESSAGES.BUSINESS_NOT_FOUND);
        logger.error(ERROR_MESSAGES.BUSINESS_NOT_FOUND, {
          context: SERVICE_CONTEXT,
          businessId: businessId?.toString()
        });
        throw error;
      }

      // Validate schedule format
      if (schedule.schedule) {
        for (const day of schedule.schedule) {
          if (!VALID_DAYS.includes(day.day)) {
            throw new Error(`${ERROR_MESSAGES.INVALID_DAY}: ${day.day}`);
          }
          if (day.enabled && (!day.openTime || !day.closeTime)) {
            throw new Error(`${ERROR_MESSAGES.MISSING_TIMES} ${day.day}`);
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

      logger.info('Working hours updated', { 
        context: SERVICE_CONTEXT,
        businessId: businessId?.toString() 
      });

      return business;

    } catch (error) {
      logger.error(ERROR_MESSAGES.UPDATE_ERROR, { 
        context: SERVICE_CONTEXT,
        businessId: businessId?.toString(), 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get next available time message
   * @param {Object} business - Business document
   * @returns {string} Message about next available time
   */
  getNextAvailableMessage(business) {
    try {
      if (!business.settings?.workingHours?.schedule) {
        return DEFAULT_MESSAGES.RESPOND_SOON;
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const schedule = business.settings.workingHours.schedule;

      // Find next working day
      for (let i = 0; i < MAX_DAYS_TO_CHECK; i++) {
        const checkDay = (dayOfWeek + i) % MAX_DAYS_TO_CHECK;
        const dayName = DAYS_OF_WEEK[checkDay];
        const daySchedule = schedule.find(s => s.day === dayName && s.enabled);
        
        if (daySchedule) {
          if (i === 0) {
            // Today - check if still coming
            return `${DEFAULT_MESSAGES.BACK_AT} ${daySchedule.openTime}.`;
          } else if (i === 1) {
            return `${DEFAULT_MESSAGES.BACK_TOMORROW} ${daySchedule.openTime}.`;
          } else {
            const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            return `${DEFAULT_MESSAGES.BACK_ON} ${dayNameCapitalized} at ${daySchedule.openTime}.`;
          }
        }
      }

      return DEFAULT_MESSAGES.CLOSED;
    } catch (error) {
      logger.error('Error getting next available message', {
        context: SERVICE_CONTEXT,
        businessId: business._id?.toString(),
        error: error.message,
        stack: error.stack
      });
      return DEFAULT_MESSAGES.CLOSED;
    }
  }
}

module.exports = new WorkingHoursService();
