/**
 * GA4 Events Utility
 * General-purpose utility for tracking GA4 events throughout the app
 * Now also includes TikTok event tracking alongside GA4
 */

import { logger } from "@/utils/devLogger";
import { getCurrency } from "@/lib/constants/currency";
import {
  trackTikTokAddToCart,
  trackTikTokInitiateCheckout,
  trackTikTokPurchase,
  trackTikTokViewContent,
  trackTikTokSearch,
} from "./tiktokEvents";

/**
 * Get user ID from cookies
 */
const getUserId = () => {
  if (typeof window === "undefined") return null;

  try {
    const cookies = document.cookie.split(";");
    const userIdCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("userId=")
    );
    if (userIdCookie) {
      return userIdCookie.split("=")[1];
    }
  } catch (error) {
    logger.warn("Error getting user ID from cookies:", error);
  }
  return null;
};

/**
 * Initialize dataLayer if it doesn't exist
 */
const initializeDataLayer = () => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
  }
};

/**
 * General GA4 event tracker
 * @param {string} eventName - The GA4 event name
 * @param {Object} eventData - The event data object
 * @param {boolean} debug - Whether to log debug information
 */
export const trackGA4Event = (eventName, eventData = {}, debug = true) => {
  // Skip if running on server
  if (typeof window === "undefined") return;

  try {
    initializeDataLayer();

    const userId = getUserId();

    const eventPayload = {
      event: eventName,
      ...eventData,
    };

    // Add user_id to dataLayer if available, but do NOT clobber canonical IDs
    // Only set customer_id from cookie when caller did not supply any id fields
    if (userId) {
      eventPayload.user_id = eventPayload.user_id || userId;
      const hasCanonicalId =
        typeof eventPayload.customer_id_canonical !== "undefined" &&
        eventPayload.customer_id_canonical !== null &&
        String(eventPayload.customer_id_canonical).trim() !== "";
      const hasCustomerId =
        typeof eventPayload.customer_id !== "undefined" &&
        eventPayload.customer_id !== null &&
        String(eventPayload.customer_id).trim() !== "";
      if (!hasCanonicalId && !hasCustomerId) {
        eventPayload.customer_id = userId;
      }
    }

    if (debug) {
      logger.log(`[GA4] Tracking event: ${eventName}`, eventPayload);
    }

    window.dataLayer.push(eventPayload);

    if (debug) {
      logger.log(`[GA4] ✅ Event "${eventName}" pushed successfully`);
    }
  } catch (error) {
    logger.error(`[GA4] Error tracking event "${eventName}":`, error);
  }
};

/**
 * Track GA4 ecommerce event
 * @param {string} eventName - The ecommerce event name
 * @param {Object} ecommerceData - The ecommerce data
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackGA4EcommerceEvent = (
  eventName,
  ecommerceData,
  additionalData = {},
  debug = true
) => {
  // Clear previous ecommerce object for purchase events per GA4 best practices
  try {
    if (typeof window !== "undefined" && eventName === "purchase") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
    }
  } catch (e) {
    // non-fatal
  }

  const eventData = {
    ecommerce: ecommerceData,
    ...additionalData,
  };

  trackGA4Event(eventName, eventData, debug);
};

/**
 * Format product item for GA4 ecommerce events
 * Matches the PHP WordPress implementation exactly
 * @param {Object} product - Product data
 * @param {number} quantity - Item quantity (default: 1)
 * @returns {Object} Formatted item for GA4
 */
export const formatGA4Item = (product, quantity = 1) => {
  // Extract categories (up to 5 levels) - matches PHP wp_get_post_terms
  const categories = product.categories || [];
  const categoryData = {};

  for (let i = 0; i < Math.min(categories.length, 5); i++) {
    const key = i === 0 ? "item_category" : `item_category${i + 1}`;
    categoryData[key] = categories[i]?.name || categories[i] || "";
  }

  // Extract custom attributes - matches PHP foreach ($product->get_attributes())
  const customAttributes = {};

  if (product.attributes && Array.isArray(product.attributes)) {
    product.attributes.forEach((attr) => {
      if (attr.name) {
        // Handle taxonomy attributes (matches PHP is_taxonomy() check)
        if (attr.taxonomy) {
          // For taxonomy attributes, get the terms
          const attributeName = attr.name.toLowerCase().replace(/\s+/g, "_");
          if (attr.terms && Array.isArray(attr.terms)) {
            customAttributes[attributeName] = attr.terms
              .map((term) => term.name)
              .join(", ");
          } else if (attr.options && Array.isArray(attr.options)) {
            customAttributes[attributeName] = attr.options.join(", ");
          }
        } else {
          // Handle non-taxonomy attributes (matches PHP get_options())
          const attributeName = attr.name.toLowerCase().replace(/\s+/g, "_");
          if (attr.options) {
            customAttributes[attributeName] = Array.isArray(attr.options)
              ? attr.options.join(", ")
              : attr.options.toString();
          }
        }
      }
    });
  }

  // Extract brand from attributes (matches PHP get_attribute('brand'))
  let brand = "Rocky"; // Default fallback

  if (product.attributes) {
    const brandAttr = product.attributes.find(
      (attr) => attr.name && attr.name.toLowerCase().includes("brand")
    );
    if (brandAttr) {
      if (
        brandAttr.terms &&
        Array.isArray(brandAttr.terms) &&
        brandAttr.terms.length > 0
      ) {
        brand = brandAttr.terms[0].name;
      } else if (brandAttr.options) {
        brand = Array.isArray(brandAttr.options)
          ? brandAttr.options[0]?.toString() || "Rocky"
          : brandAttr.options.toString();
      }
    }
  }

  // If no brand found in attributes, check meta_data
  if (
    brand === "Rocky" &&
    product.meta_data &&
    Array.isArray(product.meta_data)
  ) {
    const brandMeta = product.meta_data.find(
      (meta) => meta.key && meta.key.toLowerCase().includes("brand")
    );
    if (brandMeta && brandMeta.value) {
      brand = brandMeta.value.toString();
    }
  }

  return {
    item_id: product.sku || product.id?.toString() || "", // Matches PHP $product_sku ?: $product_id
    item_name: product.name || "", // Matches PHP $product_name
    price: parseFloat(product.price) || 0, // Matches PHP (float) $product_price
    quantity: quantity,
    item_brand: brand, // Matches PHP $product_brand with fallback
    ...categoryData, // Matches PHP item_category through item_category5
    ...customAttributes, // Matches PHP custom attributes loop
  };
};

