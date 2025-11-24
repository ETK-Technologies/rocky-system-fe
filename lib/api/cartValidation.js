/**
 * Cart Validation API
 * Validates cart for checkout (stock availability, pricing, etc.)
 */

/**
 * Validate cart for checkout
 * @param {string} sessionId - Session ID for guest users (optional)
 * @returns {Promise<Object>} Validation result
 */
export async function validateCart(sessionId = null) {
  try {
    // Check authentication first - authenticated users should NOT send sessionId
    const { isAuthenticated } = await import("@/lib/cart/cartService");
    const isAuth = isAuthenticated();

    // Build URL - only add sessionId for guest users
    let url = "/api/cart/validate";
    
    // IMPORTANT: Only add sessionId if user is NOT authenticated
    // If user is authenticated, sessionId will be ignored by the API route anyway,
    // but we should not send it to avoid confusion
    if (!isAuth) {
      // Use provided sessionId or get from localStorage
      let finalSessionId = sessionId;
      if (!finalSessionId) {
        try {
          const { getSessionId } = await import("@/services/sessionService");
          finalSessionId = getSessionId();
        } catch (error) {
          // Session service not available, continue without it
        }
      }
      
      if (finalSessionId) {
        url += `?sessionId=${encodeURIComponent(finalSessionId)}`;
      }
    }
    // If authenticated, don't add sessionId to URL

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Extract error message from various possible structures
      let errorMessage = errorData.error || errorData.message || "Cart validation failed";
      
      // If there are details, try to extract more specific error messages
      if (errorData.details) {
        if (typeof errorData.details === "string") {
          errorMessage = errorData.details;
        } else if (errorData.details.message) {
          errorMessage = errorData.details.message;
        } else if (Array.isArray(errorData.details) && errorData.details.length > 0) {
          // If details is an array, use the first error message
          errorMessage = errorData.details[0].message || errorData.details[0] || errorMessage;
        }
      }
      
      return {
        success: false,
        valid: false,
        error: errorMessage,
        details: errorData.details,
        cart: errorData.cart, // May contain cart data even on validation failure
      };
    }

    const data = await response.json();
    
    // Handle nested response structure: data.data.cart contains the cart
    const cartData = data.data?.cart || data.data;
    const isValid = data.valid !== false && (data.data?.valid !== false);
    
    return {
      success: true,
      valid: isValid,
      message: data.message || "Cart is valid for checkout",
      cart: cartData, // Return cart data to update cart state
      data: data.data, // Return full data object
    };
  } catch (error) {
    console.error("Error validating cart:", error);
    return {
      success: false,
      valid: false,
      error: error.message || "Failed to validate cart",
    };
  }
}

export default {
  validateCart,
};

