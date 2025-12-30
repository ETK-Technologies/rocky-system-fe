/**
 * Universal Flow Cart Handler
 * Replaces URL parameter approach with direct cart addition for all flows
 * Preserves all flow-specific behavior and terms
 *
 * REFACTORED: Now uses cartService.js for all cart operations instead of
 * duplicating localStorage logic. This ensures consistency across the app.
 *
 * @module flowCartHandler
 * @author Rocky Development Team
 * @version 2.0.0
 */

import { logger } from "@/utils/devLogger";
import { isUserAuthenticated } from "./crossSellCheckout";
import {
  addItemToCart,
  getCart,
  getLocalCart,
  emptyCart,
  isAuthenticated as checkIsAuthenticated,
} from "@/lib/cart/cartService";
import { refreshCartNonceClient } from "./nonceManager";
import { getCurrency } from "@/lib/constants/currency";

// ============================================================================
// CONSTANTS
// ============================================================================

const FLOW_TYPES = {
  ED: "ed",
  HAIR: "hair",
  WL: "wl",
  MH: "mh",
  SKINCARE: "skincare",
};

const SUBSCRIPTION_PERIODS = {
  MONTHLY: "1_month",
  QUARTERLY: "3_month",
  YEARLY: "1_year",
};

const ITEM_TYPES = {
  MAIN: "main",
  ADDON: "addon",
  REQUIRED_BASE: "required_base",
};

const PRODUCT_TYPES = {
  SIMPLE: "simple",
  SUBSCRIPTION: "subscription",
  VARIABLE: "variable",
};

const METADATA_KEYS = {
  FLOW_TYPE: "_flow_type",
  ITEM_TYPE: "_item_type",
  SOURCE: "_source",
  BULK_ITEM_INDEX: "_bulk_item_index",
  BULK_TOTAL_ITEMS: "_bulk_total_items",
};

const SOURCES = {
  DIRECT_FLOW: "direct_flow_addition",
  CROSS_SELL: "cross_sell_popup",
  WL_REQUIREMENT: "wl_flow_requirement",
};

const API_ENDPOINTS = {
  ADD_ITEM: "/api/cart/add-item",
  ADD_BATCH: "/api/cart/add-items-batch",
};

const BODY_OPTIMIZATION_PROGRAM = {
  PRODUCT_ID: "cmidswzti02q0vrv8xq5vg5vd",
  NAME: "Body Optimization Program",
  PRICE: 99,
  IMAGE: "https://mycdn.myrocky.com/wp-content/uploads/20240403133727/wl-consultation-sq-small-icon-wt.png",
};

const STORAGE_KEYS = {
  FLOW_CART_PRODUCTS: "flow_cart_products",
  CONSULTATION_PREFIX: "required_consultation_",
  AUTH_TOKEN: "authToken",
  TOKEN: "token",
};

const CURRENCY_CONFIG = {
  CODE: getCurrency(),
  SYMBOL: "$",
  MINOR_UNIT: 2,
  DECIMAL_SEPARATOR: ".",
  THOUSAND_SEPARATOR: ",",
  PREFIX: "$",
  SUFFIX: "",
};

const ROUTES = {
  CHECKOUT: "/checkout",
  LOGIN: "/login-register",
};

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} ProductData
 * @property {string} id - Product ID
 * @property {string} [productId] - Alternative product ID
 * @property {string} [variationId] - Variation ID
 * @property {string} [variantId] - Alternative variation ID
 * @property {string} name - Product name
 * @property {number} price - Product price
 * @property {string} image - Product image URL
 * @property {boolean} [isSubscription] - Is subscription product
 * @property {string} [subscriptionPeriod] - Subscription period
 * @property {number} [quantity] - Quantity
 * @property {Array} [meta_data] - Additional metadata
 * @property {Array} [variation] - Variation attributes
 */

/**
 * @typedef {Object} CartItem
 * @property {string} productId - Product ID
 * @property {string} [variationId] - Variation ID
 * @property {number} quantity - Quantity
 * @property {boolean} [isSubscription] - Is subscription
 * @property {string} [subscriptionPeriod] - Subscription period
 * @property {boolean} [isVarietyPack] - Is variety pack
 * @property {string} [varietyPackId] - Variety pack ID
 * @property {Array} [meta_data] - Metadata array
 */

/**
 * @typedef {Object} FlowOptions
 * @property {boolean} [preserveExistingCart=true] - Keep existing cart items
 * @property {boolean} [requireConsultation=false] - Require consultation
 * @property {string} [subscriptionPeriod=null] - Subscription period override
 * @property {string} [varietyPackId=null] - Variety pack identifier
 */

/**
 * @typedef {Object} CartResult
 * @property {boolean} success - Operation success status
 * @property {string} [message] - Success message
 * @property {string} [error] - Error message
 * @property {string} [redirectUrl] - Redirect URL
 * @property {string} flowType - Flow type
 * @property {number} [itemsAdded] - Number of items added
 * @property {Object} [cart] - Cart data
 * @property {Object} [cartData] - Formatted cart data
 * @property {boolean} [authenticationRequired] - Auth required flag
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a value is a valid product ID
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid product ID
 */
const isValidProductId = (value) => {
  return value && value !== "null" && value !== "undefined" && String(value).trim() !== "";
};

/**
 * Safely converts value to string
 * @param {*} value - Value to convert
 * @returns {string} String representation
 */
const safeString = (value) => {
  return value ? String(value) : "";
};

/**
 * Splits comma-separated string into array of trimmed values
 * @param {string} str - String to split
 * @returns {string[]} Array of values
 */
const splitAndTrim = (str) => {
  return safeString(str)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Creates metadata object for cart items
 * @param {string} flowType - Flow type
 * @param {string} itemType - Item type (main, addon, required_base)
 * @param {string} source - Source identifier
 * @param {Object} [additional={}] - Additional metadata
 * @returns {Array} Metadata array
 */
const createMetadata = (flowType, itemType, source, additional = {}) => {
  const metadata = [
    { key: METADATA_KEYS.FLOW_TYPE, value: flowType },
    { key: METADATA_KEYS.ITEM_TYPE, value: itemType },
    { key: METADATA_KEYS.SOURCE, value: source },
  ];

  Object.entries(additional).forEach(([key, value]) => {
    metadata.push({ key, value: String(value) });
  });

  return metadata;
};

/**
 * Generates a unique variety pack ID
 * @returns {string} Unique identifier
 */
const generateVarietyPackId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `variety_pack_${timestamp}_${random}`;
};

