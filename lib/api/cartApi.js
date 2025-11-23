/**
 * Cart API
 * Fetches cart data from the new backend API
 */

const API_BASE_URL = process.env.ROCKY_BE_BASE_URL;

/**
 * Fetch cart from the new backend API
 * @param {string} authToken - Bearer token for authenticated users (optional)
 * @param {string} sessionId - Session ID for guest users (optional)
 * @returns {Promise<Object|null>} Cart data or null if not found
 */
export async function fetchCartFromBackend(authToken = null, sessionId = null) {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/cart`);

    // Add sessionId as query parameter if provided (for guest users)
    if (sessionId) {
      url.searchParams.append("sessionId", sessionId);
    }

    const headers = {
      accept: "application/json",
      "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
      "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
    };

    // Add authorization header if token is provided (for authenticated users)
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
