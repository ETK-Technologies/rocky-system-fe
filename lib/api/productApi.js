/**
 * Product API
 * Fetches product data from the new backend API
 */

const API_BASE_URL = process.env.ROCKY_BE_BASE_URL;

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
    url.searchParams.append("includeMeta", includeMeta.toString());

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
      throw new Error(`Failed to fetch product: ${response.status}`);
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
