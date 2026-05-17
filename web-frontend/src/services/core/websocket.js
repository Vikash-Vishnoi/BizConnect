/**
 * 🔌 WebSocket Service for Real-time Updates
 * 
 * Manages WebSocket connections for real-time bidirectional communication with the server.
 * Provides event-based messaging, automatic reconnection, and business room management.
 * 
 * @module services/core/websocket
 * 
 * @description
 * This service handles all WebSocket communication using Socket.IO, including connection
 * management, event subscription, room joining, and automatic reconnection. Supports
 * business-specific event channels and custom event listeners.
 * 
 * @features
 * - Automatic connection with authentication
 * - Event-based pub/sub messaging
 * - Business room management for multi-tenant support
 * - Automatic reconnection with exponential backoff
 * - Custom event listener registration
 * - Connection state tracking
 * - Error handling and logging
 * - Support for both WebSocket and polling transports
 * 
 * @events
 * Real-time events emitted by the server:
 * - NEW_MESSAGE - New message received
 * - MESSAGE_STATUS - Message delivery status update
 * - CAMPAIGN_UPDATE - Campaign status change
 * - TEMPLATE_UPDATE - Template approval/rejection
 * - ALERT - System alert notification
 * - FLOW_RESPONSE - Automation flow response
 * - QUALITY_UPDATE - Quality rating change
 * 
 * @example
 * // Connect to WebSocket
 * import wsService from './services/core/websocket';
 * wsService.connect(token);
 * 
 * // Subscribe to events
 * const unsubscribe = wsService.on('NEW_MESSAGE', (data) => {
 *   console.log('New message:', data);
 * });
 * 
 * // Join business room
 * wsService.joinBusinessRoom(businessId);
 * 
 * // Cleanup
 * unsubscribe();
 * wsService.disconnect();
 */

import io from 'socket.io-client';

/**
 * WebSocket Service Class
 * Singleton service for managing WebSocket connections
 * 
 * @class WebSocketService
 */
class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to WebSocket server with authentication
   * 
   * @function connect
   * @param {string} [token] - JWT authentication token (falls back to localStorage)
   * @description
   * Establishes WebSocket connection with automatic reconnection settings.
   * Uses token for authentication and sets up event handlers.
   */
  connect(token) {
    const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3000';

    this.socket = io(WS_URL, {
      auth: {
        token: token || localStorage.getItem('token'),
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
   * Setup default event handlers for connection and business events
   * 
   * @function setupEventHandlers
   * @private
   * @description
   * Registers handlers for connection lifecycle events (connect, disconnect, error)
   * and business-specific events (messages, campaigns, templates, alerts, etc.).
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
   * 
   * @function joinBusinessRoom
   * @param {string} businessId - Business ID to join room for
   * @description
   * Subscribes to business-specific event channel for multi-tenant support.
   * Only events for this business will be received.
   */
  joinBusinessRoom(businessId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_business', { businessId });
    }
  }

  /**
   * Leave a business room and stop receiving business events
   * 
   * @function leaveBusinessRoom
   * @param {string} businessId - Business ID to leave room for
   * @description
   * Unsubscribes from business-specific event channel.
   */
  leaveBusinessRoom(businessId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_business', { businessId });
    }
  }

  /**
   * Subscribe to an event with callback
   * 
   * @function on
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is received
   * @returns {Function} Unsubscribe function to remove listener
   * @description
   * Registers a callback for a specific event. Returns unsubscribe function for cleanup.
   * 
   * @example
   * const unsubscribe = wsService.on('NEW_MESSAGE', (data) => {
   *   console.log('Message:', data);
   * });
   * // Later, cleanup
   * unsubscribe();
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
   * 
   * @function off
   * @param {string} event - Event name to unsubscribe from
   * @param {Function} callback - Callback function to remove
   * @description
   * Removes a specific callback from event listeners.
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
   * Emit event to all registered listeners
   * 
   * @function emit
   * @param {string} event - Event name to emit
   * @param {any} data - Event data to pass to listeners
   * @private
   * @description
   * Triggers all callbacks registered for this event with error handling.
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
   * 
   * @function send
   * @param {string} event - Event name to send
   * @param {any} data - Event data to send
   * @description
   * Emits a custom event to the server if connected.
   */
  send(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot send event:', event);
    }
  }

  /**
   * Disconnect from WebSocket and cleanup
   * 
   * @function disconnect
   * @description
   * Closes WebSocket connection and clears all event listeners.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Check if WebSocket is currently connected
   * 
   * @function isConnected
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create singleton instance
const wsService = new WebSocketService();

export default wsService;
