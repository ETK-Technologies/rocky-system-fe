/**
 * Product API
 * Fetches product data from the new backend API
 */

const API_BASE_URL = process.env.BASE_URL;

/**
 * Fetch product by slug from the new backend API
 * @param {string} slug - Product slug
 * @param {boolean} includeMeta - Whether to include metadata (default: false)
 * @returns {Promise<Object|null>} Product data or null if not found
 */
export async function fetchProductBySlugFromBackend(slug, includeMeta = false) {
  if (!slug) {
    console.error("No slug provided to fetchProductBySlugFromBackend");
    return null;
  }

  try {
    const url = new URL(`${API_BASE_URL}/api/v1/products/slug/${slug}`);
    
    // Only add includeMeta parameter if it's true
    if (includeMeta) {
      url.searchParams.append("includeMeta", "true");
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Product API] Product not found: ${slug}`);
        }
        return null;
      }
      
      // Log the error response body for debugging
      let errorBody;
      try {
        errorBody = await response.text();
        console.error(`[Product API] ${response.status} error response:`, errorBody);
      } catch (e) {
        console.error(`[Product API] Could not read error response body`);
      }
      
      throw new Error(`Failed to fetch product: ${response.status}${errorBody ? ` - ${errorBody}` : ''}`);
    }

    const productData = await response.json();

    return productData;
  } catch (error) {
    console.error("[Product API] Error fetching product:", error);
    return null;
  }
}

export default {
  fetchProductBySlugFromBackend,
};
