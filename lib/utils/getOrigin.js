/**
 * Get origin from request headers or environment variables
 * Used for Origin header in backend API calls
 * Returns the full origin URL (e.g., "https://myrocky.com")
 */
export function getOrigin(req) {
  // Try to get origin from request headers first
  let origin = req.headers.get("origin") || req.headers.get("referer");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Return the full origin (protocol + hostname + port if present)
      return originUrl.origin;
    } catch (e) {
      // If URL parsing fails, continue to other fallbacks
    }
  }

  // Try to extract origin from request URL (for server-to-server requests)
  if (req.url) {
    try {
      const requestUrl = new URL(req.url);
      return requestUrl.origin;
    } catch (e) {
      // If URL parsing fails, continue to environment variables
    }
  }

  // Fallback to environment variables - extract origin from URL if it's a full URL
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://myrocky.com"; // Default fallback

  try {
    const url = new URL(envUrl);
    return url.origin;
  } catch (e) {
    // If it's already just a domain name, construct origin
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }
}