/**
 * Extracts product ID from various product object formats
 * @param {Object} product - Product object
 * @returns {string|null} Product ID or null
 */
const extractProductId = (product) => {
  if (!product) return null;

  // Priority order for ID extraction
  const idCandidates = [
    product.id,
    product.productId,
    product.dataAddToCart,
    product.variationId,
    product.product_id,
  ];

  return idCandidates.find(isValidProductId) || null;
};

/**
 * Gets authentication token from localStorage
 * @returns {string|null} Auth token or null
 */
const getAuthToken = () => {
  try {
    return (
      localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    );
  } catch (error) {
    logger.error("Error getting auth token:", error);
    return null;
  }
};

/**
 * Refreshes cart nonce using centralized nonce manager
 * @returns {Promise<void>}
 */
const refreshCartNonce = async () => {
  return await refreshCartNonceClient();
};

/**
 * Formats price from dollars to cents
 * @param {number|string} priceInDollars - Price in dollars
 * @returns {number} Price in cents
 */
const dollarsToCents = (priceInDollars) => {
  return Math.round(parseFloat(priceInDollars || 0) * 100);
};

// ============================================================================
// URL GENERATION FUNCTIONS
// ============================================================================

/**
 * Generates checkout URL for flow
 * @param {string} flowType - Flow type
 * @param {boolean} [isAuthenticated=true] - Is user authenticated
 * @returns {string} Checkout URL
 */
const generateFlowCheckoutUrl = (flowType, isAuthenticated = true) => {
  const flowParam = `${flowType}-flow=1`;
  const baseUrl = ROUTES.CHECKOUT;

  if (isAuthenticated) {
    return `${baseUrl}?${flowParam}`;
  }
  return `${baseUrl}?${flowParam}&onboarding=1`;
};

/**
 * Generates login URL for unauthenticated users
 * @param {string} flowType - Flow type
 * @param {boolean} [requireConsultation=false] - Require consultation
 * @returns {string} Login URL
 */
const generateLoginUrl = (flowType, requireConsultation = false) => {
  const flowParam = `${flowType}-flow=1`;
  const checkoutRedirect = encodeURIComponent(
    generateFlowCheckoutUrl(flowType, true)
  );

  let loginUrl = `${ROUTES.LOGIN}?${flowParam}&onboarding=1&view=account&viewshow=register&redirect_to=${checkoutRedirect}`;

  if (requireConsultation) {
    loginUrl += "&consultation-required=1";
  }

  return loginUrl;
};

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Adds flow-specific consultation requirements to localStorage
 * @param {Object} mainProduct - Main product data
 * @param {string} flowType - Flow type
 */
const addFlowConsultationRequirements = (mainProduct, flowType) => {
  try {
    const productId = extractProductId(mainProduct);
    if (!isValidProductId(productId)) {
      logger.warn("Cannot add consultation requirement without valid product ID");
      return;
    }

    const flowKey = `${flowType}-flow`;
    const consultationData = {
      productId,
      flowType: flowKey,
      timestamp: Date.now(),
    };

    const storageKey = `${STORAGE_KEYS.CONSULTATION_PREFIX}${productId}`;
    localStorage.setItem(storageKey, JSON.stringify(consultationData));
    
    logger.log(
      `Added consultation requirement for ${flowType} flow, product ${productId}`
    );
  } catch (error) {
    logger.error("Error adding consultation requirements:", error);
    // Non-blocking error
  }
};

/**
 * Formats cart data from cartService for cross-sell display
 * @param {Object} cartServiceData - Cart service data
 * @returns {Object} Formatted cart data
 */
const formatCartDataForDisplay = (cartServiceData) => {
  return {
    items: cartServiceData.items || [],
    items_count: cartServiceData.total_items || cartServiceData.items_count || 0,
    totals: {
      total_items: (cartServiceData.total_price || 0).toString(),
      total_price: (cartServiceData.total_price || 0).toString(),
      currency_code: CURRENCY_CONFIG.CODE,
      currency_symbol: CURRENCY_CONFIG.SYMBOL,
      currency_minor_unit: CURRENCY_CONFIG.MINOR_UNIT,
      currency_decimal_separator: CURRENCY_CONFIG.DECIMAL_SEPARATOR,
      currency_thousand_separator: CURRENCY_CONFIG.THOUSAND_SEPARATOR,
      currency_prefix: CURRENCY_CONFIG.PREFIX,
      currency_suffix: CURRENCY_CONFIG.SUFFIX,
    },
  };
};

// ============================================================================
// CART ITEM PREPARATION FUNCTIONS
// ============================================================================

/**
 * Prepares a single product item for cart
 * @param {string} productId - Product ID
 * @param {Object} product - Product data
 * @param {string} flowType - Flow type
 * @param {Object} options - Options (subscriptionPeriod, varietyPackId)
 * @param {number} [index] - Index for bulk items
 * @param {number} [total] - Total bulk items
 * @returns {CartItem} Prepared cart item
 */
const prepareSingleCartItem = (
  productId,
  product,
  flowType,
  { subscriptionPeriod, varietyPackId },
  index = null,
  total = null
) => {
  const item = {
    productId,
    quantity: product.quantity || 1,
    isSubscription: product.isSubscription || false,
    subscriptionPeriod:
      subscriptionPeriod ||
      product.subscriptionPeriod ||
      SUBSCRIPTION_PERIODS.MONTHLY,
  };

  // Add variation ID if available
  const variationId = product.variationId || product.variantId || product.id;
  if (isValidProductId(variationId)) {
    item.variationId = variationId;
  } else if (product.isSubscription) {
    logger.warn(
      `⚠️ Subscription product ${productId} missing variationId - API may fail`
    );
  }

  // Add variety pack metadata if applicable
  if (product.isVarietyPack || varietyPackId) {
    item.isVarietyPack = true;
    item.varietyPackId =
      varietyPackId || product.varietyPackId || generateVarietyPackId();
  }

  // Build metadata
  const additionalMeta = {};
  if (index !== null && total !== null) {
    additionalMeta[METADATA_KEYS.BULK_ITEM_INDEX] = index;
    additionalMeta[METADATA_KEYS.BULK_TOTAL_ITEMS] = total;
  }

  item.meta_data = [
    ...createMetadata(flowType, ITEM_TYPES.MAIN, SOURCES.DIRECT_FLOW, additionalMeta),
    ...(product.meta_data || []),
  ];

  return item;
};

