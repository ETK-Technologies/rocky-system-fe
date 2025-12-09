/**
 * Cart API
 * Fetches cart data from the new backend API
 */

const API_BASE_URL = process.env.BASE_URL;

/**
 * Fetch cart from the new backend API
 * @param {string} authToken - Bearer token for authenticated users (optional)
 * @param {string} sessionId - Session ID for guest users (optional)
 * @param {string} clientDomain - Client domain for X-Client-Domain header (optional)
 * @returns {Promise<Object|null>} Cart data or null if not found
 */
export async function fetchCartFromBackend(authToken = null, sessionId = null, clientDomain = null) {
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
      "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
      "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
    };

    // Add X-Client-Domain header if provided (required for backend domain whitelist)
    if (clientDomain) {
      headers["X-Client-Domain"] = clientDomain;
    }

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
      const errorText = await response.text();
      console.error("[Cart API] Backend error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url.toString(),
        hasClientDomain: !!clientDomain,
      });

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
      throw new Error(`Failed to fetch cart: ${response.status} - ${errorText}`);
    }

    const cartData = await response.json();
    console.log("[Cart API] Cart fetched successfully:", {
      itemCount: cartData.items?.length || 0,
      totalItems: cartData.total_items || 0,
    });
    return cartData;
  } catch (error) {
    console.error("[Cart API] Error fetching cart:", error);
    return null;
  }
}

export default {
  fetchCartFromBackend,
};
