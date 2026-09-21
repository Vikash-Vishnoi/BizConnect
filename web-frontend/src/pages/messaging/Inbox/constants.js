/**
 * Configuration constants for inbox behavior
 */
export const INBOX_CONFIG = {
  MESSAGES_PER_PAGE: 20,
  MESSAGE_HISTORY_PER_PAGE: 9,
  MESSAGE_POLL_INTERVAL: 5000, // 5 seconds
  MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB WhatsApp limit
  SCROLL_THRESHOLD: 300, // px from top
  SCROLL_BUTTON_THRESHOLD: 100, // px from bottom
  SEARCH_DEBOUNCE: 500, // ms
  TYPING_INDICATOR_TIMEOUT: 3000 // ms
};