/**
 * Prepares multiple products from comma-separated IDs
 * @param {string} productIds - Comma-separated product IDs
 * @param {string} variationIds - Comma-separated variation IDs
 * @param {Object} product - Product data
 * @param {string} flowType - Flow type
 * @param {Object} options - Options
 * @returns {CartItem[]} Array of cart items
 */
const prepareMultipleCartItems = (
  productIds,
  variationIds,
  product,
  flowType,
  options
) => {
  const productIdArray = splitAndTrim(productIds);
  const variationIdArray = splitAndTrim(variationIds);

  logger.log(
    `🛒 Multiple products detected, splitting into ${productIdArray.length} items`
  );
  logger.log(`🛒 Product IDs:`, productIdArray);
  logger.log(`🛒 Variation IDs:`, variationIdArray);

  return productIdArray
    .filter(isValidProductId)
    .map((singleProductId, index) => {
      // Match variation ID by index if available
      const variationId = variationIdArray[index];
      
      const productData = {
        ...product,
        variationId: isValidProductId(variationId) ? variationId : null,
      };

      const item = prepareSingleCartItem(
        singleProductId,
        productData,
        flowType,
        options,
        index,
        productIdArray.length
      );

      logger.log(
        `🛒 Item ${index + 1}/${productIdArray.length} prepared:`,
        { productId: item.productId, variationId: item.variationId }
      );

      return item;
    });
};

/**
 * Prepares addon product item for cart
 * @param {Object} addon - Addon product data
 * @param {string} flowType - Flow type
 * @param {Object} [options={}] - Additional options
 * @returns {CartItem|null} Prepared addon item or null if invalid
 */
const prepareAddonCartItem = (addon, flowType, options = {}) => {
  const addonProductId = extractProductId(addon);

  if (!isValidProductId(addonProductId)) {
    logger.warn(`⚠️ Skipping addon with invalid product ID:`, addon);
    return null;
  }

  const item = {
    productId: addonProductId,
    quantity: 1,
    isSubscription: addon.isSubscription || addon.dataType === PRODUCT_TYPES.SUBSCRIPTION,
    subscriptionPeriod:
      options.subscriptionPeriod ||
      addon.subscriptionPeriod ||
      addon.dataVar ||
      SUBSCRIPTION_PERIODS.MONTHLY,
  };

  // Add variation ID if available
  const addonVariationId = addon.variationId || addon.variantId;
  if (isValidProductId(addonVariationId)) {
    item.variationId = addonVariationId;
  } else if (item.isSubscription) {
    logger.warn(
      `⚠️ Addon subscription product ${addonProductId} missing variationId`
    );
  }

  // Add metadata
  item.meta_data = [
    ...createMetadata(flowType, ITEM_TYPES.ADDON, SOURCES.DIRECT_FLOW),
    ...(addon.meta_data || []),
  ];

  return item;
};

/**
 * Prepares Body Optimization Program for WL flow
 * @param {string} flowType - Flow type
 * @returns {CartItem} Body optimization cart item
 */
const prepareBodyOptimizationItem = (flowType) => {
  return {
    productId: BODY_OPTIMIZATION_PROGRAM.PRODUCT_ID,
    quantity: 1,
    meta_data: createMetadata(
      flowType,
      ITEM_TYPES.REQUIRED_BASE,
      SOURCES.WL_REQUIREMENT
    ),
  };
};

/**
 * Prepares all cart items from main product and addons
 * @param {Object} mainProduct - Main product data
 * @param {Array} addons - Array of addon products
 * @param {string} flowType - Flow type
 * @param {Object} options - Options
 * @returns {Promise<CartItem[]>} Array of prepared cart items
 */
const prepareCartItems = async (mainProduct, addons, flowType, options) => {
  const { subscriptionPeriod, varietyPackId } = options;
  const items = [];

  // Prepare main product
  if (mainProduct) {
    logger.log(
      `🛒 Flow Handler - Preparing main product for ${flowType} flow:`,
      mainProduct
    );

    const productId = extractProductId(mainProduct);

    // Validate product ID
    if (!isValidProductId(productId)) {
      logger.error(`⚠️ Invalid product ID detected:`, { productId, mainProduct });
      throw new Error("Product ID is required but was not found in mainProduct");
    }

    logger.log(`🔍 Extracted and validated productId: ${productId}`);

    const productIdStr = safeString(productId);
    const hasMultipleProducts = productIdStr.includes(",");

    // Split comma-separated products or handle single product
    if (hasMultipleProducts) {
      const variationIdStr = safeString(
        mainProduct.variationId || mainProduct.variantId
      );
      const multipleItems = prepareMultipleCartItems(
        productIdStr,
        variationIdStr,
        mainProduct,
        flowType,
        { subscriptionPeriod, varietyPackId }
      );
      items.push(...multipleItems);
    } else {
      const singleItem = prepareSingleCartItem(
        productId,
        mainProduct,
        flowType,
        { subscriptionPeriod, varietyPackId }
      );
      items.push(singleItem);
      logger.log(`🛒 Single item prepared:`, singleItem);
    }
  }

  // Prepare addon products
  if (addons?.length > 0) {
    logger.log(`🛒 Preparing ${addons.length} addon(s)`);
    
    for (const addon of addons) {
      const addonItem = prepareAddonCartItem(addon, flowType, options);
      if (addonItem) {
        items.push(addonItem);
      }
    }
  }

  // Add Body Optimization Program for WL flow
  if (flowType === FLOW_TYPES.WL) {
    logger.log("🛒 Adding Body Optimization Program to WL batch");
    const bodyOptItem = prepareBodyOptimizationItem(flowType);
    items.push(bodyOptItem);
  }

  logger.log(`🛒 Total items prepared: ${items.length}`, items);
  return items;
};

