/**
 * JSDoc Type Definitions for React/JSX
 * Auto-generated from backend models
 * Last Updated: November 29, 2025
 * 
 * Usage in your components:
 * import './types/jsdoc-types';
 * 
 * Then use in JSDoc comments:
 * @param {User} user - User object
 * @param {Business} business - Business object
 */

// ============================================
// USER TYPES
// ============================================

/**
 * @typedef {Object} UserPreferences
 * @property {'light' | 'dark'} theme - UI theme
 * @property {string} language - User language
 * @property {Object} notifications - Notification settings
 * @property {boolean} notifications.email - Email notifications enabled
 * @property {boolean} notifications.push - Push notifications enabled
 * @property {boolean} notifications.sms - SMS notifications enabled
 */

/**
 * @typedef {Object} User
 * @property {string} _id - User ID
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {'admin' | 'manager' | 'agent'} role - User role
 * @property {string[]} businesses - Associated business IDs
 * @property {'active' | 'suspended' | 'pending'} status - Account status
 * @property {Date} [lastLogin] - Last login timestamp
 * @property {UserPreferences} preferences - User preferences
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// BUSINESS TYPES
// ============================================

/**
 * @typedef {Object} WorkingHourSchedule
 * @property {'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'} day
 * @property {boolean} enabled - Whether working hours enabled for this day
 * @property {string} startTime - Start time in HH:MM format
 * @property {string} endTime - End time in HH:MM format
 */

/**
 * @typedef {Object} QualityHistoryEntry
 * @property {string} score - Quality score
 * @property {string} rating - Quality rating
 * @property {Date} timestamp - When quality changed
 * @property {string} [reason] - Reason for change
 */

/**
 * @typedef {Object} Business
 * @property {string} _id - Business ID
 * @property {string} name - Business name
 * @property {string} phoneNumber - WhatsApp phone number
 * @property {string} phoneNumberId - WhatsApp phone number ID
 * @property {string} businessAccountId - WhatsApp Business Account ID
 * @property {Object} whatsappConfig - WhatsApp configuration
 * @property {string} whatsappConfig.accessToken - API access token
 * @property {string} whatsappConfig.webhookVerifyToken - Webhook verify token
 * @property {string} whatsappConfig.apiVersion - API version
 * @property {Object} capabilities - Business capabilities
 * @property {'enabled' | 'disabled' | 'pending'} capabilities.payment - Payment status
 * @property {'approved' | 'pending' | 'rejected'} capabilities.businessManagement - Business verification
 * @property {Object} profile - Business profile
 * @property {string} [profile.profilePicture] - Profile picture URL
 * @property {string} [profile.displayName] - Display name
 * @property {string} [profile.about] - About text
 * @property {string} profile.vertical - Business category
 * @property {string[]} profile.websites - Website URLs
 * @property {Object} settings - Business settings
 * @property {Object} settings.notifications - Notification settings
 * @property {Object} settings.notifications.webhook - Webhook forwarding
 * @property {boolean} settings.notifications.webhook.enabled - Webhook enabled
 * @property {string} [settings.notifications.webhook.url] - Webhook URL
 * @property {string[]} settings.notifications.webhook.events - Events to forward
 * @property {Object} settings.workingHours - Working hours config
 * @property {boolean} settings.workingHours.enabled - Working hours enabled
 * @property {WorkingHourSchedule[]} settings.workingHours.schedule - Weekly schedule
 * @property {string} settings.workingHours.timezone - Timezone
 * @property {string} [settings.workingHours.templateId] - Auto-reply template
 * @property {Object} phoneNumberQuality - Phone quality metrics
 * @property {string} phoneNumberQuality.qualityScore - Quality score
 * @property {'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'} phoneNumberQuality.qualityRating - Quality rating
 * @property {string} phoneNumberQuality.messagingLimitTier - Messaging tier
 * @property {QualityHistoryEntry[]} phoneNumberQuality.qualityHistory - Quality history
 * @property {Object} health - Health status
 * @property {'operational' | 'degraded' | 'down'} health.apiStatus - API status
 * @property {Date} health.lastHealthCheck - Last health check
 * @property {'active' | 'suspended' | 'pending'} status - Business status
 * @property {string} createdBy - Creator user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// CONTACT TYPES
// ============================================

/**
 * @typedef {Object} Contact
 * @property {string} _id - Contact ID
 * @property {string} businessId - Associated business ID
 * @property {string} phoneNumber - Contact phone number
 * @property {string} [name] - Contact name
 * @property {string} [email] - Contact email
 * @property {string[]} tags - Contact tags
 * @property {Object} customFields - Custom field data
 * @property {'opted_in' | 'opted_out' | 'pending'} optInStatus - Marketing opt-in status
 * @property {Date} [optInDate] - Opt-in date
 * @property {Date} [optOutDate] - Opt-out date
 * @property {boolean} isArchived - Whether archived
 * @property {string} [notes] - Contact notes
 * @property {Date} [lastMessageDate] - Last message date
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// CAMPAIGN TYPES
// ============================================

/**
 * @typedef {Object} CampaignStats
 * @property {number} totalRecipients - Total recipients
 * @property {number} sent - Messages sent
 * @property {number} delivered - Messages delivered
 * @property {number} read - Messages read
 * @property {number} failed - Messages failed
 * @property {number} pending - Messages pending
 * @property {number} deliveryRate - Delivery rate percentage
 * @property {number} readRate - Read rate percentage
 * @property {number} failureRate - Failure rate percentage
 */

