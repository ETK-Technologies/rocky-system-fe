/**
 * Universal Flow Cart Handler
 * Replaces URL parameter approach with direct cart addition for all flows
 * Preserves all flow-specific behavior and terms
 *
 * REFACTORED: Now uses cartService.js for all cart operations instead of
 * duplicating localStorage logic. This ensures consistency across the app.
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

/**
 * Add products directly to cart for any flow type
 * @param {Object} mainProduct - Main product data
 * @param {Array} addons - Array of addon products
 * @param {String} flowType - Flow type (ed, hair, wl, mh, skincare)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result with success status and redirect URL
 */
export const addToCartDirectly = async (
  mainProduct,
  addons = [],
  flowType = "ed",
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

    // Check authentication status
    const isAuthenticated = isUserAuthenticated();
    logger.log(
      `Authentication status: ${isAuthenticated ? "Authenticated" : "Not authenticated"
      }`
    );

    if (isAuthenticated) {
      // ===== AUTHENTICATED FLOW: Direct API Calls =====
      return await handleAuthenticatedFlow(mainProduct, addons, flowType, {
        preserveExistingCart,
        subscriptionPeriod,
        varietyPackId,
      });
    } else {
      // ===== UNAUTHENTICATED FLOW: Save to LocalStorage + Login =====
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
 * Handle cart addition for authenticated users (Direct API calls)
 */
async function handleAuthenticatedFlow(mainProduct, addons, flowType, options) {
  const { preserveExistingCart, subscriptionPeriod, varietyPackId } = options;

  try {
    // Flow-specific pre-processing
    await handleFlowSpecificPreProcessing(flowType, preserveExistingCart);

    // Refresh cart nonce to ensure we have a valid nonce for cart operations
    await refreshCartNonce();

    // Prepare items for batch addition
    const cartItems = await prepareCartItems(mainProduct, addons, flowType, {
      subscriptionPeriod,
      varietyPackId,
    });

    logger.log(
      `🛒 Flow Handler - Prepared ${cartItems.length} items for ${flowType} flow:`,
      cartItems
    );

    // Log each item details for debugging
    cartItems.forEach((item, index) => {
      logger.log(`🛒 Flow Handler - Item ${index + 1}:`, item);
    });

    // Use batch endpoint for multiple items, individual for single item
    let cartResult;
    if (cartItems.length > 1) {
      logger.log(
        `🛒 Flow Handler - Using BATCH endpoint for ${cartItems.length} items`
      );
      cartResult = await addItemsBatch(cartItems);
    } else if (cartItems.length === 1) {
      logger.log(`🛒 Flow Handler - Using INDIVIDUAL endpoint for 1 item`);
      cartResult = await addSingleItem(cartItems[0]);
    } else {
      throw new Error("No valid items to add to cart");
    }

    logger.log(`🛒 Flow Handler - Cart API Response:`, cartResult);

    if (cartResult.success) {
      // Check for partial failures in batch operations
      const expectedItems = cartItems.length;
      const addedItems = cartResult.added_items || cartItems.length;
      const failedItems = cartResult.failed_items || 0;

      logger.log(
        `🛒 Flow Handler - Items check: Expected=${expectedItems}, Added=${addedItems}, Failed=${failedItems}`
      );

      // If we have failed items or didn't add all expected items, treat as failure
      if (failedItems > 0 || addedItems < expectedItems) {
        logger.error(
          `🛒 Flow Handler - Partial failure detected: ${addedItems}/${expectedItems} items added`
        );

        // Log specific errors for debugging
        if (cartResult.errors && cartResult.errors.length > 0) {
          logger.error("🛒 Flow Handler - Item errors:", cartResult.errors);
        }

        throw new Error(
          `Unable to add all products to cart (${addedItems}/${expectedItems} successful). Please try again or contact support if the problem persists.`
        );
      }

      // All items added successfully
      logger.log(
        `✅ Flow Handler - All ${addedItems} items added successfully`
      );

      // Add flow-specific consultation requirements
      addFlowConsultationRequirements(mainProduct, flowType);

      // Generate clean checkout URL
      const checkoutUrl = generateFlowCheckoutUrl(flowType, true);

      return {
        success: true,
        message: `Products added to cart successfully`,
        redirectUrl: checkoutUrl,
        flowType,
        itemsAdded: addedItems,
        cart: cartResult.cart,
      };
    } else {
      throw new Error(cartResult.error || "Failed to add items to cart");
    }
  } catch (error) {
    logger.error(`Authenticated ${flowType} flow error:`, error);
    throw error;
  }
}

/**
 * Handle cart addition for unauthenticated users (LocalStorage + Login redirect)
 */
async function handleUnauthenticatedFlow(
  mainProduct,
  addons,
  flowType,
  options
) {
  const { requireConsultation, subscriptionPeriod, varietyPackId } = options;

  try {
    // Save products to localStorage for post-login retrieval
    const savedProductData = {
      mainProduct,
      addons,
      flowType,
      timestamp: Date.now(),
      options: { requireConsultation, subscriptionPeriod, varietyPackId },
    };

    localStorage.setItem(
      "flow_cart_products",
      JSON.stringify(savedProductData)
    );
    logger.log(
      `Saved ${flowType} flow products to localStorage for post-login processing`
    );

    // Add flow-specific consultation requirements to localStorage
    addFlowConsultationRequirements(mainProduct, flowType);

    // Generate login URL with proper redirect
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
}

/**
 * Helper function to format cart data from cartService for cross-sell display
 * Converts cartService format to the format expected by cross-sell popups
 */
function formatCartDataForDisplay(cartServiceData) {
  // cartService returns { items, total_items, total_price }
  // Ensure consistent structure for cross-sell display
  return {
    items: cartServiceData.items || [],
    items_count:
      cartServiceData.total_items || cartServiceData.items_count || 0,
    totals: {
      total_items: (cartServiceData.total_price || 0).toString(),
      total_price: (cartServiceData.total_price || 0).toString(),
      currency_code: getCurrency(),
      currency_symbol: "$",
      currency_minor_unit: 2,
      currency_decimal_separator: ".",
      currency_thousand_separator: ",",
      currency_prefix: "$",
      currency_suffix: "",
    },
  };
}

/**
 * Handle early cart addition for unauthenticated users using cartService
 * Adds products to localStorage cart via cartService and returns cart data for display
 */
async function handleUnauthenticatedEarlyAddition(
  mainProduct,
  flowType,
  options
) {
  try {
    logger.log(
      `🛒 Early addition via cartService for ${flowType} flow (unauthenticated)`
    );

    const { requireConsultation, subscriptionPeriod, varietyPackId } = options;

    // Prepare main product for cartService
    // Convert price from dollars to cents (flow config files use dollars)
    const priceInDollars = parseFloat(mainProduct.price) || 0;
    const priceInCents = priceInDollars * 100;

    const mainProductData = {
      productId: extractProductId(mainProduct),
      variationId: mainProduct.variationId,
      quantity: 1,
      name: mainProduct.name,
      price: priceInCents, // Pass price in cents for API compatibility
      image: mainProduct.image,
      product_type: mainProduct.isSubscription ? "subscription" : "simple",
      variation: mainProduct.variation || [],
    };

    logger.log("🛒 Adding main product via cartService:", mainProductData);
    logger.log(
      `💰 Price conversion: $${priceInDollars} → ${priceInCents} cents`
    );

    // Add main product to localStorage cart via cartService
    await addItemToCart(mainProductData);

    // For WL flow, add Body Optimization Program as required addon
    if (flowType === "wl") {
      logger.log(
        "🛒 Adding Body Optimization Program for WL flow via cartService"
      );
      const bodyOptimizationData = {
        productId: "148515",
        quantity: 1,
        name: "Body Optimization Program",
        price: 99,
        image:
          "https://mycdn.myrocky.com/wp-content/uploads/20240403133727/wl-consultation-sq-small-icon-wt.png",
        product_type: "simple",
        variation: [],
      };

      await addItemToCart(bodyOptimizationData);
    }

    // Add flow-specific consultation requirements
    addFlowConsultationRequirements(mainProduct, flowType);

    // Get the updated cart from cartService
    const cartData = getLocalCart();
    logger.log(
      "✅ Products added to localStorage cart via cartService:",
      cartData
    );

    // Return success with cart data for display
    return {
      success: true,
      message: "Product added to cart",
      flowType,
      cartData: formatCartDataForDisplay(cartData),
      authenticationRequired: false, // Don't redirect yet, show cross-sell first
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
}

/**
 * Handle addon addition for unauthenticated users using cartService
 * Adds addon to localStorage cart via cartService and returns updated cart data
 */
async function handleUnauthenticatedAddonAddition(
  addonProduct,
  flowType,
  options
) {
  try {
    logger.log(
      `🛒 Adding addon via cartService for ${flowType} flow (unauthenticated)`
    );

    // Build variation data for addon if not already provided
    const addonVariation = addonProduct.variation || [];

    // Add subscription type/frequency to variation if not already present
    if (
      !addonVariation.some(
        (v) =>
          v.attribute === "Subscription Type" || v.attribute === "Frequency"
      )
    ) {
      if (addonProduct.frequency) {
        // If frequency is provided, use it
        addonVariation.push({
          attribute: "Frequency",
          value: addonProduct.frequency,
        });
      } else if (
        addonProduct.dataType === "simple" ||
        !addonProduct.isSubscription
      ) {
        // If it's a simple product (one-time purchase)
        addonVariation.push({
          attribute: "Subscription Type",
          value: "One-time Purchase",
        });
      } else if (
        addonProduct.dataType === "subscription" ||
        addonProduct.isSubscription
      ) {
        // If it's a subscription product
        addonVariation.push({
          attribute: "Subscription Type",
          value: addonProduct.subscriptionPeriod || "Monthly Supply",
        });
      }
    }

    // Prepare addon for cartService
    // Convert price from dollars to cents (flow config files use dollars)
    const addonPriceInDollars = parseFloat(
      addonProduct.price || addonProduct.dataPrice || 0
    );
    const addonPriceInCents = addonPriceInDollars * 100;

    const addonData = {
      productId: extractProductId(addonProduct),
      variationId: addonProduct.variationId || addonProduct.dataAddToCart,
      quantity: 1,
      name:
        addonProduct.title ||
        addonProduct.name ||
        addonProduct.dataName ||
        "Add-on Product",
      price: addonPriceInCents, // Pass price in cents for API compatibility
      image:
        addonProduct.image ||
        addonProduct.imageUrl || // WL addons use imageUrl
        addonProduct.images?.[0]?.src ||
        addonProduct.dataImage,
      product_type:
        addonProduct.isSubscription || addonProduct.dataType === "subscription"
          ? "subscription"
          : "simple",
      variation: addonVariation,
    };

    logger.log("🛒 Adding addon via cartService:", addonData);
    logger.log(
      `💰 Addon price conversion: $${addonPriceInDollars} → ${addonPriceInCents} cents`
    );

    // Add addon to localStorage cart via cartService
    await addItemToCart(addonData);

    // Get the updated cart from cartService
    const cartData = getLocalCart();
    logger.log(
      "✅ Addon added to localStorage cart via cartService:",
      cartData
    );

    // Return success with cart data formatted for display
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
}

/**
 * Handle flow-specific pre-processing (cart clearing, etc.)
 */
async function handleFlowSpecificPreProcessing(flowType, preserveExistingCart) {
  if (flowType === "wl" && !preserveExistingCart) {
    // Weight Loss flow requires cart clearing
    logger.log("WL flow: Clearing existing cart...");
    try {
      await emptyCart();
      logger.log("Cart cleared successfully for WL flow");
    } catch (clearError) {
      logger.error("Error clearing cart for WL flow:", clearError);
      // Continue anyway - cart clearing failure shouldn't stop checkout
    }
  }
}

/**
 * Prepare cart items from main product and addons
 */
async function prepareCartItems(mainProduct, addons, flowType, options) {
  const { subscriptionPeriod, varietyPackId } = options;
  const items = [];

  // Prepare main product
  if (mainProduct) {
    logger.log(
      `🛒 Flow Handler - Preparing main product for ${flowType} flow:`,
      mainProduct
    );

    // Check if this is a variety pack with comma-separated product IDs
    const productId = extractProductId(mainProduct);
    const isVarietyPack =
      mainProduct.isVarietyPack || (productId && productId.includes(","));

    if (isVarietyPack && productId && productId.includes(",")) {
      // Split comma-separated product IDs and create separate items
      const productIds = productId.split(",").map((id) => id.trim());
      logger.log(
        `🛒 Flow Handler - Variety pack detected, splitting into ${productIds.length} products:`,
        productIds
      );

      productIds.forEach((singleProductId, index) => {
        if (!singleProductId) return; // Skip empty IDs

        const mainItem = {
          productId: singleProductId,
          quantity: mainProduct.quantity || 1,
          isSubscription: mainProduct.isSubscription || false,
          subscriptionPeriod:
            subscriptionPeriod || mainProduct.subscriptionPeriod || "1_month",
        };

        // Add variation ID if available (use the same variation ID for all items in pack)
        if (mainProduct.variationId) {
          mainItem.variationId = mainProduct.variationId;
        }

        // Add variety pack metadata
        mainItem.isVarietyPack = true;
        mainItem.varietyPackId =
          varietyPackId || mainProduct.varietyPackId || generateVarietyPackId();

        // Add flow-specific metadata
        mainItem.meta_data = [
          {
            key: "_flow_type",
            value: flowType,
          },
          {
            key: "_source",
            value: "direct_flow_addition",
          },
          {
            key: "_variety_pack_item_index",
            value: index.toString(),
          },
          ...(mainProduct.meta_data || []),
        ];

        items.push(mainItem);
        logger.log(
          `🛒 Flow Handler - Variety pack item ${index + 1} prepared:`,
          mainItem
        );
      });
    } else {
      // Regular single product handling (existing logic)
      const mainItem = {
        productId: productId,
        quantity: mainProduct.quantity || 1,
        isSubscription: mainProduct.isSubscription || false,
        subscriptionPeriod:
          subscriptionPeriod || mainProduct.subscriptionPeriod || "1_month",
      };
      logger.log(`🛒 Flow Handler - Main item prepared:`, mainItem);

      // Add variation ID if available
      if (mainProduct.variationId) {
        mainItem.variationId = mainProduct.variationId;
        logger.log(
          `🛒 Flow Handler - Using variation ID: ${mainProduct.variationId} for product: ${mainItem.productId}`
        );
      }

      // For subscription products without explicit variation ID,
      // let the cart API handle variation lookup based on subscription period
      if (
        mainProduct.isSubscription &&
        !mainProduct.variationId &&
        subscriptionPeriod
      ) {
        logger.log(
          `Subscription product ${mainItem.productId} without variation ID - letting API handle variation lookup for period: ${subscriptionPeriod}`
        );
        // Don't set variationId, let WooCommerce find it based on subscription attributes
      }

      // Add variety pack metadata if applicable
      if (varietyPackId || mainProduct.isVarietyPack) {
        mainItem.isVarietyPack = true;
        mainItem.varietyPackId =
          varietyPackId || mainProduct.varietyPackId || generateVarietyPackId();
      }

      // Add flow-specific metadata
      mainItem.meta_data = [
        {
          key: "_flow_type",
          value: flowType,
        },
        {
          key: "_source",
          value: "direct_flow_addition",
        },
        ...(mainProduct.meta_data || []),
      ];

      items.push(mainItem);
    }
  }

  // Prepare addon products
  if (addons && addons.length > 0) {
    for (const addon of addons) {
      const addonItem = {
        productId: extractProductId(addon),
        quantity: 1, // Always 1 for addon products
        isSubscription:
          addon.isSubscription || addon.dataType === "subscription",
        subscriptionPeriod:
          addon.subscriptionPeriod || addon.dataVar || "1_month",
      };

      // Add variation ID if available
      if (addon.variationId) {
        addonItem.variationId = addon.variationId;
      }

      // Add metadata to identify as addon
      addonItem.meta_data = [
        {
          key: "_flow_type",
          value: flowType,
        },
        {
          key: "_item_type",
          value: "addon",
        },
        {
          key: "_source",
          value: "direct_flow_addition",
        },
        ...(addon.meta_data || []),
      ];

      items.push(addonItem);
    }
  }

  // WL Flow: Add required Body Optimization Program to batch
  if (flowType === "wl") {
    logger.log(
      "🛒 Flow Handler - Adding Body Optimization Program to WL batch"
    );
    const bodyOptimizationProgram = {
      productId: "148515",
      quantity: 1,
      meta_data: [
        { key: "_flow_type", value: "wl" },
        { key: "_item_type", value: "required_base" },
        { key: "_source", value: "wl_flow_requirement" },
      ],
    };
    items.push(bodyOptimizationProgram);
    logger.log(
      "🛒 Flow Handler - Body Optimization Program prepared:",
      bodyOptimizationProgram
    );
  }

  return items;
}

/**
 * Refresh cart nonce using centralized nonce manager
 * This ensures we have a fresh, valid nonce for cart operations
 */
async function refreshCartNonce() {
  return await refreshCartNonceClient();
}

/**
 * Add items using batch endpoint
 */
async function addItemsBatch(items) {
  logger.log(`Adding ${items.length} items via batch endpoint`);

  const response = await fetch("/api/cart/add-items-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Batch add failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Add single item using individual endpoint
 * Includes sessionId for guest users ONLY
 */
async function addSingleItem(item) {
  logger.log("Adding single item via individual endpoint");

  const authenticated = checkIsAuthenticated();
  logger.log("🔐 addSingleItem - User authenticated:", authenticated);

  // Prepare request body
  const requestBody = { ...item };

  if (authenticated) {
    // For authenticated users, explicitly REMOVE sessionId if present
    if (requestBody.sessionId) {
      logger.warn("⚠️ Removing sessionId from authenticated user request");
      delete requestBody.sessionId;
    }
    logger.log("✅ Sending authenticated request (no sessionId):", requestBody);
  } else {
    // For guest users, include sessionId
    const { getSessionId } = await import("@/services/sessionService");
    const sessionId = getSessionId();
    if (sessionId) {
      requestBody.sessionId = sessionId;
      logger.log("✅ Sending guest request (with sessionId):", requestBody);
    }
  }

  const response = await fetch("/api/cart/add-item", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Individual add failed: ${response.statusText} - ${errorText}`
    );
  }

  const result = await response.json();
  return {
    success: true,
    added_items: 1,
    cart: result,
  };
}

/**
 * Add flow-specific consultation requirements to localStorage
 */
function addFlowConsultationRequirements(mainProduct, flowType) {
  try {
    const productId = extractProductId(mainProduct);
    const flowKey = `${flowType}-flow`;

    // Use the same localStorage key as the existing system
    const consultationData = {
      productId,
      flowType: flowKey,
      timestamp: Date.now(),
    };

    localStorage.setItem(
      `required_consultation_${productId}`,
      JSON.stringify(consultationData)
    );
    logger.log(
      `Added consultation requirement for ${flowType} flow, product ${productId}`
    );
  } catch (error) {
    logger.error("Error adding consultation requirements:", error);
    // Non-blocking error
  }
}

/**
 * Generate clean checkout URL for authenticated users
 */
function generateFlowCheckoutUrl(flowType, isAuthenticated = true) {
  const baseUrl = "/checkout";
  const flowParam = `${flowType}-flow=1`;

  if (isAuthenticated) {
    return `${baseUrl}?${flowParam}`;
  } else {
    return `${baseUrl}?${flowParam}&onboarding=1`;
  }
}

/**
 * Generate login URL for unauthenticated users
 */
function generateLoginUrl(flowType, requireConsultation = false) {
  const baseUrl = "/login-register";
  const flowParam = `${flowType}-flow=1`;
  const checkoutRedirect = encodeURIComponent(
    generateFlowCheckoutUrl(flowType, true)
  );

  let loginUrl = `${baseUrl}?${flowParam}&onboarding=1&view=account&viewshow=register&redirect_to=${checkoutRedirect}`;

  if (requireConsultation) {
    loginUrl += "&consultation-required=1";
  }

  return loginUrl;
}

/**
 * Extract product ID from various product object formats
 */
function extractProductId(product) {
  if (!product) return null;

  // Handle various ID formats from different flows
  return (
    product.id ||
    product.productId ||
    product.dataAddToCart ||
    product.variationId ||
    product.product_id ||
    null
  );
}

/**
 * Generate unique variety pack ID
 */
function generateVarietyPackId() {
  return `variety_pack_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

/**
 * Process saved cart products after login (called by cart migration)
 */
/**
 * DEPRECATED: This function is no longer needed.
 * Use cartService.migrateLocalCartToServer() instead, which is automatically
 * called in Login.jsx after successful authentication.
 *
 * The cartService handles all localStorage -> server cart migration,
 * including flow products, regular products, and preserves all metadata.
 */
export async function processSavedFlowProducts() {
  logger.warn(
    "processSavedFlowProducts() is deprecated. Use cartService.migrateLocalCartToServer() instead."
  );
  return { success: true, message: "Migration handled by cartService" };
}

/**
 * Flow-specific cart handlers for backward compatibility
 */
export const edFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, "ed", options);

export const hairFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, "hair", options);

export const wlFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, "wl", {
    ...options,
    preserveExistingCart: false,
  });

export const mhFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, "mh", options);

export const skincareFlowAddToCart = (mainProduct, addons, options) =>
  addToCartDirectly(mainProduct, addons, "skincare", options);

/**
 * ========================================================================
 * NEW FUNCTIONS FOR EARLY CART ADDITION WITH CROSS-SELL CART DISPLAY
 * ========================================================================
 */

/**
 * Add product to cart early (before cross-sell popup)
 * Returns cart data for popup display
 * Does NOT redirect - just adds to cart and returns cart state
 *
 * @param {Object} mainProduct - Main product data
 * @param {String} flowType - Flow type (ed, hair, wl, mh, skincare)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result with success status, cart data, and redirect URL
 */
export const addToCartEarly = async (
  mainProduct,
  flowType = "ed",
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

    // Check authentication status
    const isAuthenticated = isUserAuthenticated();
    logger.log(
      `Authentication status: ${isAuthenticated ? "Authenticated" : "Not authenticated"
      }`
    );

    if (isAuthenticated) {
      // ===== AUTHENTICATED FLOW: Direct API Calls =====
      return await handleAuthenticatedEarlyAddition(mainProduct, flowType, {
        preserveExistingCart,
        subscriptionPeriod,
        varietyPackId,
      });
    } else {
      // ===== UNAUTHENTICATED FLOW: Save to LocalStorage + Show Cross-Sell =====
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
 * Handle early cart addition for authenticated users
 * Similar to handleAuthenticatedFlow but returns cart data instead of redirecting
 */
async function handleAuthenticatedEarlyAddition(
  mainProduct,
  flowType,
  options
) {
  const { preserveExistingCart, subscriptionPeriod, varietyPackId } = options;

  try {
    // Flow-specific pre-processing
    await handleFlowSpecificPreProcessing(flowType, preserveExistingCart);

    // Refresh cart nonce
    await refreshCartNonce();

    // Prepare items for batch addition (includes main product only, no addons yet)
    const cartItems = await prepareCartItems(mainProduct, [], flowType, {
      subscriptionPeriod,
      varietyPackId,
    });

    logger.log(
      `🛒 Early Addition - Prepared ${cartItems.length} items for ${flowType} flow:`,
      cartItems
    );

    // Use batch endpoint for multiple items, individual for single item
    let cartResult;
    if (cartItems.length > 1) {
      logger.log(
        `🛒 Early Addition - Using BATCH endpoint for ${cartItems.length} items`
      );
      cartResult = await addItemsBatch(cartItems);
    } else if (cartItems.length === 1) {
      logger.log(`🛒 Early Addition - Using INDIVIDUAL endpoint for 1 item`);
      cartResult = await addSingleItem(cartItems[0]);
    } else {
      throw new Error("No valid items to add to cart");
    }

    logger.log(`🛒 Early Addition - Cart API Response:`, cartResult);

    if (cartResult.success) {
      // Check for partial failures
      const expectedItems = cartItems.length;
      const addedItems = cartResult.added_items || cartItems.length;
      const failedItems = cartResult.failed_items || 0;

      if (failedItems > 0 || addedItems < expectedItems) {
        logger.error(
          `🛒 Early Addition - Partial failure: ${addedItems}/${expectedItems} items added`
        );
        throw new Error(
          `Unable to add all products to cart (${addedItems}/${expectedItems} successful).`
        );
      }

      // Add flow-specific consultation requirements
      addFlowConsultationRequirements(mainProduct, flowType);

      // Generate checkout URL (but don't redirect yet)
      const checkoutUrl = generateFlowCheckoutUrl(flowType, true);

      // Return cart data for popup display
      return {
        success: true,
        message: `Product added to cart successfully`,
        cartData: cartResult.cart || cartResult, // Return full cart data
        redirectUrl: checkoutUrl,
        flowType,
        itemsAdded: addedItems,
      };
    } else {
      throw new Error(cartResult.error || "Failed to add items to cart");
    }
  } catch (error) {
    logger.error(`Early ${flowType} cart addition error:`, error);
    throw error;
  }
}

/**
 * Add a single addon product to existing cart
 * Used when user clicks addon in cross-sell popup
 *
 * @param {Object} addonProduct - Addon product data
 * @param {String} flowType - Flow type (ed, hair, wl, mh, skincare)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result with success status and updated cart data
 */
export const addAddonToCart = async (
  addonProduct,
  flowType = "ed",
  options = {}
) => {
  try {
    logger.log(`🛒 Adding addon to cart for ${flowType} flow`);
    logger.log("Addon Product:", addonProduct);

    // Check authentication
    const isAuthenticated = isUserAuthenticated();

    if (!isAuthenticated) {
      // Handle unauthenticated addon addition to localStorage
      return await handleUnauthenticatedAddonAddition(
        addonProduct,
        flowType,
        options
      );
    }

    const { subscriptionPeriod = null } = options;

    // Refresh cart nonce
    await refreshCartNonce();

    // Prepare the addon item
    const addonItem = {
      productId: extractProductId(addonProduct),
      quantity: 1, // Always 1 for addons
      isSubscription:
        addonProduct.isSubscription || addonProduct.dataType === "subscription",
      subscriptionPeriod:
        subscriptionPeriod ||
        addonProduct.subscriptionPeriod ||
        addonProduct.dataVar ||
        "1_month",
    };

    // Add variation ID if available
    if (addonProduct.variationId || addonProduct.dataAddToCart) {
      addonItem.variationId =
        addonProduct.variationId || addonProduct.dataAddToCart;
    }

    // Add metadata to identify as addon
    addonItem.meta_data = [
      {
        key: "_flow_type",
        value: flowType,
      },
      {
        key: "_item_type",
        value: "addon",
      },
      {
        key: "_source",
        value: "cross_sell_popup",
      },
      ...(addonProduct.meta_data || []),
    ];

    logger.log(`🛒 Adding addon item:`, addonItem);

    // Add to cart
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
 * Cart already has all products, just generate redirect URL
 *
 * @param {String} flowType - Flow type (ed, hair, wl, mh, skincare)
 * @param {Boolean} isAuthenticated - Whether user is authenticated
 * @returns {String} Checkout URL
 */
export const finalizeFlowCheckout = (
  flowType = "ed",
  isAuthenticated = true
) => {
  logger.log(`🎯 Finalizing checkout for ${flowType} flow`);

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    // For flows that require consultation, check localStorage consultation flags
    let requireConsultation = false;

    // Check if consultation is required for this flow
    if (flowType === "ed" || flowType === "hair" || flowType === "wl") {
      const consultKey = `${flowType.toLowerCase()}_requires_consultation`;
      requireConsultation = localStorage.getItem(consultKey) === "true";
    }

    const loginUrl = generateLoginUrl(flowType, requireConsultation);
    logger.log(`User not authenticated, redirecting to login: ${loginUrl}`);
    return loginUrl;
  }

  // Generate checkout URL for authenticated users
  const checkoutUrl = generateFlowCheckoutUrl(flowType, isAuthenticated);

  logger.log(`Redirecting to: ${checkoutUrl}`);

  return checkoutUrl;
};
