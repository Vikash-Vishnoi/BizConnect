/**
 * Cookie Utility
 *
 * Provides get, set, and remove helpers for browser cookies with
 * security-hardened defaults (SameSite=Strict, Secure on HTTPS).
 *
 * Use this instead of localStorage for sensitive values like JWT tokens,
 * because cookies can be scoped with SameSite to mitigate CSRF risk.
 *
 * Note: cookies here are still JS-readable (not HttpOnly). For fully
 * hardened httpOnly cookies, they must be set by the server.
 *
 * @module utils/cookies
 */

/**
 * Set a browser cookie.
 *
 * @param {string} name    - Cookie name
 * @param {string} value   - Cookie value
 * @param {Object} [options]
 * @param {number} [options.days]      - Expiry in days. Omit for session cookie.
 * @param {string} [options.path='/']  - Cookie path
 * @param {string} [options.sameSite='Strict'] - SameSite policy
 */
export const setCookie = (name, value, options = {}) => {
  const path = options.path || '/';
  const sameSite = options.sameSite || 'Strict';

  let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.days) {
    const expires = new Date();
    expires.setDate(expires.getDate() + options.days);
    cookieStr += `; expires=${expires.toUTCString()}`;
  }

  cookieStr += `; path=${path}`;
  cookieStr += `; SameSite=${sameSite}`;

  // Automatically add Secure flag on HTTPS
  if (window.location.protocol === 'https:') {
    cookieStr += '; Secure';
  }

  document.cookie = cookieStr;
};

/**
 * Get a cookie value by name.
 *
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value, or null if not found
 */
export const getCookie = (name) => {
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }

  return null;
};

/**
 * Remove a cookie by name (sets it to expired).
 *
 * @param {string} name         - Cookie name
 * @param {string} [path='/']   - Must match the path used when setting
 */
export const removeCookie = (name, path = '/') => {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Strict`;
};

export default { setCookie, getCookie, removeCookie };
