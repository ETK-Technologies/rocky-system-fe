/**
 * Currency Configuration
 * Centralized currency management from environment variables
 */

/**
 * Get the currency code from environment variable
 * Defaults to "CAD" if not set
 * @returns {string} Currency code in uppercase (e.g., "CAD", "USD")
 */
export function getCurrency() {
  // For server-side: use process.env.CURRENCY
  // For client-side: use NEXT_PUBLIC_CURRENCY (embedded at build time)
  if (typeof window === "undefined") {
    // Server-side
    const currency = process.env.CURRENCY || "CAD";
    return String(currency).toUpperCase();
  } else {
    // Client-side - NEXT_PUBLIC_* vars are replaced at build time
    const currency = process.env.NEXT_PUBLIC_CURRENCY || "CAD";
    return String(currency).toUpperCase();
  }
}

/**
 * Get the currency code in lowercase (for APIs like Stripe)
 * @returns {string} Currency code in lowercase (e.g., "cad", "usd")
 */
export function getCurrencyLowerCase() {
  return getCurrency().toLowerCase();
}

/**
 * Get the currency symbol based on currency code
 * @param {string} currency - Optional currency code, defaults to env currency
 * @returns {string} Currency symbol (e.g., "$", "€", "£")
 */
export function getCurrencySymbol(currency = null) {
  const curr = currency || getCurrency();
  const symbolMap = {
    CAD: "$",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AUD: "$",
    JPY: "¥",
  };
  return symbolMap[curr.toUpperCase()] || "$";
}

/**
 * Default currency constant (for backward compatibility)
 * Use getCurrency() instead for dynamic currency
 */
export const DEFAULT_CURRENCY = "CAD";

