import {io, Socket} from 'socket.io-client';
import {
  SocketEvent,
  SocketEventHandlers,
  SocketState,
  CampaignProgressUpdate,
  MessageUpdate,
  NewMessageNotification,
  TemplateStatusUpdate,
  AnalyticsUpdate,
} from '../types/realtime';
import {storageService} from './storage';
import { config } from '../config/environment';

const SOCKET_URL = config.socketUrl;
const RECONNECTION_DELAY = 1000;
const MAX_RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_DELAY_MAX = 30000;

class SocketService {
  private socket: Socket | null = null;
  private handlers: SocketEventHandlers = {};
  private state: SocketState = {
    isConnected: false,
    isConnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
    error: null,
  };
  private stateListeners: Array<(state: SocketState) => void> = [];

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      this.updateState({isConnecting: true, error: null});

      const token = await storageService.getToken();

      if (!token) {
        console.log('Socket connection skipped: No auth token');
        this.updateState({
          isConnecting: false,
          error: 'Authentication required',
        });
        return;
      }

      const userData = await storageService.getUser();
      const userId = userData?.id;

      console.log('🔌 Initializing socket connection to:', SOCKET_URL);
      console.log('   User ID:', userId);
      console.log('   Has token:', !!token);

      this.socket = io(SOCKET_URL, {
        auth: {token},
        reconnection: true,
        reconnectionDelay: RECONNECTION_DELAY,
        reconnectionDelayMax: RECONNECTION_DELAY_MAX,
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        transports: ['websocket', 'polling'],
        path: '/socket.io',
        timeout: 10000,
      });

      // Store userId for use in event handlers
      (this.socket as any).userId = userId;

