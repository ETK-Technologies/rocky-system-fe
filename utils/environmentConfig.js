/**
 * Environment configuration for build-time app credentials.
 * Each build must provide NEXT_PUBLIC_APP_KEY and NEXT_PUBLIC_APP_SECRET.
 */

const isProduction = process.env.NODE_ENV === "production";

function missingVarsMessage(appKey, appSecret) {
  const missing = [];
  if (!appKey) missing.push("NEXT_PUBLIC_APP_KEY");
  if (!appSecret) missing.push("NEXT_PUBLIC_APP_SECRET");
  return `[environmentConfig] Missing required env vars: ${missing.join(", ")}`;
}

/**
 * Returns the baked environment config for this build.
 * Throws in non-production when required variables are missing.
 */
export function getEnvironmentConfig() {
  const appKey = process.env.NEXT_PUBLIC_APP_KEY;
  const appSecret = process.env.NEXT_PUBLIC_APP_SECRET;
  const envName =
    process.env.NEXT_PUBLIC_ENV_NAME ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "unknown";

  if (!appKey || !appSecret) {
    const message = missingVarsMessage(appKey, appSecret);
    if (!isProduction) {
      throw new Error(message);
    }
    console.error(message);
  }

  return {
    envName,
    appKey,
    appSecret,
  };
}

/**
 * Convenience accessor to fetch headers for backend auth.
 */
export function getAppAuthHeaders() {
  const { appKey, appSecret } = getEnvironmentConfig();

  return {
    "X-App-Key": appKey,
    "X-App-Secret": appSecret,
  };
}














