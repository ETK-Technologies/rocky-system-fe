/**
 * Get client domain from request headers or environment variables
 * Used for X-Client-Domain header in backend API calls
 * Returns only the domain name (hostname) without protocol or port
 */
export function getClientDomain(req) {
  const origin = req.headers.get("origin") || req.headers.get("referer");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Return only the hostname (domain) without protocol or port
      return originUrl.hostname;
    } catch (e) {
      // If URL parsing fails, fall back to environment variables
    }
  }

  // Fallback to environment variables - extract domain from URL if it's a full URL
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://myrocky.com";

  try {
    const url = new URL(envUrl);
    return url.hostname;
  } catch (e) {
    // If it's already just a domain name, return as-is
    return envUrl;
  }
}
