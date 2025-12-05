/**
 * Development-only logger utility
 * Automatically filters out logs in production
 * Can be enabled in production with ?debug=true query parameter
 */

const isDevelopment = true; //process.env.NODE_ENV === "development";

// Check if debug mode is enabled via query parameter (client-side only)
const isDebugEnabled = () => {
  if (typeof window === "undefined") return false; // Server-side: no query params

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("debug") === "true" || urlParams.get("debug") === "1";
};

// Check if logging should be enabled
const shouldLog = () => {
  return isDevelopment || isDebugEnabled();
};

export const logger = {
  log: (...args) => {
    if (shouldLog()) {
      console.log("[LOG]", ...args);
    }
  },

  error: (...args) => {
    if (shouldLog()) {
      console.error("[ERROR]", ...args);
    }
  },

  warn: (...args) => {
    if (shouldLog()) {
      console.warn("[WARN]", ...args);
    }
  },

  info: (...args) => {
    if (shouldLog()) {
      console.info("[INFO]", ...args);
    }
  },

  debug: (...args) => {
    if (shouldLog()) {
      console.log("[DEBUG]", ...args);
    }
  },
};

// Convenience functions
export const debug = logger.debug;
