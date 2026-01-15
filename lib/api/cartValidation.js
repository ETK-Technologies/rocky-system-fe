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

    // For POST requests, sessionId should be in request body (not query string)
    // GET requests use query string, but POST requests use body (like /api/cart/add-item)
    let url = "/api/cart/validate";
    let requestBody = {};
    
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
      
      // Send sessionId in request body for POST requests (same pattern as /api/cart/add-item)
      if (finalSessionId) {
        requestBody.sessionId = finalSessionId;
      }
    }
    // If authenticated, don't add sessionId

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Extract error message from various possible structures
      let errorMessage = errorData.error || errorData.message || "Cart validation failed";
      let errorList = [];
      
      // If there are details, try to extract more specific error messages
      if (errorData.details) {
        if (typeof errorData.details === "string") {
          errorMessage = errorData.details;
        } else if (errorData.details.errors && Array.isArray(errorData.details.errors)) {
          // Backend returns errors as an array of strings
          // Transform technical messages to user-friendly ones
          errorList = errorData.details.errors.map(err => {
            // Transform technical error messages to user-friendly format
            // Example: "Insufficient stock for Sildenafil (Tabs frequency: 3 Tabs | Subscription Type: Monthly Supply). Available: 0, Requested: 1"
            // Becomes: "Sildenafil (3 Tabs, Monthly Supply) is currently out of stock"
            
            if (err.includes("Insufficient stock for")) {
              // Extract product name and variant info
              const match = err.match(/Insufficient stock for (.+?)\. Available:/);
              if (match) {
                let productInfo = match[1];
                
                // Clean up the variant info
                productInfo = productInfo
                  .replace(/Tabs frequency:/g, '')
                  .replace(/Subscription Type:/g, '')
                  .replace(/\s+\|/g, ',')
                  .replace(/\s+/g, ' ')
                  .trim();
                
                return `${productInfo} is currently out of stock`;
              }
            }
            
            // For price changes or other errors, return a simplified version
            if (err.includes("price has changed")) {
              return err.replace(/\. Was:.*/, ''); // Remove the price details
            }
            
            // Return original if no transformation needed
            return err;
          });
          
          // Create a user-friendly summary message
          if (errorList.length === 1) {
            errorMessage = errorList[0];
          } else if (errorList.length > 1) {
            errorMessage = "Some items in your cart are currently unavailable";
          }
        } else if (errorData.details.message) {
          errorMessage = errorData.details.message;
        } else if (Array.isArray(errorData.details) && errorData.details.length > 0) {
          // If details is an array directly, use the first error message
          errorMessage = errorData.details[0].message || errorData.details[0] || errorMessage;
        }
      }
      
      return {
        success: false,
        valid: false,
        error: errorMessage,
        errorList: errorList, // Array of specific error messages
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

