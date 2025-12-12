/**
 * Utility function to clear ALL cached and saved data from localStorage and sessionStorage
 * This should be called on logout to ensure no user data persists
 */

import { clearSessionId } from "@/services/sessionService";
import { logger } from "@/utils/devLogger";

/**
 * Clear all cached and saved data from browser storage (localStorage/sessionStorage)
 * NOTE: User data cookies are handled by userDataService and cleared server-side via logout API
 * This includes:
 * - Cart data
 * - Saved cards
 * - Checkout addresses
 * - Quiz/form data
 * - Session ID
 * - Any other non-cookie cached data
 */
export const clearAllCache = () => {
  if (typeof window === "undefined") return;

  try {
    logger.log("🧹 Clearing all cached and saved data...");

    // Clear session ID
    clearSessionId();

    // Clear standard user data
    const standardKeys = [
      "userProfileData",
      "cartData",
      "savedCards",
      "userDetails",
      "rocky-local-cart",
      "checkout_billing_address",
      "checkout_shipping_address",
    ];

    standardKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        logger.log(`  ✓ Cleared: ${key}`);
      } catch (error) {
        logger.warn(`  ✗ Failed to clear ${key}:`, error);
      }
    });

    // Clear quiz/form data (these use storageKey + storageExpiryKey pattern)
    const quizFormKeys = [
      "ed-quiz-form-data",
      "ed-quiz-form-data-expiry",
      "hair-quiz-form-data",
      "hair-quiz-form-data-expiry",
      "wl-quiz-form-data",
      "wl-quiz-form-data-expiry",
      "mh-quiz-form-data",
      "mh-quiz-form-data-expiry",
      "smoking-quiz-form-data",
      "smoking-quiz-form-data-expiry",
      "quiz-form-data-acne",
      "quiz-form-data-acne-expiry",
      "quiz-form-data-anti-aging",
      "quiz-form-data-anti-aging-expiry",
      "quiz-form-data-hyperpigmentation",
      "quiz-form-data-hyperpigmentation-expiry",
    ];

    quizFormKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        logger.log(`  ✓ Cleared: ${key}`);
      } catch (error) {
        logger.warn(`  ✗ Failed to clear ${key}:`, error);
      }
    });

    // Clear any other localStorage items that might contain user data
    // We'll iterate through all localStorage keys and remove any that look like user data
    try {
      const allKeys = Object.keys(localStorage);
      const userDataPatterns = [
        /user/i,
        /profile/i,
        /cart/i,
        /checkout/i,
        /quiz/i,
        /form-data/i,
        /address/i,
        /saved/i,
      ];

      allKeys.forEach((key) => {
        // Only remove keys that match user data patterns
        const isUserData = userDataPatterns.some((pattern) => pattern.test(key));
        
        // But exclude keys that should persist (like theme, preferences, etc.)
        const excludePatterns = [/theme/i, /preference/i, /settings/i, /analytics/i];
        const shouldExclude = excludePatterns.some((pattern) => pattern.test(key));

        if (isUserData && !shouldExclude) {
          try {
            localStorage.removeItem(key);
            logger.log(`  ✓ Cleared user data key: ${key}`);
          } catch (error) {
            logger.warn(`  ✗ Failed to clear ${key}:`, error);
          }
        }
      });
    } catch (error) {
      logger.warn("Error clearing additional localStorage keys:", error);
    }

    // Clear sessionStorage as well (though we mainly use localStorage)
    try {
      sessionStorage.clear();
      logger.log("  ✓ Cleared all sessionStorage");
    } catch (error) {
      logger.warn("  ✗ Failed to clear sessionStorage:", error);
    }

    // Clear Stripe cookies (set by Stripe.js SDK)
    // These are client-side cookies used for fraud detection and session tracking
    try {
      const stripeCookies = ["_stripe_mid", "_stripe_sid"];
      stripeCookies.forEach((cookieName) => {
        // Clear for current domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        // Also try clearing for domain variations to ensure complete removal
        const hostname = window.location.hostname;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        // Try with leading dot for subdomain matching
        if (hostname !== "localhost") {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
        }
        logger.log(`  ✓ Cleared Stripe cookie: ${cookieName}`);
      });
    } catch (error) {
      logger.warn("  ✗ Failed to clear Stripe cookies:", error);
    }

    logger.log("✅ All cached and saved data cleared successfully");
  } catch (error) {
    logger.error("❌ Error clearing cache:", error);
  }
};

export default clearAllCache;

