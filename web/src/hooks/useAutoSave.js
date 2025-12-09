import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for auto-saving form data to localStorage
 * 
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} data - Data to save
 * @param {number} delay - Debounce delay in milliseconds (default: 500ms)
 * @param {boolean} enabled - Enable/disable auto-save (default: true)
 * 
 * @returns {Object} - { clearSaved, getSaved }
 * 
 * @example
 * const { clearSaved } = useAutoSave('myForm', formData, 1000);
 * // On successful submit:
 * clearSaved();
 */
export const useAutoSave = (storageKey, data, delay = 500, enabled = true) => {
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

  // Clear saved data from localStorage
  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Cleared auto-save: ${storageKey}`);
    } catch (error) {
      console.error(`Failed to clear auto-save ${storageKey}:`, error);
    }
  }, [storageKey]);

  // Get saved data from localStorage
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
 * 
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} defaultData - Default data if no saved data exists
 * @returns {Object} - Saved data or default data
 * 
 * @example
 * const initialData = loadAutoSaved('myForm', { name: '', email: '' });
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
