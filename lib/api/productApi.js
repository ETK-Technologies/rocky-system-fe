/**
 * Product API
 * Fetches product data from the new backend API
 */

const API_BASE_URL = process.env.BASE_URL;

/**
 * Get client domain from request headers or environment variables
 * Used for X-Client-Domain header in backend API calls
 */
function getClientDomainFromRequest(requestOrHeaders) {
  let origin = null;
  
  // Handle different input types
  if (requestOrHeaders) {
    // If it's a Request object with headers
    if (requestOrHeaders.headers?.get) {
      origin = requestOrHeaders.headers.get("origin") || requestOrHeaders.headers.get("referer");
    }
    // If it's a Headers object
    else if (requestOrHeaders.get) {
      origin = requestOrHeaders.get("origin") || requestOrHeaders.get("referer");
    }
    // If it's an object with origin/referer properties
    else if (requestOrHeaders.origin || requestOrHeaders.referer) {
      origin = requestOrHeaders.origin || requestOrHeaders.referer;
    }
  }
  
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.hostname;
    } catch (e) {
      // If URL parsing fails, fall back to environment variables
    }
  }

  // Fallback to environment variables
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://myrocky.com";
  
  try {
    const url = new URL(envUrl);
    return url.hostname;
  } catch (e) {
    return envUrl;
  }
}

/**
 * Fetch product by slug from the new backend API
 * @param {string} slug - Product slug
 * @param {boolean} includeMeta - Whether to include metadata (default: false)
 * @param {Request|Headers|Object} requestOrHeaders - Optional request/headers object to extract client domain
 * @returns {Promise<Object|null>} Product data or null if not found
 */
export async function fetchProductBySlugFromBackend(slug, includeMeta = false, requestOrHeaders = null) {
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

    // Get client domain for X-Client-Domain header (required for backend domain whitelist)
    const clientDomain = getClientDomainFromRequest(requestOrHeaders);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
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