      this.setupEventHandlers();
    } catch (error) {
      console.error('Socket connection error:', error);
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateState({
        isConnected: false,
        isConnecting: false,
      });
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on(SocketEvent.CONNECT, () => {
      const userId = (this.socket as any)?.userId;
      console.log('✅ Socket connected successfully');
      console.log('   Socket ID:', this.socket?.id);
      console.log('   User ID:', userId);
      
      this.updateState({
        isConnected: true,
        isConnecting: false,
        lastConnected: new Date().toISOString(),
        reconnectAttempts: 0,
        error: null,
      });
      
      // Authenticate user with backend
      if (userId) {
        console.log('🔐 Sending authenticate event for user:', userId);
        this.emit('authenticate', {userId});
      }
      
      this.handlers.onConnect?.();
    });

    this.socket.on(SocketEvent.DISCONNECT, (reason) => {
      console.log('Socket disconnected:', reason);
      this.updateState({
        isConnected: false,
        isConnecting: false,
      });
      this.handlers.onDisconnect?.();
    });

    this.socket.on(SocketEvent.CONNECT_ERROR, (error) => {
      console.error('Socket connection error:', error);
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: error.message,
        reconnectAttempts: this.state.reconnectAttempts + 1,
      });
      this.handlers.onError?.(error);
    });

    this.socket.on(SocketEvent.RECONNECT, (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on(
      SocketEvent.CAMPAIGN_PROGRESS,
      (data: CampaignProgressUpdate) => {
        console.log('Campaign progress update:', data);
        this.handlers.onCampaignProgress?.(data);
      }
    );

    this.socket.on(SocketEvent.CAMPAIGN_COMPLETED, (data: {campaignId: string}) => {
      console.log('Campaign completed:', data);
      this.handlers.onCampaignCompleted?.(data);
    });

    this.socket.on(SocketEvent.MESSAGE_RECEIVED, (data: NewMessageNotification) => {
      console.log('📨 MESSAGE_RECEIVED event fired!');
      console.log('   Message ID:', data.messageId);
      console.log('   Conversation ID:', data.conversationId);
      console.log('   From:', data.from);
      console.log('   Text:', data.text?.substring(0, 50));
      this.handlers.onNewMessage?.(data);
    });

    this.socket.on(SocketEvent.MESSAGE_DELIVERED, (data: MessageUpdate) => {
      console.log('Message delivered:', data);
      this.handlers.onMessageUpdate?.(data);
    });

    this.socket.on(SocketEvent.MESSAGE_READ, (data: MessageUpdate) => {
      console.log('Message read:', data);
      this.handlers.onMessageUpdate?.(data);
    });

    // ✅ FEATURE: Read Receipts - Unified message status handler
    this.socket.on(SocketEvent.MESSAGE_STATUS, (data: MessageUpdate) => {
      console.log(`📊 Message status updated: ${data.status}`, data);
      this.handlers.onMessageUpdate?.(data);
    });

    this.socket.on(SocketEvent.MESSAGE_REACTED, (data: any) => {
      console.log('👍 MESSAGE_REACTED event fired!');
      console.log('   Message ID:', data.messageId);
      console.log('   Emoji:', data.emoji);
      console.log('   From:', data.from);
      this.handlers.onMessageReacted?.(data);
    });

    this.socket.on(SocketEvent.MESSAGE_DELETED, (data: any) => {
      console.log('🗑️ MESSAGE_DELETED event fired!');
      console.log('   Message ID:', data.messageId);
      console.log('   Deleted at:', data.deletedAt);
      this.handlers.onMessageDeleted?.(data);
    });

    this.socket.on(SocketEvent.CONVERSATION_STATUS_CHANGED, (data: { conversationId: string; status: string; previousStatus?: string }) => {
      console.log('Conversation status changed:', data);
      this.handlers.onConversationStatusChanged?.(data as any);
    });

    this.socket.on(SocketEvent.CONVERSATION_NEW, (data: { conversation: any }) => {
      console.log('New conversation created:', data);
      this.handlers.onConversationNew?.(data as any);
    });

    this.socket.on(
      SocketEvent.TEMPLATE_APPROVED,
      (data: TemplateStatusUpdate) => {
        console.log('Template approved:', data);
        this.handlers.onTemplateStatusUpdate?.(data);
      }
    );

    this.socket.on(
      SocketEvent.TEMPLATE_REJECTED,
      (data: TemplateStatusUpdate) => {
        console.log('Template rejected:', data);
        this.handlers.onTemplateStatusUpdate?.(data);
      }
    );

    this.socket.on(SocketEvent.ANALYTICS_UPDATED, (data: AnalyticsUpdate) => {
      console.log('Analytics updated:', data);
      this.handlers.onAnalyticsUpdate?.(data);
    });

    this.socket.on(
      SocketEvent.QUALITY_SCORE_UPDATED,
      (data: {score: number; status: string}) => {
        console.log('Quality score updated:', data);
        this.handlers.onQualityScoreUpdate?.(data);
      }
    );

    // Notification event listeners
    this.socket.on(SocketEvent.NOTIFICATION_NEW_MESSAGE, (data: any) => {
      console.log('🔔 NEW_MESSAGE notification received!');
      console.log('   Title:', data.title);
      console.log('   Body:', data.body);
      console.log('   Conversation ID:', data.data?.conversationId);
      console.log('   Badge Count:', data.badge);
      this.handlers.onNotificationNewMessage?.(data);
    });

    this.socket.on(SocketEvent.NOTIFICATION_MESSAGE_STATUS, (data: any) => {
      console.log('📬 MESSAGE_STATUS notification received!');
      console.log('   Message ID:', data.messageId);
      console.log('   Status:', data.status);
      console.log('   Conversation ID:', data.conversationId);
      this.handlers.onNotificationMessageStatus?.(data);
    });

    this.socket.on(SocketEvent.NOTIFICATION_PROFILE_UPDATE, (data: any) => {
      console.log('👤 PROFILE_UPDATE notification received!');
      console.log('   Contact Name:', data.contactName);
      console.log('   Changes:', data.changes);
      console.log('   Conversation ID:', data.conversationId);
      this.handlers.onNotificationProfileUpdate?.(data);
    });

    this.socket.on(SocketEvent.NOTIFICATION_ACCOUNT_ALERT, (data: any) => {
      console.log('⚠️ ACCOUNT_ALERT notification received!');
      console.log('   Type:', data.type);
      console.log('   Severity:', data.severity);
      console.log('   Message:', data.message);
      this.handlers.onNotificationAccountAlert?.(data);
    });
  }

  on(handlers: SocketEventHandlers): void {
    this.handlers = {...this.handlers, ...handlers};
  }

  off(eventType?: keyof SocketEventHandlers): void {
    if (eventType) {
      delete this.handlers[eventType];
    } else {
      this.handlers = {};
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }

  subscribeToState(listener: (state: SocketState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.state);

    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  getState(): SocketState {
    return {...this.state};
  }

  private updateState(updates: Partial<SocketState>): void {
    this.state = {...this.state, ...updates};
    this.stateListeners.forEach(listener => listener(this.state));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinRoom(room: string): void {
    this.emit('join_room', {room});
  }

  leaveRoom(room: string): void {
    this.emit('leave_room', {room});
  }
}

export const socketService = new SocketService();
export default socketService;