// ============================================================================
// API CALL FUNCTIONS
// ============================================================================

/**
 * Prepares request headers and body for API calls
 * @param {Array} items - Cart items
 * @param {boolean} isAuthenticated - Is user authenticated
 * @returns {Promise<Object>} Headers and body for request
 */
const prepareApiRequest = async (items, isAuthenticated) => {
  const headers = {
    "Content-Type": "application/json",
  };

  const requestBody = {
    items: items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity || 1,
      ...(item.variationId && { variationId: String(item.variationId) }),
      ...(item.isSubscription && {
        isSubscription: true,
        subscriptionPeriod: item.subscriptionPeriod || SUBSCRIPTION_PERIODS.MONTHLY,
      }),
      ...(item.isVarietyPack && {
        isVarietyPack: true,
        varietyPackId: item.varietyPackId,
      }),
      ...(item.meta_data?.length > 0 && { meta_data: item.meta_data }),
    })).filter((item) => item.productId),
  };

  if (isAuthenticated) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      logger.log("🔐 Using Authorization header (authenticated)");
    }
  } else {
    const { getSessionId } = await import("@/services/sessionService");
    const sessionId = getSessionId();
    if (sessionId) {
      requestBody.sessionId = sessionId;
      logger.log("👤 Using sessionId for guest:", sessionId);
    } else {
      logger.warn("⚠️ No sessionId found for guest user");
    } 
  }

  return { headers, requestBody };
};

/**
 * Parses API response and extracts success/failure counts
 * @param {Object} result - API response
 * @param {number} expectedCount - Expected number of items
 * @returns {Object} Parsed result with counts
 */
const parseApiResponse = (result, expectedCount) => {
  const successCount = result.results?.filter((r) => r.success).length || 0;
  const failCount = result.results?.filter((r) => !r.success).length || 0;
  const errors = result.results?.filter((r) => !r.success).map((r) => r.error) || [];

  return {
    success: successCount > 0,
    added_items: successCount,
    failed_items: failCount,
    total_items: expectedCount,
    cart: result.cart,
    results: result.results,
    errors,
  };
};

/**
 * Adds items using batch endpoint
 * @param {CartItem[]} items - Items to add
 * @returns {Promise<Object>} Result with success status and cart data
 */
const addItemsBatch = async (items) => {
  logger.log(`Adding ${items.length} items via BULK API endpoint`);

  const isAuthenticated = checkIsAuthenticated();
  const { headers, requestBody } = await prepareApiRequest(items, isAuthenticated);

  logger.log("📦 Bulk request payload:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(API_ENDPOINTS.ADD_BATCH, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Bulk API Error Response:", errorText);
      throw new Error(
        `Failed to add items in bulk: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    logger.log("Bulk API Success Response:", result);

    return parseApiResponse(result, items.length);
  } catch (error) {
    logger.error("Bulk API request failed:", error);
    throw error;
  }
};

/**
 * Adds single item using API endpoint
 * @param {CartItem} item - Item to add
 * @returns {Promise<Object>} Result with success status and cart data
 */
const addSingleItem = async (item) => {
  logger.log("Adding single item via API endpoint");

  const isAuthenticated = checkIsAuthenticated();
  
  const headers = {
    "Content-Type": "application/json",
  };

  // Single item endpoint expects flat object, not items array
  const requestBody = {
    productId: String(item.productId),
    quantity: item.quantity || 1,
  };

  // Use variantId (not variationId) for single-item endpoint
  if (item.variationId) {
    requestBody.variantId = String(item.variationId);
  }

  // Add subscription details if applicable
  if (item.isSubscription) {
    requestBody.isSubscription = true;
    requestBody.subscriptionPeriod = item.subscriptionPeriod || SUBSCRIPTION_PERIODS.MONTHLY;
  }

  // Add variety pack details if applicable
  if (item.isVarietyPack) {
    requestBody.isVarietyPack = true;
    requestBody.varietyPackId = item.varietyPackId;
  }

  // Add metadata if available
  if (item.meta_data?.length > 0) {
    requestBody.meta_data = item.meta_data;
  }

  // Add authentication or session
  if (isAuthenticated) {
    const token = getAuthToken();
    logger.log("is User Authenticated: true", token );
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      logger.log("🔐 Using Authorization header (authenticated)");
    }
  } else {
    const { getSessionId } = await import("@/services/sessionService");
    const sessionId = getSessionId();
    if (sessionId) {
      requestBody.sessionId = sessionId;
      logger.log("👤 Using sessionId for guest:", sessionId);
    } else {
      logger.warn("⚠️ No sessionId found for guest user");
    }
  }

  logger.log("is USer Authenticated:", headers);

  logger.log("📦 Single item request payload:", requestBody);

  try {
    const response = await fetch(API_ENDPOINTS.ADD_ITEM, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("API Error Response:", errorText);
      throw new Error(
        `Failed to add item: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    logger.log("API Success Response:", result);

    // If response.ok and we got JSON back with cart data, consider it successful
    // API might return different formats: { success, cart } or { cart } or { results: [...] }
    const hasCart = !!result.cart;
    const explicitSuccess = result.success === true;
    const explicitFailure = result.success === false;
    
    // Success if: explicitly true, or has cart data and not explicitly false, or response was ok
    const success = explicitSuccess || (hasCart && !explicitFailure) || (response.ok && !explicitFailure);
    const error = result.error || result.message;

    logger.log(`🛒 Single item result: success=${success}, hasCart=${hasCart}, explicitSuccess=${explicitSuccess}`);

    return {
      success: !!success,
      added_items: success ? 1 : 0,
      cart: result.cart || result,
      error,
    };
  } catch (error) {
    logger.error("API request failed:", error);
    throw error;
  }
};

// ============================================================================
// FLOW-SPECIFIC HANDLERS
// ============================================================================

/**
 * Handles flow-specific pre-processing (e.g., cart clearing)
 * @param {string} flowType - Flow type
 * @param {boolean} preserveExistingCart - Should preserve existing cart
 * @returns {Promise<void>}
 */
