/**
 * Centralized Cart Management Utility
 * Handles all cart display, fetch, and manipulation operations
 * Used across all flow cross-sell popups
 */

import { logger } from "@/utils/devLogger";
import { refreshCartNonceClient } from "./nonceManager";

/**
 * Fetch current cart contents
 * @returns {Promise<Object>} Cart data with items, totals, etc.
 */
export const fetchCart = async () => {
  try {
    logger.log("📦 Fetching cart contents...");

    // Refresh nonce before cart operation (for old WooCommerce compatibility)
    await refreshCartNonceClient();

    // Check if user is authenticated - authenticated users should NOT send sessionId
    const { isAuthenticated } = await import("@/lib/cart/cartService");
    const authenticated = isAuthenticated();
    
    let url = "/api/cart";
    
    // Only add sessionId for guest users (not authenticated)
    if (!authenticated) {
      try {
        const { getSessionId } = await import("@/services/sessionService");
        const sessionId = getSessionId();
        if (sessionId) {
          url = `/api/cart?sessionId=${sessionId}`;
        }
      } catch (error) {
        // If sessionService fails, continue without sessionId
        logger.log("Could not get sessionId, fetching cart without it");
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch cart: ${response.statusText} - ${errorText}`
      );
    }

    const cartData = await response.json();
    logger.log("📦 Cart fetched successfully:", cartData);

    return {
      success: true,
      cart: cartData,
    };
  } catch (error) {
    logger.error("❌ Error fetching cart:", error);
    return {
      success: false,
      error: error.message,
      cart: null,
    };
  }
};

/**
 * Remove item from cart
 * @param {String} itemKey - The cart item key to remove
 * @returns {Promise<Object>} Result with success status and updated cart
 */
export const removeItemFromCart = async (itemKey) => {
  try {
    logger.log(`🗑️ Removing item from cart: ${itemKey}`);

    // Refresh nonce before cart operation
    await refreshCartNonceClient();

    const response = await fetch("/api/cart", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemKey }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to remove item: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    logger.log("✅ Item removed successfully:", result);

    return {
      success: true,
      cart: result, // The API returns the full cart data directly
      message: "Item removed from cart",
    };
  } catch (error) {
    logger.error("❌ Error removing item from cart:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Refresh cart data (refetch from server)
 * @returns {Promise<Object>} Updated cart data
 */
export const refreshCart = async () => {
  logger.log("🔄 Refreshing cart...");
  return await fetchCart();
};

/**
 * Format cart data for display in cross-sell popup
 * Extracts and formats relevant information from WooCommerce cart response
 * @param {Object} cartData - Raw cart data from API
 * @returns {Object} Formatted cart data
 */
export const formatCartForDisplay = (cartData) => {
  try {
    if (!cartData) {
      return {
        items: [],
        subtotal: 0,
        total: 0,
        itemCount: 0,
      };
    }

    // Handle different cart response formats
    const items = cartData.items || [];
    const cartItems = Array.isArray(items) ? items : Object.values(items);

    // Format items for display
    const formattedItems = cartItems.map((item) => {
      // Get currency minor unit (default to 2 for cents)
      const currencyMinorUnit = item.prices?.currency_minor_unit || 2;
      const divisor = Math.pow(10, currencyMinorUnit);

      // Extract price values (they come as strings from API in cents)
      const rawPrice = item.prices?.price || item.price || "0";
      const rawSubtotal =
        item.totals?.line_subtotal ||
        item.totals?.subtotal ||
        item.line_subtotal ||
        "0";
      const rawTotal =
        item.totals?.line_total || item.totals?.total || item.line_total || "0";

      // Convert to numbers and divide by divisor to get dollars
      const priceInDollars = parseFloat(rawPrice) / divisor;
      const subtotalInDollars = parseFloat(rawSubtotal) / divisor;
      const totalInDollars = parseFloat(rawTotal) / divisor;

      logger.log(`💰 Price conversion for ${item.name}:`, {
        rawTotal,
        divisor,
        totalInDollars,
      });

      return {
        key: item.key || item.item_key,
        id: item.id || item.product_id,
        name: item.name || "Product",
        price: priceInDollars,
        quantity: parseInt(item.quantity || 1, 10),
        subtotal: subtotalInDollars,
        total: totalInDollars,
        image: item.images?.[0]?.src || item.image || "",
        variation: item.variation || null,
      };
    });

    // Calculate totals
    const subtotal = formattedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );
    const total = formattedItems.reduce((sum, item) => sum + item.total, 0);

    logger.log("📦 Formatted cart data:", {
      itemCount: formattedItems.length,
      subtotal,
      total,
    });

    return {
      items: formattedItems,
      subtotal: subtotal,
      total: total,
      itemCount: formattedItems.length,
    };
  } catch (error) {
    logger.error("❌ Error formatting cart data:", error);
    return {
      items: [],
      subtotal: 0,
      total: 0,
      itemCount: 0,
      error: error.message,
    };
  }
};

/**
 * Check if cart is empty
 * @param {Object} cartData - Cart data object
 * @returns {Boolean} True if cart is empty
 */
export const isCartEmpty = (cartData) => {
  if (!cartData) return true;
  const items = cartData.items || [];
  return items.length === 0;
};

/**
 * Get cart item count
 * @param {Object} cartData - Cart data object
 * @returns {Number} Number of items in cart
 */
export const getCartItemCount = (cartData) => {
  if (!cartData) return 0;
  const items = cartData.items || [];
  return items.length;
};

/**
 * Find specific item in cart by product ID
 * @param {Object} cartData - Cart data object
 * @param {String|Number} productId - Product ID to find
 * @returns {Object|null} Cart item or null if not found
 */
export const findCartItem = (cartData, productId) => {
  if (!cartData || !cartData.items) return null;
  return cartData.items.find((item) => String(item.id) === String(productId));
};

/**
 * Check if product is already in cart
 * @param {Object} cartData - Cart data object
 * @param {String|Number} productId - Product ID to check
 * @returns {Boolean} True if product is in cart
 */
export const isProductInCart = (cartData, productId) => {
  return findCartItem(cartData, productId) !== null;
};
