/**
 * Auto-Save Hook
 * 
 * @module hooks/useAutoSave
 * @description Custom React hook for automatically saving form data to localStorage.
 * Provides automatic persistence of form state with debouncing to prevent excessive writes.
 * Essential for preventing data loss on page refresh or accidental navigation.
 * 
 * @features
 * - Automatic localStorage persistence
 * - Debounced save operations (configurable delay)
 * - Skip first render to avoid overwriting loaded data
 * - Enable/disable toggle for conditional saving
 * - Clear and retrieve saved data utilities
 * - Error handling with console logging
 * 
 * @constants
 * - DEFAULT_AUTOSAVE_DELAY: 500ms delay before saving
 * 
 * @use-cases
 * - Form draft persistence
 * - Template creation auto-save
 * - Message composition recovery
 * - Settings changes persistence
 * - Multi-step form progress tracking
 * 
 * @example
 * // Auto-save form data
 * const [formData, setFormData] = useState({});
 * const { clearSaved } = useAutoSave('campaign-draft', formData, 1000);
 * 
 * const handleSubmit = async () => {
 *   await saveCampaign(formData);
 *   clearSaved(); // Clear draft after successful save
 * };
 * 
 * @example
 * // Load saved data on mount
 * const initialData = loadAutoSaved('template-draft', { name: '', body: '' });
 * const [formData, setFormData] = useState(initialData);
 * useAutoSave('template-draft', formData);
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * @constant {number} DEFAULT_AUTOSAVE_DELAY - Default delay in milliseconds before auto-saving
 */
const DEFAULT_AUTOSAVE_DELAY = 500;

/**
 * Custom hook for auto-saving form data to localStorage
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} data - Data to save
 * @param {number} [delay=DEFAULT_AUTOSAVE_DELAY] - Debounce delay in milliseconds
 * @param {boolean} [enabled=true] - Enable/disable auto-save
 * @returns {Object} - { clearSaved, getSaved }
 */
export const useAutoSave = (storageKey, data, delay = DEFAULT_AUTOSAVE_DELAY, enabled = true) => {
  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip saving on first render to avoid overwriting loaded data
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only save if enabled and data exists
    if (!enabled || !data) {
      return;
    }

    // Debounce save operation
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        console.log(`💾 Auto-saved: ${storageKey}`);
      } catch (error) {
        console.error(`Failed to auto-save ${storageKey}:`, error);
      }
    }, delay);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [storageKey, data, delay, enabled]);

  /**
   * Clear saved data from localStorage
   * @returns {void}
   */
  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Cleared auto-save: ${storageKey}`);
    } catch (error) {
      console.error(`Failed to clear auto-save ${storageKey}:`, error);
    }
  }, [storageKey]);

  /**
   * Get saved data from localStorage
   * @returns {Object|null} Saved data or null if not found
   */
  const getSaved = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error(`Failed to get auto-save ${storageKey}:`, error);
      return null;
    }
  }, [storageKey]);

  return { clearSaved, getSaved };
};

/**
 * Load saved form data from localStorage
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} [defaultData={}] - Default data if no saved data exists
 * @returns {Object} Saved data merged with defaults, or default data
 * @example
 * const initialData = loadAutoSaved('campaign-draft', { name: '', type: 'broadcast' });
 * const [formData, setFormData] = useState(initialData);
 */
export const loadAutoSaved = (storageKey, defaultData = {}) => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log(`📂 Loaded auto-save: ${storageKey}`);
      return { ...defaultData, ...parsed };
    }
  } catch (error) {
    console.error(`Failed to load auto-save ${storageKey}:`, error);
  }
  return defaultData;
};

export default useAutoSave;