const handleFlowSpecificPreProcessing = async (flowType, preserveExistingCart) => {
  if (flowType === FLOW_TYPES.WL && !preserveExistingCart) {
    logger.log("WL flow: Clearing existing cart...");
    try {
      await emptyCart();
      logger.log("Cart cleared successfully for WL flow");
    } catch (clearError) {
      logger.error("Error clearing cart for WL flow:", clearError);
      // Continue anyway - cart clearing failure shouldn't stop checkout
    }
  }
};

/**
 * Validates cart result and checks for partial failures
 * @param {Object} cartResult - Cart API result
 * @param {number} expectedItems - Expected number of items
 * @throws {Error} If validation fails
 */
const validateCartResult = (cartResult, expectedItems) => {
  if (!cartResult.success) {
    const errorDetails = {
      error: cartResult.error,
      message: cartResult.message,
      results: cartResult.results,
    };
    logger.error("🛒 API Error Details:", errorDetails);
    throw new Error(
      cartResult.error || cartResult.message || "Failed to add items to cart"
    );
  }

  const addedItems = cartResult.added_items || expectedItems;
  const failedItems = cartResult.failed_items || 0;

  logger.log(
    `🛒 Items check: Expected=${expectedItems}, Added=${addedItems}, Failed=${failedItems}`
  );

  if (failedItems > 0 || addedItems < expectedItems) {
    logger.error(
      `🛒 Partial failure: ${addedItems}/${expectedItems} items added`
    );

    if (cartResult.errors?.length > 0) {
      logger.error("🛒 Item errors:", cartResult.errors);
    }

    if (cartResult.results?.length > 0) {
      cartResult.results.forEach((result, idx) => {
        if (!result.success) {
          logger.error(`  ❌ Item ${idx + 1} failed:`, result.error);
        }
      });
    }

    throw new Error(
      `Unable to add all products to cart (${addedItems}/${expectedItems} successful). ` +
      "Please try again or contact support if the problem persists."
    );
  }

  logger.log(`✅ All ${addedItems} items added successfully`);
};

/**
 * Handles authenticated user cart flow (Direct API calls)
 * @param {Object} mainProduct - Main product data
 * @param {Array} addons - Addon products
 * @param {string} flowType - Flow type
 * @param {FlowOptions} options - Flow options
 * @returns {Promise<CartResult>} Cart result
 */
const handleAuthenticatedFlow = async (mainProduct, addons, flowType, options) => {
  const { preserveExistingCart, subscriptionPeriod, varietyPackId } = options;

  try {
    // Pre-processing (e.g., clear cart for WL flow)
    await handleFlowSpecificPreProcessing(flowType, preserveExistingCart);

    // Refresh cart nonce
    await refreshCartNonce();

    // Prepare cart items
    const cartItems = await prepareCartItems(mainProduct, addons, flowType, {
      subscriptionPeriod,
      varietyPackId,
    });

    logger.log(
      `🛒 Prepared ${cartItems.length} items for ${flowType} flow:`,
      cartItems
    );

    // Add items to cart one by one (batch endpoint disabled temporarily)
    logger.log(`🛒 Adding ${cartItems.length} items one by one...`);
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < cartItems.length; i++) {
      try {
        logger.log(`🛒 Adding item ${i + 1}/${cartItems.length}...`);
        const itemResult = await addSingleItem(cartItems[i]);
        results.push(itemResult);
        
        if (itemResult.success) {
          successCount++;
          logger.log(`✅ Item ${i + 1} added successfully`);
        } else {
          failedCount++;
          logger.error(`❌ Item ${i + 1} failed:`, itemResult.error);
        }
      } catch (error) {
        failedCount++;
        logger.error(`❌ Item ${i + 1} threw error:`, error);
        results.push({ success: false, error: error.message });
      }
    }
    
    // Combine results into single response
    const cartResult = {
      success: successCount > 0,
      added_items: successCount,
      failed_items: failedCount,
      total_items: cartItems.length,
      cart: results[results.length - 1]?.cart, // Use cart from last successful addition
      results: results,
      errors: results.filter(r => !r.success).map(r => r.error),
    };

    logger.log(`🛒 Cart API Response:`, cartResult);

    // Validate result
    validateCartResult(cartResult, cartItems.length);

    // Add consultation requirements
    addFlowConsultationRequirements(mainProduct, flowType);

    // Generate checkout URL
    const checkoutUrl = generateFlowCheckoutUrl(flowType, true);

    return {
      success: true,
      message: "Products added to cart successfully",
      redirectUrl: checkoutUrl,
      flowType,
      itemsAdded: cartResult.added_items,
      cart: cartResult.cart,
    };
  } catch (error) {
    logger.error(`Authenticated ${flowType} flow error:`, error);
    throw error;
  }
};

/**
 * Handles unauthenticated user cart flow (LocalStorage + Login redirect)
 * @param {Object} mainProduct - Main product data
 * @param {Array} addons - Addon products
 * @param {string} flowType - Flow type
 * @param {FlowOptions} options - Flow options
 * @returns {Promise<CartResult>} Cart result
 */
