/**
 * Product API
 * Fetches product data from the new backend API
 */

import axios from "axios";

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
    // Build URL with query parameters
    const url = `${API_BASE_URL}/api/v1/products/slug/${slug}`;
    const params = {};
    
    // Only add includeMeta parameter if it's true
    if (includeMeta) {
      params.includeMeta = "true";
    }

    // Get client domain for X-Client-Domain header (required for backend domain whitelist)
    const clientDomain = getClientDomainFromRequest(requestOrHeaders);

    // Use axios instead of fetch to avoid 103 Early Hints issues
    // Axios automatically handles 103 Early Hints and waits for the final response (200)
    const response = await axios.get(url, {
      params,
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
      },
    });

    return response.data;
  } catch (error) {
    // Handle 404 specifically
    if (error.response?.status === 404) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Product API] Product not found: ${slug}`);
      }
      return null;
    }
    
    // Log other errors
    if (error.response) {
      console.error(`[Product API] ${error.response.status} error response:`, error.response.data);
    } else {
      console.error("[Product API] Error fetching product:", error.message);
    }
    
    return null;
  }
}

export default {
  fetchProductBySlugFromBackend,
};