/**
 * Track view_item event
 * @param {Object} product - Product data
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackViewItem = (product, additionalData = {}, debug = true) => {
  const item = formatGA4Item(product);

  const ecommerceData = {
    currency: getCurrency(),
    value: item.price,
    items: [item],
  };

  // Track GA4 event
  trackGA4EcommerceEvent("view_item", ecommerceData, additionalData, debug);

  // Track TikTok event
  trackTikTokViewContent(product, additionalData, debug);
};

/**
 * Track add_to_cart event
 * @param {Object} product - Product data
 * @param {number} quantity - Quantity added
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackAddToCart = (
  product,
  quantity = 1,
  additionalData = {},
  debug = true
) => {
  const item = formatGA4Item(product, quantity);

  const ecommerceData = {
    currency: getCurrency(),
    value: item.price * quantity,
    items: [item],
  };

  // Track GA4 event
  trackGA4EcommerceEvent("add_to_cart", ecommerceData, additionalData, debug);

  // Track TikTok event
  trackTikTokAddToCart(product, quantity, additionalData, debug);
};

/**
 * Track remove_from_cart event
 * @param {Object} product - Product data
 * @param {number} quantity - Quantity removed
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackRemoveFromCart = (
  product,
  quantity = 1,
  additionalData = {},
  debug = true
) => {
  const item = formatGA4Item(product, quantity);

  const ecommerceData = {
    currency: getCurrency(),
    value: item.price * quantity,
    items: [item],
  };

  trackGA4EcommerceEvent(
    "remove_from_cart",
    ecommerceData,
    additionalData,
    debug
  );
};

/**
 * Track view_cart event
 * @param {Array} cartItems - Array of cart items
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackViewCart = (
  cartItems = [],
  additionalData = {},
  debug = true
) => {
  const items = cartItems.map((item) =>
    formatGA4Item(item.product, item.quantity)
  );
  const totalValue = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const ecommerceData = {
    currency: getCurrency(),
    value: totalValue,
    items: items,
  };

  trackGA4EcommerceEvent("view_cart", ecommerceData, additionalData, debug);
};

/**
 * Track begin_checkout event
 * @param {Array} cartItems - Array of cart items
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackBeginCheckout = (
  cartItems = [],
  additionalData = {},
  debug = true
) => {
  const items = cartItems.map((item) =>
    formatGA4Item(item.product, item.quantity)
  );
  const totalValue = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const ecommerceData = {
    currency: getCurrency(),
    value: totalValue,
    items: items,
  };

  // Track GA4 event
  trackGA4EcommerceEvent(
    "begin_checkout",
    ecommerceData,
    additionalData,
    debug
  );

  // Track TikTok event
  trackTikTokInitiateCheckout(cartItems, additionalData, debug);
};

/**
 * Track search event
 * @param {string} searchTerm - The search term
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackSearch = (searchTerm, additionalData = {}, debug = true) => {
  const eventData = {
    search_term: searchTerm,
    ...additionalData,
  };

  // Track GA4 event
  trackGA4Event("search", eventData, debug);

  // Track TikTok event
  trackTikTokSearch(searchTerm, additionalData, debug);
};

/**
 * Track page_view event (for manual page view tracking)
 * @param {string} pageTitle - Page title
 * @param {string} pagePath - Page path
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackPageView = (
  pageTitle,
  pagePath,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    page_title: pageTitle,
    page_location:
      typeof window !== "undefined" ? window.location.href : pagePath,
    page_path: pagePath,
    ...additionalData,
  };

  trackGA4Event("page_view", eventData, debug);
};

/**
 * Track custom event
 * @param {string} eventName - Custom event name
 * @param {Object} eventData - Event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackCustomEvent = (eventName, eventData = {}, debug = true) => {
  trackGA4Event(eventName, eventData, debug);
};

/**
 * Track form submission
 * @param {string} formName - Form identifier
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackFormSubmit = (
  formName,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    form_name: formName,
    ...additionalData,
  };

  trackGA4Event("form_submit", eventData, debug);
};

/**
 * Track button click
 * @param {string} buttonName - Button identifier
 * @param {string} location - Where the button was clicked
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackButtonClick = (
  buttonName,
  location,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    button_name: buttonName,
    button_location: location,
    ...additionalData,
  };

  trackGA4Event("button_click", eventData, debug);
};

/**
 * Track video interaction
 * @param {string} videoTitle - Video title
 * @param {string} action - Action type (play, pause, complete, etc.)
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackVideoInteraction = (
  videoTitle,
  action,
  additionalData = {},
  debug = true
) => {
  const eventData = {
    video_title: videoTitle,
    video_action: action,
    ...additionalData,
  };

  trackGA4Event("video_interaction", eventData, debug);
};

/**
 * Higher-order function to create event tracking hooks
 * @param {Function} trackingFunction - The tracking function to use
 * @returns {Function} React hook
 */
export const createTrackingHook = (trackingFunction) => {
  return (...args) => {
    const track = () => trackingFunction(...args);
    return track;
  };
};
