/**
 * Debounce Hook
 * 
 * @module hooks/useDebounce
 * @description Custom React hook for debouncing rapidly changing values.
 * Delays updating a value until after the user stops typing or changing input.
 * Essential for performance optimization in search inputs, API calls, and reducing unnecessary re-renders.
 * 
 * @features
 * - Debounces any value type (string, number, object, array)
 * - Configurable delay duration
 * - Automatic cleanup on unmount
 * - Cancels pending updates when value changes
 * 
 * @constants
 * - DEFAULT_DEBOUNCE_DELAY: 500ms (configurable via UI.DEBOUNCE_DELAY)
 * 
 * @use-cases
 * - Search input optimization (wait for user to finish typing)
 * - API call throttling (reduce server requests)
 * - Auto-save functionality
 * - Live validation with external API
 * - Scroll event handling
 * 
 * @example
 * // Search with debounce
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // This API call only runs 300ms after user stops typing
 *   if (debouncedSearch) {
 *     performSearch(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * 
 * @example
 * // Form auto-save with debounce
 * const debouncedFormData = useDebounce(formData, 1000);
 * 
 * useEffect(() => {
 *   // Auto-save 1 second after user stops editing
 *   saveFormToLocalStorage(debouncedFormData);
 * }, [debouncedFormData]);
 */

import { useState, useEffect } from 'react';

/**
 * @constant {number} DEFAULT_DEBOUNCE_DELAY - Default debounce delay in milliseconds
 */
const DEFAULT_DEBOUNCE_DELAY = 500;

/**
 * Debounce a rapidly changing value
 * @param {*} value - The value to debounce (any type)
 * @param {number} [delay=DEFAULT_DEBOUNCE_DELAY] - Delay in milliseconds before updating
 * @returns {*} Debounced value (same type as input)
 */
export const useDebounce = (value, delay = DEFAULT_DEBOUNCE_DELAY) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
