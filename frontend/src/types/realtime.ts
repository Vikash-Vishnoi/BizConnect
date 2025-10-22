// Real-time Socket Events
export enum SocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  RECONNECT = 'reconnect',
  
  // Campaign events
  CAMPAIGN_CREATED = 'campaign:created',
  CAMPAIGN_UPDATED = 'campaign:updated',
  CAMPAIGN_PROGRESS = 'campaign:progress',
  CAMPAIGN_COMPLETED = 'campaign:completed',
  CAMPAIGN_FAILED = 'campaign:failed',
  
  // Message events
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_READ = 'message:read',
  MESSAGE_FAILED = 'message:failed',
  
  // Conversation events
  CONVERSATION_UPDATED = 'conversation:updated',
  CONVERSATION_UNREAD_COUNT = 'conversation:unread_count',
  
  // Template events
  TEMPLATE_APPROVED = 'template:approved',
  TEMPLATE_REJECTED = 'template:rejected',
  TEMPLATE_CREATED = 'template:created',
  
  // Analytics events
  ANALYTICS_UPDATED = 'analytics:updated',
  QUALITY_SCORE_UPDATED = 'quality:updated',
}

// Socket connection state
export interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: string | null;
  reconnectAttempts: number;
  error: string | null;
}

// Campaign progress update
export interface CampaignProgressUpdate {
  campaignId: string;
  totalMessages: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  percentage: number;
  status: string;
  timestamp: string;
}

// Message update
export interface MessageUpdate {
  messageId: string;
  conversationId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: string;
}

// New message notification
export interface NewMessageNotification {
  messageId: string;
  conversationId: string;
  from: string;
  text: string;
  timestamp: string;
  hasMedia: boolean;
}

// Template status update
export interface TemplateStatusUpdate {
  templateId: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
  timestamp: string;
}

// Analytics update
export interface AnalyticsUpdate {
  type: 'daily' | 'campaign' | 'conversation' | 'quality';
  data: any;
  timestamp: string;
}

// Push notification types
export type NotificationType = 
  | 'new_message'
  | 'campaign_completed'
  | 'campaign_failed'
  | 'template_approved'
  | 'template_rejected'
  | 'quality_score_alert';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

export interface NotificationPermission {
  status: 'granted' | 'denied' | 'default';
  token?: string;
}

// Offline queue
export interface QueuedMessage {
  id: string;
  conversationId: string;
  text: string;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
  error?: string;
}

export interface OfflineQueueState {
  messages: QueuedMessage[];
  isSyncing: boolean;
  lastSync: string | null;
}

// Network state
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Real-time state
export interface RealtimeState {
  socket: SocketState;
  network: NetworkState;
  offlineQueue: OfflineQueueState;
  notifications: {
    permission: NotificationPermission;
    unread: PushNotification[];
  };
}

// Socket event handlers
export type SocketEventHandler<T = any> = (data: T) => void;

export interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onCampaignProgress?: SocketEventHandler<CampaignProgressUpdate>;
  onCampaignCompleted?: SocketEventHandler<{campaignId: string}>;
  onNewMessage?: SocketEventHandler<NewMessageNotification>;
  onMessageUpdate?: SocketEventHandler<MessageUpdate>;
  onTemplateStatusUpdate?: SocketEventHandler<TemplateStatusUpdate>;
  onAnalyticsUpdate?: SocketEventHandler<AnalyticsUpdate>;
  onQualityScoreUpdate?: SocketEventHandler<{score: number; status: string}>;
}