/**
 * @typedef {Object} Campaign
 * @property {string} _id - Campaign ID
 * @property {string} businessId - Associated business ID
 * @property {string} name - Campaign name
 * @property {string} templateId - Template ID
 * @property {'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'cancelled' | 'failed'} status
 * @property {Date} [scheduledFor] - Scheduled date
 * @property {Date} [startedAt] - Start date
 * @property {Date} [completedAt] - Completion date
 * @property {CampaignStats} stats - Campaign statistics
 * @property {string} createdBy - Creator user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

/**
 * @typedef {Object} CampaignRecipient
 * @property {string} _id - Recipient ID
 * @property {string} campaignId - Campaign ID
 * @property {string} contactId - Contact ID
 * @property {string} phoneNumber - Phone number
 * @property {string} [name] - Contact name
 * @property {'pending' | 'sent' | 'delivered' | 'read' | 'failed'} status - Message status
 * @property {Date} [sentAt] - Sent timestamp
 * @property {Date} [deliveredAt] - Delivered timestamp
 * @property {Date} [readAt] - Read timestamp
 * @property {string} [messageId] - WhatsApp message ID
 * @property {Object} [error] - Error details
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {number} error.retryCount - Retry attempts
 * @property {Date} [error.lastRetryAt] - Last retry timestamp
 * @property {Object} [templateParams] - Template parameters
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// TEMPLATE TYPES
// ============================================

/**
 * @typedef {Object} TemplateButton
 * @property {'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'FLOW' | 'CATALOG' | 'MPM'} type
 * @property {string} text - Button text
 * @property {string} [url] - URL for URL buttons
 * @property {string} [phoneNumber] - Phone for phone buttons
 * @property {string} [flowId] - Flow ID for flow buttons
 * @property {string} [catalogId] - Catalog ID for catalog buttons
 * @property {Array} [sections] - Sections for MPM buttons
 * @property {number} [index] - Button index
 */

/**
 * @typedef {Object} TemplateComponent
 * @property {'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'} type - Component type
 * @property {'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'} [format] - Component format
 * @property {string} [text] - Component text
 * @property {Object} [example] - Example values
 * @property {string[]} [example.header_text] - Header examples
 * @property {string[][]} [example.body_text] - Body examples
 * @property {TemplateButton[]} [buttons] - Buttons array
 */