const handleUnauthenticatedFlow = async (
  mainProduct,
  addons,
  flowType,
  options
) => {
  const { requireConsultation, subscriptionPeriod, varietyPackId } = options;

  try {
    // Save products to localStorage for post-login retrieval
    // const savedProductData = {
    //   mainProduct,
    //   addons,
    //   flowType,
    //   timestamp: Date.now(),
    //   options: { requireConsultation, subscriptionPeriod, varietyPackId },
    // };

    // localStorage.setItem(
    //   STORAGE_KEYS.FLOW_CART_PRODUCTS,
    //   JSON.stringify(savedProductData)
    // );
    
    // logger.log(
    //   `Saved ${flowType} flow products to localStorage for post-login processing`
    // );


     // Refresh cart nonce
    await refreshCartNonce();

    // Prepare cart items
    const cartItems = await prepareCartItems(mainProduct, addons, flowType, {
      subscriptionPeriod,
      varietyPackId,
    });

    logger.log(
      `🛒 Prepared ${cartItems.length} items for ${flowType} flow:`,
      cartItems
    );

    // Add items to cart one by one (batch endpoint disabled temporarily)
    logger.log(`🛒 Adding ${cartItems.length} items one by one...`);
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < cartItems.length; i++) {
      try {
        logger.log(`🛒 Adding item ${i + 1}/${cartItems.length}...`);
        const itemResult = await addSingleItem(cartItems[i]);
        results.push(itemResult);
        
        if (itemResult.success) {
          successCount++;
          logger.log(`✅ Item ${i + 1} added successfully`);
        } else {
          failedCount++;
          logger.error(`❌ Item ${i + 1} failed:`, itemResult.error);
        }
      } catch (error) {
        failedCount++;
        logger.error(`❌ Item ${i + 1} threw error:`, error);
        results.push({ success: false, error: error.message });
      }
    }
    
    // Combine results into single response
    const cartResult = {
      success: successCount > 0,
      added_items: successCount,
      failed_items: failedCount,
      total_items: cartItems.length,
      cart: results[results.length - 1]?.cart, // Use cart from last successful addition
      results: results,
      errors: results.filter(r => !r.success).map(r => r.error),
    };

    logger.log(`🛒 Cart API Response:`, cartResult);

    // Validate result
    validateCartResult(cartResult, cartItems.length);

    // Add consultation requirements
    addFlowConsultationRequirements(mainProduct, flowType);


    // Add consultation requirements
    addFlowConsultationRequirements(mainProduct, flowType);

    // Generate login URL
    const loginUrl = generateLoginUrl(flowType, requireConsultation);

    return {
      success: true,
      message: "Redirecting to login for checkout",
      redirectUrl: loginUrl,
      flowType,
      authenticationRequired: true,
    };
  } catch (error) {
    logger.error(`Unauthenticated ${flowType} flow error:`, error);
    throw error;
  }
};

/**
 * Handles early authenticated cart addition (for cross-sell popup)
 * @param {Object} mainProduct - Main product data
 * @param {string} flowType - Flow type
 * @param {FlowOptions} options - Flow options
 * @returns {Promise<CartResult>} Cart result with cart data
 */
const handleAuthenticatedEarlyAddition = async (
  mainProduct,
  flowType,
  options
) => {
  const { preserveExistingCart, subscriptionPeriod, varietyPackId } = options;

  try {
    await handleFlowSpecificPreProcessing(flowType, preserveExistingCart);
    await refreshCartNonce();

    // Prepare main product only (no addons yet)
    const cartItems = await prepareCartItems(mainProduct, [], flowType, {
      subscriptionPeriod,
      varietyPackId,
    });

    logger.log(
      `🛒 Early Addition - Prepared ${cartItems.length} items:`,
      cartItems
    );

    // Add items to cart one by one (batch endpoint disabled temporarily)
    logger.log(`🛒 Early Addition - Adding ${cartItems.length} items one by one...`);
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < cartItems.length; i++) {
      try {
        logger.log(`🛒 Early Addition - Adding item ${i + 1}/${cartItems.length}...`);
        const itemResult = await addSingleItem(cartItems[i]);
        results.push(itemResult);
        
        if (itemResult.success) {
          successCount++;
          logger.log(`✅ Early Addition - Item ${i + 1} added successfully`);
        } else {
          failedCount++;
          logger.error(`❌ Early Addition - Item ${i + 1} failed:`, itemResult.error);
        }
      } catch (error) {
        failedCount++;
        logger.error(`❌ Early Addition - Item ${i + 1} threw error:`, error);
        results.push({ success: false, error: error.message });
      }
    }
    
    // Combine results into single response
    const cartResult = {
      success: successCount > 0,
      added_items: successCount,
      failed_items: failedCount,
      total_items: cartItems.length,
      cart: results[results.length - 1]?.cart, // Use cart from last successful addition
      results: results,
      errors: results.filter(r => !r.success).map(r => r.error),
    };

    logger.log(`🛒 Early Addition - Cart API Response:`, cartResult);

    validateCartResult(cartResult, cartItems.length);
    addFlowConsultationRequirements(mainProduct, flowType);

    const checkoutUrl = generateFlowCheckoutUrl(flowType, true);

    return {
      success: true,
      message: "Product added to cart successfully",
      cartData: cartResult.cart || cartResult,
      redirectUrl: checkoutUrl,
      flowType,
      itemsAdded: cartResult.added_items,
    };
  } catch (error) {
    logger.error(`Early ${flowType} cart addition error:`, error);
    throw error;
  }
};

/**
 * Handles early unauthenticated cart addition using cartService
 * @param {Object} mainProduct - Main product data
 * @param {string} flowType - Flow type
 * @param {FlowOptions} options - Flow options
 * @returns {Promise<CartResult>} Cart result with formatted cart data
 */
const handleUnauthenticatedEarlyAddition = async (
  mainProduct,
  flowType,
  options
) => {
  try {
    logger.log(
      `🛒 Early addition via cartService for ${flowType} flow (unauthenticated)`
    );

    const { requireConsultation, subscriptionPeriod, varietyPackId } = options;

    const priceInCents = dollarsToCents(mainProduct.price);

    const mainProductData = {
      productId: extractProductId(mainProduct),
      variationId: mainProduct.variationId || mainProduct.variantId,
      quantity: 1,
      name: mainProduct.name,
      price: priceInCents,
      image: mainProduct.image,
      product_type: mainProduct.isSubscription
        ? PRODUCT_TYPES.SUBSCRIPTION
        : PRODUCT_TYPES.SIMPLE,
      variation: mainProduct.variation || [],
    };

    logger.log("🛒 Adding main product via cartService:", mainProductData);

    await addItemToCart(mainProductData);

    // Add Body Optimization Program for WL flow
    if (flowType === FLOW_TYPES.WL) {
      logger.log("🛒 Adding Body Optimization Program for WL flow");
      
      const bodyOptimizationData = {
        productId: BODY_OPTIMIZATION_PROGRAM.PRODUCT_ID,
        quantity: 1,
        name: BODY_OPTIMIZATION_PROGRAM.NAME,
        price: BODY_OPTIMIZATION_PROGRAM.PRICE,
        image: BODY_OPTIMIZATION_PROGRAM.IMAGE,
        product_type: PRODUCT_TYPES.SIMPLE,
        variation: [],
      };

      await addItemToCart(bodyOptimizationData);
    }

    addFlowConsultationRequirements(mainProduct, flowType);

    const cartData = getLocalCart();
    logger.log("✅ Products added to localStorage cart:", cartData);

    return {
      success: true,
      message: "Product added to cart",
      flowType,
      cartData: formatCartDataForDisplay(cartData),
      authenticationRequired: false,
    };
  } catch (error) {
    logger.error(
      `Error in unauthenticated early addition for ${flowType}:`,
      error
    );
    return {
      success: false,
      error: error.message,
      flowType,
    };
  }
};

