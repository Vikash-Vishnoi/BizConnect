/**
 * Automation Types
 * 
 * TypeScript definitions for automation rules and flows
 */

export type TriggerType = 
  | 'new_conversation'    // First message from contact
  | 'keyword'            // Message contains specific keyword
  | 'after_hours'        // Message received outside business hours
  | 'no_response'        // No reply within X minutes
  | 'message_received'   // Any incoming message
  | 'specific_time';     // Scheduled trigger

export type ActionType =
  | 'send_message'       // Send a text message
  | 'send_template'      // Send a template message
  | 'add_tag'           // Add tags to conversation
  | 'assign_to'         // Assign to team member
  | 'stop_automation';  // Stop automation chain

export type MatchType = 'exact' | 'contains' | 'starts_with' | 'ends_with';

export interface BusinessHours {
  enabled: boolean;
  timezone?: string;
  schedule: Array<{
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string; // Format: "09:00"
    endTime: string;   // Format: "18:00"
  }>;
}

export interface AutomationTrigger {
  type: TriggerType;
  
  // Keyword trigger settings
  keywords?: string[];
  matchType?: MatchType;
  caseSensitive?: boolean;
  
  // Time-based trigger settings
  delayMinutes?: number;
  businessHours?: BusinessHours;
}

export interface AutomationAction {
  type: ActionType;
  
  // Send message action
  message?: string;
  
  // Send template action
  templateId?: string;
  templateParams?: string[];
  
  // Add tag action
  tags?: string[];
  
  // Assign to action
  assignTo?: string;
  
  // Delay before executing this action
  delaySeconds?: number;
  
  order?: number;
}

export interface ContactFilter {
  hasOrdered?: boolean;
  minMessages?: number;
  maxMessages?: number;
  lastMessageWithinDays?: number;
}

export interface MaxTriggersPerContact {
  count: number;
  periodHours: number;
}

export interface AutomationConditions {
  requiredTags?: string[];
  excludedTags?: string[];
  contactFilter?: ContactFilter;
  maxTriggersPerContact?: MaxTriggersPerContact;
}

export interface AutomationStats {
  totalTriggers: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastTriggered?: Date | string;
}

export interface AutomationRule {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions?: AutomationConditions;
  stats: AutomationStats;
  priority: number;
  stopOnTrigger: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAutomationRuleInput {
  name: string;
  description?: string;
  isActive?: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions?: AutomationConditions;
  priority?: number;
  stopOnTrigger?: boolean;
}

export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  trigger?: AutomationTrigger;
  actions?: AutomationAction[];
  conditions?: AutomationConditions;
  priority?: number;
  stopOnTrigger?: boolean;
}

export interface ActionResult {
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  error?: string;
  executedAt: Date | string;
}

export interface AutomationLog {
  _id: string;
  userId: string;
  automationRuleId: string;
  conversationId: string;
  contactPhone: string;
  triggerType: string;
  triggerData: {
    keyword?: string;
    messageId?: string;
    timestamp?: Date | string;
    metadata?: any;
  };
  status: 'success' | 'partial' | 'failed';
  actionsExecuted: number;
  actionsFailed: number;
  actionResults: ActionResult[];
  error?: {
    code?: string;
    message?: string;
    stack?: string;
  };
  executionTimeMs: number;
  createdAt: Date | string;
}

export interface AutomationStatsOverview {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  totalTriggers: number;
  successfulExecutions: number;
  failedExecutions: number;
  rulesByType: Record<TriggerType, number>;
}

export interface LogsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AutomationLogsResponse {
  logs: AutomationLog[];
  pagination: LogsPagination;
}