/**
 * @typedef {Object} Template
 * @property {string} _id - Template ID
 * @property {string} businessId - Associated business ID
 * @property {string} name - Template name
 * @property {string} language - Language code
 * @property {'MARKETING' | 'UTILITY' | 'AUTHENTICATION'} category - Template category
 * @property {'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED'} status
 * @property {string} [namespace] - Template namespace (P3 Feature)
 * @property {TemplateComponent[]} components - Template components
 * @property {'GREEN' | 'YELLOW' | 'RED'} [qualityScore] - Quality score
 * @property {QualityHistoryEntry[]} qualityHistory - Quality history
 * @property {Object} [statusUpdateInfo] - Status update info
 * @property {string} [statusUpdateInfo.statusChangeReason] - Change reason
 * @property {Date} [statusUpdateInfo.pausedAt] - Paused date
 * @property {Date} [statusUpdateInfo.disabledAt] - Disabled date
 * @property {string} [whatsappTemplateId] - WhatsApp template ID
 * @property {string} createdBy - Creator user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// CONVERSATION & MESSAGE TYPES
// ============================================

/**
 * @typedef {Object} MessageReaction
 * @property {string} emoji - Reaction emoji
 * @property {string} from - User who reacted
 * @property {Date} timestamp - Reaction timestamp
 */

/**
 * @typedef {Object} MessageContent
 * @property {string} [text] - Text content
 * @property {string} [caption] - Media caption
 * @property {string} [mediaUrl] - Media URL
 * @property {string} [mimeType] - Media MIME type
 * @property {string} [filename] - File name
 * @property {number} [latitude] - Location latitude
 * @property {number} [longitude] - Location longitude
 * @property {Array} [contacts] - Contact cards
 * @property {Object} [interactive] - Interactive message
 * @property {Object} [context] - Reply context
 * @property {string} context.messageId - Original message ID
 * @property {string} context.from - Original sender
 * @property {Object} [reaction] - Reaction data
 * @property {string} reaction.messageId - Reacted message ID
 * @property {string} reaction.emoji - Reaction emoji
 */

/**
 * @typedef {Object} Message
 * @property {string} _id - Message ID
 * @property {string} whatsappMessageId - WhatsApp message ID
 * @property {string} from - Sender phone
 * @property {string} to - Recipient phone
 * @property {string} type - Message type
 * @property {Date} timestamp - Message timestamp
 * @property {MessageContent} content - Message content
 * @property {'sent' | 'delivered' | 'read' | 'failed'} status - Message status
 * @property {Object} [statusTimestamps] - Status timestamps
 * @property {Date} [statusTimestamps.sent] - Sent time
 * @property {Date} [statusTimestamps.delivered] - Delivered time
 * @property {Date} [statusTimestamps.read] - Read time
 * @property {Date} [statusTimestamps.failed] - Failed time
 * @property {Object} [error] - Error details
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {number} [error.retryCount] - Retry count (P1 Feature)
 * @property {Date} [error.lastRetryAt] - Last retry (P1 Feature)
 * @property {MessageReaction[]} [reactions] - Reactions (P1 Feature)
 * @property {'inbound' | 'outbound'} direction - Message direction
 */

/**
 * @typedef {Object} Conversation
 * @property {string} _id - Conversation ID
 * @property {string} businessId - Associated business ID
 * @property {string} contactId - Contact ID
 * @property {string} phoneNumber - Contact phone
 * @property {string} [contactName] - Contact name
 * @property {Message[]} messages - Messages array
 * @property {Object} conversationWindow - 24hr window
 * @property {boolean} conversationWindow.isOpen - Window open status
 * @property {Date} [conversationWindow.openedAt] - Window opened
 * @property {Date} [conversationWindow.expiresAt] - Window expires
 * @property {'MARKETING' | 'SERVICE' | 'UTILITY' | 'AUTHENTICATION'} [conversationWindow.category]
 * @property {Date} lastMessageAt - Last message time
 * @property {boolean} isArchived - Archived status
 * @property {string} [assignedTo] - Assigned agent ID
 * @property {string[]} tags - Conversation tags
 * @property {Object} metrics - Conversation metrics
 * @property {number} metrics.totalMessages - Total messages
 * @property {number} metrics.businessMessages - Business messages
 * @property {number} metrics.customerMessages - Customer messages
 * @property {number} [metrics.responseRate] - Response rate
 * @property {Object} quality - Quality metrics (P2 Feature)
 * @property {number} [quality.qualityScore] - Quality score 0-100
 * @property {'HIGH' | 'MEDIUM' | 'LOW'} [quality.engagementLevel] - Engagement level
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// FLOW TYPES
// ============================================

/**
 * @typedef {Object} FlowScreen
 * @property {string} id - Screen ID
 * @property {string} title - Screen title
 * @property {boolean} [terminal] - Is terminal screen
 * @property {Object} layout - Screen layout
 * @property {string} layout.type - Layout type
 * @property {Array} layout.children - Layout children
 * @property {Object} [data] - Screen data
 */

