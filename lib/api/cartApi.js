/**
 * Cart API
 * Fetches cart data from the new backend API
 */

const API_BASE_URL = "https://rocky-be-production.up.railway.app";

/**
 * Fetch cart from the new backend API
 * @param {string} authToken - Bearer token for authenticated users (optional)
 * @param {string} sessionId - Session ID for guest users (optional)
 * @returns {Promise<Object|null>} Cart data or null if not found
 */
export async function fetchCartFromBackend(authToken = null, sessionId = null) {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/cart`);
    
    // IMPORTANT: Only add sessionId if user is NOT authenticated
    // If both authToken and sessionId are provided, prioritize authToken (authenticated user)
    const useSessionId = !authToken && sessionId; // Only use sessionId if no authToken
    
    if (useSessionId) {
      url.searchParams.append("sessionId", sessionId);
    }

    const headers = {
      accept: "application/json",
      "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
      "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
    };

    // Add authorization header ONLY if user is authenticated
    // Do NOT send both Authorization and sessionId
    if (authToken) {
      headers["Authorization"] = authToken;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      next: { revalidate: 0 }, // Don't cache cart data
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Empty cart is valid, return empty cart structure
        return {
          items: [],
          total_items: 0,
          total_price: "0.00",
          needs_shipping: false,
          coupons: [],
          shipping_rates: [],
        };
      }
      throw new Error(`Failed to fetch cart: ${response.status}`);
    }

    const cartData = await response.json();
    return cartData;
  } catch (error) {
    console.error("[Cart API] Error fetching cart:", error);
    return null;
  }
}

export default {
  fetchCartFromBackend,
};

