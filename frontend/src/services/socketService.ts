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

// Socket configuration
// Use 'http://10.0.2.2:3000' for Android emulator
// Use 'http://localhost:3000' for iOS simulator or web
// Use your actual server IP for physical devices (e.g., 'http://192.168.1.100:3000')
const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3000' // Development: Android emulator
  : 'https://your-production-api.com'; // Production
const RECONNECTION_DELAY = 1000;
const MAX_RECONNECTION_ATTEMPTS = 5;

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

  // Initialize socket connection
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      this.updateState({isConnecting: true, error: null});

      // Get auth token
      const token = await storageService.getToken();
      
      if (!token) {
        console.log('Socket connection skipped: No auth token');
        this.updateState({
          isConnecting: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user data for authentication
      const userData = await storageService.getUser();
      const userId = userData?.id;

      // Create socket connection
      this.socket = io(SOCKET_URL, {
        auth: {token},
        reconnection: true,
        reconnectionDelay: RECONNECTION_DELAY,
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        transports: ['websocket'],
      });

      // Authenticate with userId after connection
      if (userId) {
        this.socket.on('connect', () => {
          this.emit('authenticate', {userId});
        });
      }

      this.setupEventHandlers();
    } catch (error) {
      console.error('Socket connection error:', error);
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }

  // Disconnect socket
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

  // Setup socket event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on(SocketEvent.CONNECT, () => {
      console.log('Socket connected');
      this.updateState({
        isConnected: true,
        isConnecting: false,
        lastConnected: new Date().toISOString(),
        reconnectAttempts: 0,
        error: null,
      });
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

    // Campaign events
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

    // Message events
    this.socket.on(SocketEvent.MESSAGE_RECEIVED, (data: NewMessageNotification) => {
      console.log('New message received:', data);
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

    // Template events
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

    // Analytics events
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
  }

  // Register event handlers
  on(handlers: SocketEventHandlers): void {
    this.handlers = {...this.handlers, ...handlers};
  }

  // Remove event handlers
  off(eventType?: keyof SocketEventHandlers): void {
    if (eventType) {
      delete this.handlers[eventType];
    } else {
      this.handlers = {};
    }
  }

  // Emit event to server
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }

  // Subscribe to state changes
  subscribeToState(listener: (state: SocketState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  // Get current state
  getState(): SocketState {
    return {...this.state};
  }

  // Update state and notify listeners
  private updateState(updates: Partial<SocketState>): void {
    this.state = {...this.state, ...updates};
    this.stateListeners.forEach(listener => listener(this.state));
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Join a room (for targeted updates)
  joinRoom(room: string): void {
    this.emit('join_room', {room});
  }

  // Leave a room
  leaveRoom(room: string): void {
    this.emit('leave_room', {room});
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
