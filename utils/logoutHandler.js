"use client";

import { clearAllCache } from "@/utils/clearAllCache";
import { logger } from "@/utils/devLogger";
import { toast } from "react-toastify";

/**
 * Client-side logout handler
 * Calls the logout API and handles cleanup with smooth navigation
 * @param {Object} router - Next.js router instance
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const handleLogout = async (router) => {
  try {
    logger.log("Starting logout process...");

    // Call the logout API
    const response = await fetch("/api/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logger.log("Logout API call successful");

      // Clear ALL cached and saved data (comprehensive cleanup)
      clearAllCache();

      // Clear Stripe cookies (set by Stripe.js SDK)
      // These are client-side cookies, so we need to clear them via document.cookie
      try {
        const stripeCookies = ["_stripe_mid", "_stripe_sid"];
        stripeCookies.forEach((cookieName) => {
          // Clear for current domain
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          // Also try clearing for .localhost and current domain variations
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        });
        logger.log("Stripe cookies cleared");
      } catch (error) {
        logger.warn("Error clearing Stripe cookies:", error);
      }

      // Dispatch multiple events to ensure all components update
      // 1. Cart updated event (for cart components)
      const cartUpdatedEvent = new CustomEvent("cart-updated");
      document.dispatchEvent(cartUpdatedEvent);

      // 2. User logged out event (for auth-dependent components)
      const userLoggedOutEvent = new CustomEvent("user-logged-out");
      document.dispatchEvent(userLoggedOutEvent);

      // 3. Trigger cart refresher to force immediate UI update
      const refresher = document.getElementById("cart-refresher");
      if (refresher) {
        refresher.setAttribute("data-refreshed", Date.now().toString());
        refresher.click();
      }

      logger.log("All client-side data cleared and events dispatched");

      // Show success message
      toast.success("You have been logged out successfully");

      // Note: Backend logout API already invalidates the token for both Store Frontend and Patient Portal
      // No need to redirect to Patient Portal - user stays on Store Frontend
      // Patient Portal will be logged out automatically when user tries to access it (token is invalidated)
      
      // Use Next.js router for smooth navigation to home
      if (router) {
        // Small delay to show toast and allow UI updates
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 500);
      } else {
        // Fallback if router is not provided
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      }

      return { success: true };
    } else {
      logger.error("Logout API error:", data.error);
      toast.error(data.error || "Logout failed. Please try again.");
      return { success: false, error: data.error || "Logout failed" };
    }
  } catch (error) {
    logger.error("Logout exception:", error);

    // Even on error, try to clear ALL local data
    clearAllCache();

    // Dispatch events even on error to update UI
    document.dispatchEvent(new CustomEvent("cart-updated"));
    document.dispatchEvent(new CustomEvent("user-logged-out"));

    toast.error("An error occurred during logout. Please try again.");
    return { success: false, error: "An error occurred during logout" };
  }
};