/**
 * @typedef {Object} Flow
 * @property {string} _id - Flow ID
 * @property {string} businessId - Associated business ID
 * @property {string} name - Flow name
 * @property {'DRAFT' | 'PUBLISHED' | 'DEPRECATED'} status - Flow status
 * @property {string} [flowId] - WhatsApp Flow ID (P0 Feature)
 * @property {string[]} categories - Flow categories
 * @property {string[]} [validation_errors] - Validation errors (P0)
 * @property {string} json_version - JSON version
 * @property {string} data_api_version - Data API version
 * @property {Object} routing_model - Routing model
 * @property {FlowScreen[]} screens - Flow screens
 * @property {Object} settings - Flow settings
 * @property {string} [settings.data_endpoint] - Data endpoint (P3)
 * @property {Object} analytics - Flow analytics
 * @property {number} analytics.sent_count - Sent count
 * @property {number} analytics.opened_count - Opened count
 * @property {number} analytics.completed_count - Completed count
 * @property {number} analytics.completion_rate - Completion rate
 * @property {string} createdBy - Creator user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

/**
 * @typedef {Object} FlowResponse
 * @property {string} _id - Response ID
 * @property {string} flowId - Flow ID
 * @property {string} businessId - Business ID
 * @property {string} contactId - Contact ID
 * @property {string} phoneNumber - Contact phone
 * @property {'started' | 'in_progress' | 'completed' | 'abandoned'} status
 * @property {string} [currentScreen] - Current screen ID
 * @property {Object} data - Response data
 * @property {Date} startedAt - Started timestamp
 * @property {Date} [completedAt] - Completed timestamp
 * @property {Date} [abandonedAt] - Abandoned timestamp
 * @property {Date} lastInteractionAt - Last interaction
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * @typedef {Object} DashboardAnalytics
 * @property {Object} overview - Overview metrics
 * @property {number} overview.totalConversations - Total conversations
 * @property {number} overview.activeConversations - Active conversations
 * @property {number} overview.totalMessages - Total messages
 * @property {number} overview.messagesThisMonth - Messages this month
 * @property {number} overview.responseRate - Response rate
 * @property {number} overview.averageResponseTime - Avg response time
 * @property {Object} campaigns - Campaign metrics
 * @property {number} campaigns.total - Total campaigns
 * @property {number} campaigns.active - Active campaigns
 * @property {number} campaigns.completed - Completed campaigns
 * @property {number} campaigns.avgDeliveryRate - Avg delivery rate
 * @property {Object} templates - Template metrics
 * @property {number} templates.total - Total templates
 * @property {number} templates.approved - Approved templates
 * @property {number} templates.pending - Pending templates
 * @property {number} templates.rejected - Rejected templates
 * @property {Object} flows - Flow metrics
 * @property {number} flows.total - Total flows
 * @property {number} flows.published - Published flows
 * @property {number} flows.avgCompletionRate - Avg completion rate
 */

/**
 * @typedef {Object} TimeSeriesData
 * @property {string} date - Date string
 * @property {number} conversations - Conversation count
 * @property {number} messages - Message count
 * @property {number} campaigns - Campaign count
 * @property {number} delivered - Delivered count
 * @property {number} read - Read count
 */

/**
 * @typedef {Object} ConversationQuality
 * @property {string} conversationId - Conversation ID
 * @property {number} qualityScore - Quality score 0-100
 * @property {'HIGH' | 'MEDIUM' | 'LOW'} engagementLevel - Engagement level
 * @property {Object} metrics - Quality metrics
 * @property {number} metrics.messageBalance - Message balance score
 * @property {number} metrics.responseRate - Response rate score
 * @property {number} metrics.conversationLength - Length score
 * @property {number} metrics.reactionRate - Reaction rate score
 * @property {number} metrics.completionRate - Completion score
 * @property {string[]} recommendations - Improvement recommendations
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} _id - Log ID
 * @property {string} businessId - Business ID
 * @property {string} userId - User ID
 * @property {string} action - Action performed
 * @property {string} resourceType - Resource type
 * @property {string} [resourceId] - Resource ID
 * @property {'success' | 'failure'} status - Action status
 * @property {string} [ipAddress] - IP address
 * @property {string} [userAgent] - User agent
 * @property {Object} [details] - Additional details
 * @property {Date} timestamp - Log timestamp
 */

