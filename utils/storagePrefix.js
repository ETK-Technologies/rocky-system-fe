/**
 * Storage Prefix Utility
 * 
 * Provides project-specific prefixes for localStorage and cookies.
 * This solves the issue of multiple project clones running on the same port
 * sharing session/cookie data.
 * 
 * Configure by setting NEXT_PUBLIC_PROJECT_ID in your .env file:
 * - Project 1: NEXT_PUBLIC_PROJECT_ID=rocky-dev
 * - Project 2: NEXT_PUBLIC_PROJECT_ID=rocky-staging
 * - Project 3: NEXT_PUBLIC_PROJECT_ID=rocky-prod
 */

/**
 * Get the project identifier from environment variables
 * Defaults to 'rocky' if not set
 * @returns {string} The project identifier
 */
export const getProjectId = () => {
  return process.env.NEXT_PUBLIC_PROJECT_ID || 'rocky';
};

/**
 * Get a prefixed key for localStorage
 * @param {string} key - The base key name
 * @returns {string} The prefixed key
 */
export const getStorageKey = (key) => {
  const projectId = getProjectId();
  return `${projectId}-${key}`;
};

/**
 * Get a prefixed name for cookies
 * @param {string} name - The base cookie name
 * @returns {string} The prefixed cookie name
 */
export const getCookieName = (name) => {
  const projectId = getProjectId();
  return `${projectId}_${name}`;
};

/**
 * Get the session ID key (for backward compatibility)
 * @returns {string} The session ID storage key
 */
export const getSessionIdKey = () => {
  return getStorageKey('session-id');
};
