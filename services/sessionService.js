/**
 * Session Service
 * Manages sessionId generation and storage in localStorage
 * SessionId is used for guest cart merging during registration/login
 */

import { getSessionIdKey } from "@/utils/storagePrefix";

// Use project-specific key to avoid conflicts when running multiple projects on same port
const getSessionKey = () => getSessionIdKey();

/**
 * Generate a unique session ID
 * Uses a combination of timestamp and random string for uniqueness
 */
const generateSessionId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const additionalRandom = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}-${additionalRandom}`;
};

/**
 * Get or create a session ID from localStorage
 * If no session ID exists, creates a new one and stores it
 * @returns {string} The session ID
 */
export const getSessionId = () => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const sessionKey = getSessionKey();
        let sessionId = localStorage.getItem(sessionKey);

        if (!sessionId) {
            sessionId = generateSessionId();
            localStorage.setItem(sessionKey, sessionId);
        }

        return sessionId;
    } catch (error) {
        console.error("Error getting session ID:", error);
        return null;
    }
};

/**
 * Set a session ID in localStorage
 * @param {string} sessionId - The session ID to store
 */
export const setSessionId = (sessionId) => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        localStorage.setItem(getSessionKey(), sessionId);
    } catch (error) {
        console.error("Error setting session ID:", error);
    }
};

/**
 * Clear the session ID from localStorage
 * Useful when user logs out or session expires
 */
export const clearSessionId = () => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        localStorage.removeItem(getSessionKey());
    } catch (error) {
        console.error("Error clearing session ID:", error);
    }
};

/**
 * Check if a session ID exists in localStorage
 * @returns {boolean} True if session ID exists
 */
export const hasSessionId = () => {
    if (typeof window === "undefined") {
        return false;
    }

    try {
        return localStorage.getItem(getSessionKey()) !== null;
    } catch (error) {
        console.error("Error checking session ID:", error);
        return false;
    }
};