// ============================================
// OTHER TYPES
// ============================================

/**
 * @typedef {Object} ScheduledMessage
 * @property {string} _id - Message ID
 * @property {string} businessId - Business ID
 * @property {string} contactId - Contact ID
 * @property {string} type - Message type
 * @property {*} content - Message content
 * @property {Date} scheduledFor - Scheduled time
 * @property {'pending' | 'sent' | 'cancelled' | 'failed'} status
 * @property {Date} [sentAt] - Sent timestamp
 * @property {string} [messageId] - WhatsApp message ID
 * @property {Object} [error] - Error details
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {string} createdBy - Creator user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

/**
 * @typedef {Object} SavedReply
 * @property {string} _id - Reply ID
 * @property {string} businessId - Business ID
 * @property {string} shortcut - Shortcut text
 * @property {string} content - Reply content
 * @property {string} [category] - Reply category
 * @property {number} usageCount - Usage count
 * @property {string} createdBy - Creator user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

/**
 * @typedef {Object} TeamInvitation
 * @property {string} _id - Invitation ID
 * @property {string} businessId - Business ID
 * @property {string} email - Invitee email
 * @property {'admin' | 'manager' | 'agent'} role - Invited role
 * @property {'pending' | 'accepted' | 'expired' | 'cancelled'} status
 * @property {string} token - Invitation token
 * @property {Date} expiresAt - Expiration date
 * @property {string} invitedBy - Inviter user ID
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 */

/**
 * @typedef {Object} AlertLog
 * @property {string} _id - Alert ID
 * @property {string} businessId - Business ID
 * @property {string} alertType - Alert type
 * @property {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} severity
 * @property {string} message - Alert message
 * @property {Object} [metadata] - Additional metadata
 * @property {'active' | 'acknowledged' | 'resolved'} status
 * @property {string} [acknowledgedBy] - User who acknowledged
 * @property {Date} [acknowledgedAt] - Acknowledgment date
 * @property {string} [resolvedBy] - User who resolved
 * @property {Date} [resolvedAt] - Resolution date
 * @property {Date} createdAt - Creation date
 */

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * @typedef {Object} ApiResponse
 * @template T
 * @property {boolean} success - Success status
 * @property {T} [data] - Response data
 * @property {string} [message] - Response message
 * @property {Object} [error] - Error details
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {*} [error.details] - Additional error details
 * @property {Object} [pagination] - Pagination info
 * @property {number} pagination.page - Current page
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.totalPages - Total pages
 * @property {number} pagination.totalItems - Total items
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} [page] - Page number
 * @property {number} [limit] - Items per page
 * @property {string} [sortBy] - Sort field
 * @property {'asc' | 'desc'} [sortOrder] - Sort order
 */

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

/**
 * @typedef {Object} WebSocketEvent
 * @property {string} type - Event type
 * @property {*} data - Event data
 * @property {Date} timestamp - Event timestamp
 */

/**
 * @typedef {Object} NewMessageEvent
 * @property {'NEW_MESSAGE'} type
 * @property {Object} data
 * @property {string} data.conversationId - Conversation ID
 * @property {Message} data.message - Message object
 */

/**
 * @typedef {Object} MessageStatusEvent
 * @property {'MESSAGE_STATUS'} type
 * @property {Object} data
 * @property {string} data.messageId - Message ID
 * @property {string} data.status - New status
 * @property {Date} data.timestamp - Status timestamp
 */

/**
 * @typedef {Object} CampaignUpdateEvent
 * @property {'CAMPAIGN_UPDATE'} type
 * @property {Object} data
 * @property {string} data.campaignId - Campaign ID
 * @property {CampaignStats} data.stats - Updated stats
 */

/**
 * @typedef {Object} AlertEvent
 * @property {'ALERT'} type
 * @property {AlertLog} data - Alert log object
 */

export {};
