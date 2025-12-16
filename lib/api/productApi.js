/**
 * Product API
 * Fetches product data from the new backend API
 */

import axios from "axios";
import { logger } from "@/utils/devLogger";
import { getAppAuthHeaders } from "@/utils/environmentConfig";

const API_BASE_URL = process.env.BASE_URL;

/**
 * Get origin from request headers or environment variables
 * Used for Origin header in backend API calls
 */
function getOriginFromRequest(requestOrHeaders) {
  let origin = null;

  // Handle different input types
  if (requestOrHeaders) {
    // If it's a Request object with headers
    if (requestOrHeaders.headers?.get) {
      origin =
        requestOrHeaders.headers.get("origin") ||
        requestOrHeaders.headers.get("referer") ||
        requestOrHeaders.headers.get("host");
    }
    // If it's a Headers object
    else if (requestOrHeaders.get) {
      origin =
        requestOrHeaders.get("origin") ||
        requestOrHeaders.get("referer") ||
        requestOrHeaders.get("host");
    }
    // If it's an object with origin/referer properties
    else if (requestOrHeaders.origin || requestOrHeaders.referer) {
      origin = requestOrHeaders.origin || requestOrHeaders.referer;
    }
  }

  if (origin) {
    try {
      // If origin is just a hostname (no protocol), add http:// for localhost
      if (origin.includes("localhost") && !origin.startsWith("http")) {
        origin = `http://${origin}`;
      }
      const originUrl = new URL(origin);
      return originUrl.origin; // Return full origin, not just hostname
    } catch (e) {
      // If URL parsing fails, try to construct origin from hostname
      if (origin.includes("localhost")) {
        return `http://${origin}`;
      }
      // If URL parsing fails, fall back to environment variables
    }
  }

  // For local development, prefer localhost
  if (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "development"
  ) {
    return "http://localhost:3000";
  }

  // Fallback to environment variables
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl) {
    try {
      const url = new URL(envUrl);
      return url.origin;
    } catch (e) {
      return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
    }
  }

  // Final fallback - but prefer localhost in dev
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://myrocky.com";
}

/**
 * Fetch product by slug from the new backend API
 * @param {string} slug - Product slug
 * @param {boolean} includeMeta - Whether to include metadata (default: false)
 * @param {Request|Headers|Object} requestOrHeaders - Optional request/headers object to extract origin
 * @returns {Promise<Object|null>} Product data or null if not found
 */
export async function fetchProductBySlugFromBackend(
  slug,
  includeMeta = false,
  requestOrHeaders = null
) {
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

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOriginFromRequest(requestOrHeaders);

    // Use axios instead of fetch to avoid 103 Early Hints issues
    // Configure axios with explicit status validation and timeout
    const response = await axios.get(url, {
      params,
      headers: {
        accept: "application/json",
        ...getAppAuthHeaders(),
        Origin: origin,
      },
      // Explicitly validate status - only accept 2xx responses, reject 103 and others
      validateStatus: function (status) {
        // Only accept 2xx status codes, explicitly reject 103 Early Hints
        const isValid = status >= 200 && status < 300 && status !== 103;
        if (!isValid && process.env.NODE_ENV === "development") {
          console.warn(
            `[Product API] Received unexpected status code: ${status}`
          );
        }
        return isValid;
      },
      // Set timeout to prevent hanging
      timeout: 30000,
      // Disable automatic redirects that might cause issues
      maxRedirects: 5,
      // Ensure we get the actual response, not early hints
      transitional: {
        silentJSONParsing: false,
        forcedJSONParsing: true,
        clarifyTimeoutError: true,
      },
    });

    // Double-check we got a valid response with 2xx status
    if (
      !response ||
      response.status < 200 ||
      response.status >= 300 ||
      response.status === 103
    ) {
      throw new Error(
        `Invalid response status: ${response?.status || "unknown"}`
      );
    }

    if (!response.data) {
      throw new Error("Empty response data from backend API");
    }

    return response.data;
  } catch (error) {
    // Handle 404 specifically
    if (error.response?.status === 404) {
      logger.error(`[Product API] Product not found: ${slug}`);
      return null;
    }

    // Log other errors with more details
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      logger.error(
        `[Product API] ${status} error response for slug "${slug}":`,
        {
          status,
          data: errorData,
          origin: getOriginFromRequest(requestOrHeaders),
          url,
        }
      );

      // For 401 errors, log additional debugging info
      if (status === 401) {
        logger.error(
          `[Product API] 401 Unauthorized - Origin header: ${getOriginFromRequest(
            requestOrHeaders
          )}`
        );
      }
    } else if (error.request) {
      logger.error(
        `[Product API] No response received for slug "${slug}":`,
        error.message
      );
    } else {
      logger.error(
        `[Product API] Error fetching product "${slug}":`,
        error.message
      );
    }

    return null;
  }
}

export default {
  fetchProductBySlugFromBackend,
};
