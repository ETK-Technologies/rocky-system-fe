import { logger } from "@/utils/devLogger";
import { getCurrency } from "@/lib/constants/currency";

/**
 * TikTok Events Utility
 * Handles TikTok Ads tracking events based on TikTok's standard events
 * Reference: https://ads.tiktok.com/help/article/standard-events-parameters
 */

/**
 * Initialize TikTok pixel and dataLayer
 */
const initializeTikTokPixel = () => {
  if (typeof window !== "undefined") {
    window.ttq = window.ttq || [];
  }
};

/**
 * Track TikTok standard event
 * @param {string} eventName - The TikTok event name (e.g., 'AddToCart', 'Purchase')
 * @param {Object} eventData - The event data object
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokEvent = (eventName, eventData = {}, debug = true) => {
  // Skip if running on server
  if (typeof window === "undefined") return;

  try {
    initializeTikTokPixel();

    if (debug) {
      logger.log(`[TikTok] Tracking event: ${eventName}`, eventData);
    }

    // Track the event with TikTok pixel
    window.ttq.track(eventName, eventData);

    if (debug) {
      logger.log(`[TikTok] ✅ Event "${eventName}" tracked successfully`);
    }
  } catch (error) {
    logger.error(`[TikTok] Error tracking event "${eventName}":`, error);
  }
};

/**
 * Format product item for TikTok events
 * @param {Object} product - Product data
 * @param {number} quantity - Item quantity (default: 1)
 * @returns {Object} Formatted data for TikTok
 */
export const formatTikTokEventData = (product, quantity = 1) => {
  const price = parseFloat(product.price) || 0;
  const value = price * quantity;

  return {
    content_type: "product",
    content_ids: [product.sku || product.id?.toString() || ""],
    content_name: product.name || "",
    quantity: quantity,
    price: price,
    value: value,
    currency: getCurrency(),
    description: product.short_description || product.name || "",
  };
};

/**
 * Track AddToCart event
 * @param {Object} product - Product data
 * @param {number} quantity - Quantity added
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokAddToCart = (
  product,
  quantity = 1,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    ...formatTikTokEventData(product, quantity),
    ...additionalData,
  };

  trackTikTokEvent("AddToCart", eventData, debug);
};

/**
 * Track InitiateCheckout event
 * @param {Array} cartItems - Array of cart items
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokInitiateCheckout = (
  cartItems = [],
  additionalData = {},
  debug = true
) => {
  const content_ids = [];
  let totalValue = 0;
  let totalQuantity = 0;

  cartItems.forEach((item) => {
    const product = item.product || item;
    const qty = item.quantity || 1;
    const price = parseFloat(product.price) || 0;

    content_ids.push(product.sku || product.id?.toString() || "");
    totalValue += price * qty;
    totalQuantity += qty;
  });

  const eventData = {
    content_type: "product",
    content_ids: content_ids,
    quantity: totalQuantity,
    value: totalValue,
    currency: getCurrency(),
    ...additionalData,
  };

  trackTikTokEvent("InitiateCheckout", eventData, debug);
};

/**
 * Track Purchase event
 * @param {Object} order - Order data
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokPurchase = (
  order,
  additionalData = {},
  debug = true
) => {
  if (!order || !order.id) return;

  const content_ids = [];
  let totalQuantity = 0;

  // Extract product IDs and quantities from order line items
  if (order.line_items && Array.isArray(order.line_items)) {
    order.line_items.forEach((item) => {
      content_ids.push(item.sku || item.product_id?.toString() || "");
      totalQuantity += parseInt(item.quantity) || 1;
    });
  }

  const eventData = {
    content_type: "product",
    content_ids: content_ids,
    quantity: totalQuantity,
    value: parseFloat(order.total) || 0,
    currency: order.currency || getCurrency(),
    description: `Order #${order.id}`,
    ...additionalData,
  };

  trackTikTokEvent("Purchase", eventData, debug);
};

/**
 * Track ViewContent event
 * @param {Object} product - Product data
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokViewContent = (
  product,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    ...formatTikTokEventData(product, 1),
    ...additionalData,
  };

  trackTikTokEvent("ViewContent", eventData, debug);
};

/**
 * Track Search event
 * @param {string} searchTerm - The search term
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokSearch = (
  searchTerm,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    search_string: searchTerm,
    ...additionalData,
  };

  trackTikTokEvent("Search", eventData, debug);
};

/**
 * Track CompleteRegistration event
 * @param {Object} userData - User registration data
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokCompleteRegistration = (
  userData = {},
  additionalData = {},
  debug = true
) => {
  const eventData = {
    ...userData,
    ...additionalData,
  };

  trackTikTokEvent("CompleteRegistration", eventData, debug);
};

/**
 * Track SubmitForm event
 * @param {string} formName - Form identifier
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokSubmitForm = (
  formName,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    form_name: formName,
    ...additionalData,
  };

  trackTikTokEvent("SubmitForm", eventData, debug);
};

/**
 * Track Contact event
 * @param {Object} contactData - Contact information
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokContact = (
  contactData = {},
  additionalData = {},
  debug = true
) => {
  const eventData = {
    ...contactData,
    ...additionalData,
  };

  trackTikTokEvent("Contact", eventData, debug);
};

/**
 * Track custom TikTok event
 * @param {string} eventName - Custom event name
 * @param {Object} eventData - Event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackTikTokCustomEvent = (
  eventName,
  eventData = {},
  debug = true
) => {
  trackTikTokEvent(eventName, eventData, debug);
};
