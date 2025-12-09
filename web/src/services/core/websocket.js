/**
 * WebSocket Service for Real-time Updates
 * Auto-generated from backend WebSocket events
 * Last Updated: November 29, 2025
 */

import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3000';

    this.socket = io(WS_URL, {
      auth: {
        token: token || localStorage.getItem('authToken'),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup default event handlers
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('connection', { 
          status: 'error', 
          message: 'Failed to connect after multiple attempts' 
        });
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Business-specific events
    this.socket.on('NEW_MESSAGE', (data) => {
      this.emit('NEW_MESSAGE', data);
    });

    this.socket.on('MESSAGE_STATUS', (data) => {
      this.emit('MESSAGE_STATUS', data);
    });

    this.socket.on('CAMPAIGN_UPDATE', (data) => {
      this.emit('CAMPAIGN_UPDATE', data);
    });

    this.socket.on('TEMPLATE_UPDATE', (data) => {
      this.emit('TEMPLATE_UPDATE', data);
    });

    this.socket.on('ALERT', (data) => {
      this.emit('ALERT', data);
    });

    this.socket.on('FLOW_RESPONSE', (data) => {
      this.emit('FLOW_RESPONSE', data);
    });

    this.socket.on('QUALITY_UPDATE', (data) => {
      this.emit('QUALITY_UPDATE', data);
    });
  }

  /**
   * Join a business room to receive business-specific events
   */
  joinBusinessRoom(businessId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_business', { businessId });
    }
  }

  /**
   * Leave a business room
   */
  leaveBusinessRoom(businessId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_business', { businessId });
    }
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Send custom event to server
   */
  send(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot send event:', event);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create singleton instance
const wsService = new WebSocketService();

export default wsService;
