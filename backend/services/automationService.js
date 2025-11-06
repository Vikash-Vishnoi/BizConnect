const AutomationRule = require('../models/AutomationRule');
const AutomationLog = require('../models/AutomationLog');
const Conversation = require('../models/Conversation');
const Template = require('../models/Template');
const whatsappService = require('./whatsappService');

/**
 * Automation Service
 * 
 * Handles execution of automation rules triggered by various events
 */

class AutomationService {
  /**
   * Process a trigger event and execute applicable automations
   */
  async processTrigger(userId, triggerType, context) {
    try {
      const startTime = Date.now();
      
      // Find applicable automation rules
      const rules = await AutomationRule.findApplicable(userId, triggerType, context);
      
      if (rules.length === 0) {
        console.log(`🤖 No automation rules found for ${triggerType}`);
        return { executed: 0, results: [] };
      }
      
      console.log(`🤖 Found ${rules.length} automation rule(s) for ${triggerType}`);
      
      const results = [];
      
      for (const rule of rules) {
        try {
          const result = await this.executeRule(rule, context);
          results.push(result);
          
          // Stop processing if rule has stopOnTrigger enabled
          if (rule.stopOnTrigger && result.status === 'success') {
            console.log(`🛑 Stopping automation chain (stopOnTrigger enabled)`);
            break;
          }
        } catch (error) {
          console.error(`Failed to execute automation rule ${rule._id}:`, error);
          results.push({
            ruleId: rule._id,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      console.log(`🤖 Automation execution completed in ${Date.now() - startTime}ms`);
      
      return {
        executed: results.length,
        results
      };
    } catch (error) {
      console.error('Automation processing error:', error);
      throw error;
    }
  }
  
  /**
   * Execute a single automation rule
   */
  async executeRule(rule, context) {
    const startTime = Date.now();
    const log = {
      userId: rule.userId,
      automationRuleId: rule._id,
      conversationId: context.conversationId,
      contactPhone: context.contactPhone,
      triggerType: rule.trigger.type,
      triggerData: context.triggerData || {},
      actionResults: []
    };
    
    try {
      console.log(`🤖 Executing automation: ${rule.name}`);
      
      // Get conversation
      const conversation = await Conversation.findById(context.conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      let actionsExecuted = 0;
      let actionsFailed = 0;
      
      // Execute actions in order
      for (const action of rule.actions) {
        try {
          // Apply delay if specified
          if (action.delaySeconds > 0) {
            await this.delay(action.delaySeconds * 1000);
          }
          
          const actionResult = await this.executeAction(action, conversation, context);
          
          log.actionResults.push({
            actionType: action.type,
            status: actionResult.success ? 'success' : 'failed',
            message: actionResult.message,
            error: actionResult.error,
            executedAt: new Date()
          });
          
          if (actionResult.success) {
            actionsExecuted++;
          } else {
            actionsFailed++;
          }
        } catch (error) {
          console.error(`Action execution failed:`, error);
          log.actionResults.push({
            actionType: action.type,
            status: 'failed',
            error: error.message,
            executedAt: new Date()
          });
          actionsFailed++;
        }
      }
      
      // Update rule statistics
      rule.stats.totalTriggers++;
      if (actionsFailed === 0) {
        rule.stats.successfulExecutions++;
      } else {
        rule.stats.failedExecutions++;
      }
      rule.stats.lastTriggered = new Date();
      await rule.save();
      
      // Create log
      log.status = actionsFailed === 0 ? 'success' : (actionsExecuted > 0 ? 'partial' : 'failed');
      log.actionsExecuted = actionsExecuted;
      log.actionsFailed = actionsFailed;
      log.executionTimeMs = Date.now() - startTime;
      
      await AutomationLog.create(log);
      
      return {
        ruleId: rule._id,
        ruleName: rule.name,
        status: log.status,
        actionsExecuted,
        actionsFailed,
        executionTimeMs: log.executionTimeMs
      };
    } catch (error) {
      // Log failed execution
      log.status = 'failed';
      log.error = {
        message: error.message,
        stack: error.stack
      };
      log.executionTimeMs = Date.now() - startTime;
      
      await AutomationLog.create(log);
      
      throw error;
    }
  }
  
  /**
   * Execute a single action
   */
  async executeAction(action, conversation, context) {
    console.log(`  ➡️ Executing action: ${action.type}`);
    
    switch (action.type) {
      case 'send_message':
        return await this.sendMessageAction(action, conversation);
      
      case 'send_template':
        return await this.sendTemplateAction(action, conversation);
      
      case 'add_tag':
        return await this.addTagAction(action, conversation);
      
      case 'assign_to':
        return await this.assignToAction(action, conversation);
      
      case 'stop_automation':
        return { success: true, message: 'Automation stopped' };
      
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }
  
  /**
   * Send a text message
   */
  async sendMessageAction(action, conversation) {
    try {
      if (!action.message) {
        return { success: false, error: 'No message content' };
      }
      
      const result = await whatsappService.sendTextMessage(
        conversation.contact.phoneNumber,
        action.message
      );
      
      if (result.success) {
        // Add message to conversation
        conversation.messages.push({
          whatsappMessageId: result.messageId,
          from: process.env.WHATSAPP_PHONE_NUMBER_ID,
          to: conversation.contact.phoneNumber,
          direction: 'outgoing',
          type: 'text',
          content: { text: action.message },
          status: 'sent',
          timestamp: new Date()
        });
        
        conversation.lastMessageAt = new Date();
        await conversation.save();
        
        return { success: true, message: 'Message sent successfully' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send a template message
   */
  async sendTemplateAction(action, conversation) {
    try {
      if (!action.templateId) {
        return { success: false, error: 'No template specified' };
      }
      
      const template = await Template.findById(action.templateId);
      if (!template || template.status !== 'approved') {
        return { success: false, error: 'Template not found or not approved' };
      }
      
      const result = await whatsappService.sendTemplateMessage(
        conversation.contact.phoneNumber,
        template.name,
        template.language,
        action.templateParams || []
      );
      
      if (result.success) {
        conversation.messages.push({
          whatsappMessageId: result.messageId,
          from: process.env.WHATSAPP_PHONE_NUMBER_ID,
          to: conversation.contact.phoneNumber,
          direction: 'outgoing',
          type: 'template',
          content: {
            text: template.bodyText,
            templateName: template.name,
            templateParams: action.templateParams
          },
          status: 'sent',
          timestamp: new Date()
        });
        
        conversation.lastMessageAt = new Date();
        await conversation.save();
        
        return { success: true, message: 'Template sent successfully' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Add tags to conversation
   */
  async addTagAction(action, conversation) {
    try {
      if (!action.tags || action.tags.length === 0) {
        return { success: false, error: 'No tags specified' };
      }
      
      // Initialize tags array if not exists
      if (!conversation.tags) {
        conversation.tags = [];
      }
      
      // Add new tags (avoid duplicates)
      for (const tag of action.tags) {
        if (!conversation.tags.includes(tag)) {
          conversation.tags.push(tag);
        }
      }
      
      await conversation.save();
      
      return { success: true, message: `Added ${action.tags.length} tag(s)` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Assign conversation to user
   */
  async assignToAction(action, conversation) {
    try {
      if (!action.assignTo) {
        return { success: false, error: 'No assignee specified' };
      }
      
      conversation.assignedTo = action.assignTo;
      await conversation.save();
      
      return { success: true, message: 'Conversation assigned' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if message matches keyword trigger
   */
  matchesKeyword(message, rule) {
    if (!rule.trigger.keywords || rule.trigger.keywords.length === 0) {
      return false;
    }
    
    let text = message.content?.text || '';
    if (!rule.trigger.caseSensitive) {
      text = text.toLowerCase();
    }
    
    for (const keyword of rule.trigger.keywords) {
      const kw = rule.trigger.caseSensitive ? keyword : keyword.toLowerCase();
      
      switch (rule.trigger.matchType) {
        case 'exact':
          if (text === kw) return true;
          break;
        case 'contains':
          if (text.includes(kw)) return true;
          break;
        case 'starts_with':
          if (text.startsWith(kw)) return true;
          break;
        case 'ends_with':
          if (text.endsWith(kw)) return true;
          break;
      }
    }
    
    return false;
  }
  
  /**
   * Check if current time is within business hours
   */
  isWithinBusinessHours(rule) {
    if (!rule.trigger.businessHours || !rule.trigger.businessHours.enabled) {
      return true; // No business hours restriction
    }
    
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    
    const schedule = rule.trigger.businessHours.schedule?.find(s => s.day === currentDay);
    if (!schedule) {
      return false; // No schedule for this day
    }
    
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
  }
  
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AutomationService();
