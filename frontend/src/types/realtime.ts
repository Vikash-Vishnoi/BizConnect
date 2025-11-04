export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  RECONNECT = 'reconnect',

  CAMPAIGN_CREATED = 'campaign:created',
  CAMPAIGN_UPDATED = 'campaign:updated',
  CAMPAIGN_PROGRESS = 'campaign:progress',
  CAMPAIGN_COMPLETED = 'campaign:completed',
  CAMPAIGN_FAILED = 'campaign:failed',

  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_READ = 'message:read',
  MESSAGE_FAILED = 'message:failed',

  CONVERSATION_UPDATED = 'conversation:updated',
  CONVERSATION_STATUS_CHANGED = 'conversation:statusChanged',
  CONVERSATION_NEW = 'conversation:new',
  CONVERSATION_UNREAD_COUNT = 'conversation:unread_count',

  TEMPLATE_APPROVED = 'template:approved',
  TEMPLATE_REJECTED = 'template:rejected',
  TEMPLATE_CREATED = 'template:created',

  ANALYTICS_UPDATED = 'analytics:updated',
  QUALITY_SCORE_UPDATED = 'quality:updated',
}

export interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: string | null;
  reconnectAttempts: number;
  error: string | null;
}

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

export interface MessageUpdate {
  messageId: string;
  conversationId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: string;
}

export interface NewMessageNotification {
  messageId: string;
  conversationId: string;
  from: string;
  text: string;
  timestamp: string;
  hasMedia: boolean;
}

export interface TemplateStatusUpdate {
  templateId: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
  timestamp: string;
}

export interface AnalyticsUpdate {
  type: 'daily' | 'campaign' | 'conversation' | 'quality';
  data: any;
  timestamp: string;
}

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

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export interface RealtimeState {
  socket: SocketState;
  network: NetworkState;
  offlineQueue: OfflineQueueState;
  notifications: {
    permission: NotificationPermission;
    unread: PushNotification[];
  };
}

export type SocketEventHandler<T = any> = (data: T) => void;

export interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onCampaignProgress?: SocketEventHandler<CampaignProgressUpdate>;
  onCampaignCompleted?: SocketEventHandler<{campaignId: string}>;
  onNewMessage?: SocketEventHandler<NewMessageNotification>;
  onMessageUpdate?: SocketEventHandler<MessageUpdate>;
  onConversationStatusChanged?: SocketEventHandler<{ conversationId: string; status: string; previousStatus?: string }>;
  onConversationNew?: SocketEventHandler<{ conversation: any }>;
  onTemplateStatusUpdate?: SocketEventHandler<TemplateStatusUpdate>;
  onAnalyticsUpdate?: SocketEventHandler<AnalyticsUpdate>;
  onQualityScoreUpdate?: SocketEventHandler<{score: number; status: string}>;
}