/**
 * Handles addon addition for unauthenticated users using cartService
 * @param {Object} addonProduct - Addon product data
 * @param {string} flowType - Flow type
 * @param {FlowOptions} options - Flow options
 * @returns {Promise<CartResult>} Cart result with updated cart data
 */
const handleUnauthenticatedAddonAddition = async (
  addonProduct,
  flowType,
  options
) => {
  try {
    logger.log(
      `🛒 Adding addon via cartService for ${flowType} flow (unauthenticated)`
    );

    // Build variation data
    const addonVariation = addonProduct.variation || [];

    if (
      !addonVariation.some(
        (v) =>
          v.attribute === "Subscription Type" || v.attribute === "Frequency"
      )
    ) {
      if (addonProduct.frequency) {
        addonVariation.push({
          attribute: "Frequency",
          value: addonProduct.frequency,
        });
      } else if (
        addonProduct.dataType === PRODUCT_TYPES.SIMPLE ||
        !addonProduct.isSubscription
      ) {
        addonVariation.push({
          attribute: "Subscription Type",
          value: "One-time Purchase",
        });
      } else if (
        addonProduct.dataType === PRODUCT_TYPES.SUBSCRIPTION ||
        addonProduct.isSubscription
      ) {
        addonVariation.push({
          attribute: "Subscription Type",
          value: addonProduct.subscriptionPeriod || "Monthly Supply",
        });
      }
    }

    const addonPriceInCents = dollarsToCents(
      addonProduct.price || addonProduct.dataPrice
    );

    const addonData = {
      productId: extractProductId(addonProduct),
      variationId:
        addonProduct.variationId ||
        addonProduct.variantId ||
        addonProduct.dataAddToCart,
      quantity: 1,
      name:
        addonProduct.title ||
        addonProduct.name ||
        addonProduct.dataName ||
        "Add-on Product",
      price: addonPriceInCents,
      image:
        addonProduct.image ||
        addonProduct.imageUrl ||
        addonProduct.images?.[0]?.src ||
        addonProduct.dataImage,
      product_type:
        addonProduct.isSubscription ||
        addonProduct.dataType === PRODUCT_TYPES.SUBSCRIPTION
          ? PRODUCT_TYPES.SUBSCRIPTION
          : PRODUCT_TYPES.SIMPLE,
      variation: addonVariation,
    };

    logger.log("🛒 Adding addon via cartService:", addonData);

    await addItemToCart(addonData);

    const cartData = getLocalCart();
    logger.log("✅ Addon added to localStorage cart:", cartData);

    return {
      success: true,
      message: "Addon added to cart",
      flowType,
      cartData: formatCartDataForDisplay(cartData),
    };
  } catch (error) {
    logger.error("Error adding addon to localStorage:", error);
    return {
      success: false,
      error: error.message,
      flowType,
    };
  }
};

// ============================================================================
// PUBLIC API - MAIN ENTRY POINTS
// ============================================================================

/**
 * Add products directly to cart for any flow type
 * @param {ProductData} mainProduct - Main product data
 * @param {ProductData[]} [addons=[]] - Array of addon products
 * @param {string} [flowType="ed"] - Flow type (ed, hair, wl, mh, skincare)
 * @param {FlowOptions} [options={}] - Additional options
 * @returns {Promise<CartResult>} Result with success status and redirect URL
 */

// ============================================================================
// PUBLIC API - MAIN ENTRY POINTS
// ============================================================================

/**
 * Add products directly to cart for any flow type
 * @param {ProductData} mainProduct - Main product data
 * @param {ProductData[]} [addons=[]] - Array of addon products
 * @param {string} [flowType="ed"] - Flow type (ed, hair, wl, mh, skincare)
 * @param {FlowOptions} [options={}] - Additional options
 * @returns {Promise<CartResult>} Result with success status and redirect URL
 */
export const addToCartDirectly = async (
  mainProduct,
  addons = [],
  flowType = FLOW_TYPES.ED,
  options = {}
) => {
  try {
    logger.log(`🛒 Starting direct cart addition for ${flowType} flow`);
    logger.log("Main Product:", mainProduct);
    logger.log("Addons:", addons);

    const {
      preserveExistingCart = true,
      requireConsultation = false,
      subscriptionPeriod = null,
      varietyPackId = null,
    } = options;

    const isAuthenticated = checkIsAuthenticated();
    logger.log(
      `Authentication status: ${isAuthenticated ? "Authenticated" : "Not authenticated"}`
    );

    if (isAuthenticated) {
      return await handleAuthenticatedFlow(mainProduct, addons, flowType, {
        preserveExistingCart,
        subscriptionPeriod,
        varietyPackId,
      });
    } else {
      return await handleUnauthenticatedFlow(mainProduct, addons, flowType, {
        requireConsultation,
        subscriptionPeriod,
        varietyPackId,
      });
    }
  } catch (error) {
    logger.error(`Error in ${flowType} flow cart addition:`, error);
    return {
      success: false,
      error: error.message,
      flowType,
    };
  }
};

/**
 * Add product to cart early (before cross-sell popup)
 * Returns cart data for popup display - Does NOT redirect
 * @param {ProductData} mainProduct - Main product data
 * @param {string} [flowType="ed"] - Flow type
 * @param {FlowOptions} [options={}] - Additional options
 * @returns {Promise<CartResult>} Result with cart data
 */
