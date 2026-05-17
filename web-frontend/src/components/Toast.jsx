/**
 * @fileoverview Toast notification system with context provider for global notifications.
 * 
 * @component Toast
 * 
 * @description
 * Context-based toast notification system that provides success, error, warning, and info
 * notifications throughout the application. Features automatic dismissal, queue management,
 * and accessibility support.
 * 
 * @features
 * - Context provider for global toast management
 * - Four notification types: success, error, warning, info
 * - Automatic dismissal with configurable duration
 * - Manual dismissal via close button
 * - Toast queue management (stacks multiple toasts)
 * - Smooth animations and transitions
 * - Icon indicators for each toast type
 * - ARIA attributes for accessibility
 * - Keyboard navigation support
 * 
 * @context ToastContext
 * - success(message, duration): Show success toast
 * - error(message, duration): Show error toast
 * - warning(message, duration): Show warning toast
 * - info(message, duration): Show info toast
 * - removeToast(id): Manually remove a toast
 * 
 * @constants
 * - DEFAULT_DURATION: 5000ms (5 seconds)
 * - TOAST_TYPES: { SUCCESS: 'success', ERROR: 'error', WARNING: 'warning', INFO: 'info' }
 * 
 * @example
 * // Wrap app with ToastProvider
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * 
 * // Use in components
 * const { success, error } = useToast();
 * success('Profile updated successfully');
 * error('Failed to save changes');
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { MdCheckCircle, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';
import './Toast.css';

/**
 * Toast configuration constants
 * @constant {Object}
 */
const TOAST_CONFIG = {
  DEFAULT_DURATION: 5000,
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }
};

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  /**
   * Adds a new toast to the notification queue
   * @param {Object} options - Toast options
   * @param {string} options.type - Toast type (success, error, warning, info)
   * @param {string} options.message - Toast message content
   * @param {number} options.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   * @returns {number} Toast ID for manual removal
   */
  const addToast = useCallback(({ type = TOAST_CONFIG.TYPES.INFO, message, duration = TOAST_CONFIG.DEFAULT_DURATION }) => {
    const id = Date.now() + Math.random();
    const toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  /**
   * Removes a toast from the notification queue
   * @param {number} id - Toast ID to remove
   */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Shows a success toast notification
   * @param {string} message - Success message
   * @param {number} duration - Auto-dismiss duration (optional)
   * @returns {number} Toast ID
   */
  const success = useCallback((message, duration) => {
    return addToast({ type: TOAST_CONFIG.TYPES.SUCCESS, message, duration });
  }, [addToast]);

  /**
   * Shows an error toast notification
   * @param {string} message - Error message
   * @param {number} duration - Auto-dismiss duration (optional)
   * @returns {number} Toast ID
   */
  const error = useCallback((message, duration) => {
    return addToast({ type: TOAST_CONFIG.TYPES.ERROR, message, duration });
  }, [addToast]);

  /**
   * Shows a warning toast notification
   * @param {string} message - Warning message
   * @param {number} duration - Auto-dismiss duration (optional)
   * @returns {number} Toast ID
   */
  const warning = useCallback((message, duration) => {
    return addToast({ type: TOAST_CONFIG.TYPES.WARNING, message, duration });
  }, [addToast]);

  /**
   * Shows an info toast notification
   * @param {string} message - Info message
   * @param {number} duration - Auto-dismiss duration (optional)
   * @returns {number} Toast ID
   */
  const info = useCallback((message, duration) => {
    return addToast({ type: TOAST_CONFIG.TYPES.INFO, message, duration });
  }, [addToast]);

  const value = {
    success,
    error,
    warning,
    info,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Toast container component that renders all active toasts
 * @param {Object} props
 * @param {Array} props.toasts - Array of toast objects
 * @param {Function} props.removeToast - Function to remove toast by ID
 */
const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

/**
 * Individual toast notification component
 * @param {Object} props
 * @param {Object} props.toast - Toast data (id, type, message, duration)
 * @param {Function} props.onClose - Close handler
 */
const Toast = ({ toast, onClose }) => {
  /**
   * Returns the appropriate icon component for toast type
   * @returns {JSX.Element} Icon component
   */
  const getIcon = () => {
    switch (toast.type) {
      case TOAST_CONFIG.TYPES.SUCCESS:
        return <MdCheckCircle />;
      case TOAST_CONFIG.TYPES.ERROR:
        return <MdError />;
      case TOAST_CONFIG.TYPES.WARNING:
        return <MdWarning />;
      default:
        return <MdInfo />;
    }
  };

  return (
    <div 
      className={`toast toast-${toast.type}`} 
      role="alert" 
      aria-atomic="true"
    >
      <div className="toast-icon" aria-hidden="true">{getIcon()}</div>
      <div className="toast-message">{toast.message}</div>
      <button 
        className="toast-close" 
        onClick={onClose} 
        aria-label="Close notification"
        type="button"
      >
        <MdClose />
      </button>
    </div>
  );
};

export default ToastProvider;