export const addToCartEarly = async (
  mainProduct,
  flowType = FLOW_TYPES.ED,
  options = {}
) => {
  try {
    logger.log(`🛒 Early Cart Addition - Starting for ${flowType} flow`);
    logger.log("Main Product:", mainProduct);

    const {
      preserveExistingCart = true,
      requireConsultation = false,
      subscriptionPeriod = null,
      varietyPackId = null,
    } = options;

    const isAuthenticated = checkIsAuthenticated();
    logger.log(
      `Authentication status: ${isAuthenticated ? "Authenticated" : "Not authenticated"}`
    );

    if (isAuthenticated) {
      return await handleAuthenticatedEarlyAddition(mainProduct, flowType, {
        preserveExistingCart,
        subscriptionPeriod,
        varietyPackId,
      });
    } else {
      return await handleUnauthenticatedEarlyAddition(mainProduct, flowType, {
        requireConsultation,
        subscriptionPeriod,
        varietyPackId,
      });
    }
  } catch (error) {
    logger.error(`Error in early ${flowType} cart addition:`, error);
    return {
      success: false,
      error: error.message,
      flowType,
    };
  }
};

/**
 * Add a single addon product to existing cart
 * Used when user clicks addon in cross-sell popup
 * @param {ProductData} addonProduct - Addon product data
 * @param {string} [flowType="ed"] - Flow type
 * @param {FlowOptions} [options={}] - Additional options
 * @returns {Promise<CartResult>} Result with updated cart data
 */
export const addAddonToCart = async (
  addonProduct,
  flowType = FLOW_TYPES.ED,
  options = {}
) => {
  try {
    logger.log(`🛒 Adding addon to cart for ${flowType} flow`);
    logger.log("Addon Product:", addonProduct);

    const isAuthenticated = checkIsAuthenticated();

    if (!isAuthenticated) {
      return await handleUnauthenticatedAddonAddition(
        addonProduct,
        flowType,
        options
      );
    }

    const { subscriptionPeriod = null } = options;

    await refreshCartNonce();

    const addonItem = {
      productId: extractProductId(addonProduct),
      quantity: 1,
      isSubscription:
        addonProduct.isSubscription ||
        addonProduct.dataType === PRODUCT_TYPES.SUBSCRIPTION,
      subscriptionPeriod:
        subscriptionPeriod ||
        addonProduct.subscriptionPeriod ||
        addonProduct.dataVar ||
        SUBSCRIPTION_PERIODS.MONTHLY,
    };

    if (addonProduct.variationId || addonProduct.dataAddToCart) {
      addonItem.variationId =
        addonProduct.variationId || addonProduct.dataAddToCart;
    }

    addonItem.meta_data = [
      ...createMetadata(flowType, ITEM_TYPES.ADDON, SOURCES.CROSS_SELL),
      ...(addonProduct.meta_data || []),
    ];

    logger.log(`🛒 Adding addon item:`, addonItem);

    const cartResult = await addSingleItem(addonItem);

    if (cartResult.success) {
      logger.log(`✅ Addon added successfully`);
      return {
        success: true,
        message: "Addon added to cart",
        cartData: cartResult.cart || cartResult,
        flowType,
      };
    } else {
      throw new Error(cartResult.error || "Failed to add addon to cart");
    }
  } catch (error) {
    logger.error(`Error adding addon to ${flowType} cart:`, error);
    return {
      success: false,
      error: error.message,
      flowType,
    };
  }
};

/**
 * Finalize and redirect to checkout
 * Cart already has all products, just generates redirect URL
 * @param {string} [flowType="ed"] - Flow type
 * @param {boolean} [isAuthenticated=true] - Whether user is authenticated
 * @returns {string} Checkout URL
 */
export const finalizeFlowCheckout = (
  flowType = FLOW_TYPES.ED,
  isAuthenticated = true
) => {
  logger.log(`🎯 Finalizing checkout for ${flowType} flow`);

  if (!isAuthenticated) {
    let requireConsultation = false;

    // Check if consultation is required for this flow
    if ([FLOW_TYPES.ED, FLOW_TYPES.HAIR, FLOW_TYPES.WL].includes(flowType)) {
      const consultKey = `${flowType.toLowerCase()}_requires_consultation`;
      requireConsultation = localStorage.getItem(consultKey) === "true";
    }

    const loginUrl = generateLoginUrl(flowType, requireConsultation);
    logger.log(`User not authenticated, redirecting to login: ${loginUrl}`);
    return loginUrl;
  }

  const checkoutUrl = generateFlowCheckoutUrl(flowType, isAuthenticated);
  logger.log(`Redirecting to: ${checkoutUrl}`);

  return checkoutUrl;
};

// ============================================================================
// FLOW-SPECIFIC ALIASES (BACKWARD COMPATIBILITY)
// ============================================================================

/**
 * ED Flow cart handler
 * @param {ProductData} mainProduct - Main product
 * @param {ProductData[]} addons - Addons
 * @param {FlowOptions} options - Options
 * @returns {Promise<CartResult>}
 */
export const edFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, FLOW_TYPES.ED, options);

/**
 * Hair Flow cart handler
 * @param {ProductData} mainProduct - Main product
 * @param {ProductData[]} addons - Addons
 * @param {FlowOptions} options - Options
 * @returns {Promise<CartResult>}
 */
export const hairFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, FLOW_TYPES.HAIR, options);

/**
 * Weight Loss Flow cart handler
 * @param {ProductData} mainProduct - Main product
 * @param {ProductData[]} addons - Addons
 * @param {FlowOptions} options - Options
 * @returns {Promise<CartResult>}
 */
export const wlFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, FLOW_TYPES.WL, {
    ...options,
    preserveExistingCart: false,
  });

/**
 * Mental Health Flow cart handler
 * @param {ProductData} mainProduct - Main product
 * @param {ProductData[]} addons - Addons
 * @param {FlowOptions} options - Options
 * @returns {Promise<CartResult>}
 */
export const mhFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, FLOW_TYPES.MH, options);

/**
 * Skincare Flow cart handler
 * @param {ProductData} mainProduct - Main product
 * @param {ProductData[]} addons - Addons
 * @param {FlowOptions} options - Options
 * @returns {Promise<CartResult>}
 */
export const skincareFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, FLOW_TYPES.SKINCARE, options);

// ============================================================================
// DEPRECATED FUNCTIONS
// ============================================================================

/**
 * @deprecated Use cartService.migrateLocalCartToServer() instead
 * This function is automatically called in Login.jsx after authentication
 * @returns {Promise<Object>}
 */
export async function processSavedFlowProducts() {
  logger.warn(
    "processSavedFlowProducts() is deprecated. Use cartService.migrateLocalCartToServer() instead."
  );
  return { success: true, message: "Migration handled by cartService" };
}
