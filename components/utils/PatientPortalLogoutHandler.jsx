"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { logger } from "@/utils/devLogger";
import { clearSessionId } from "@/services/sessionService";
import { clearAllCache } from "@/utils/clearAllCache";
import { toast } from "react-toastify";

/**
 * PatientPortalLogoutHandler
 * Detects logout query parameter from patient portal redirects
 * and triggers store frontend logout cleanup
 */
export default function PatientPortalLogoutHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processed, setProcessed] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      setProcessed(true);
      logger.log("Patient portal logout detected, processing...");

      // 1. Call logout API to clear server-side cookies and blacklist tokens
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          logger.log("Logout API call successful");
        } else {
          logger.error("Logout API error:", data.error);
        }
      } catch (error) {
        logger.error("Error calling logout API:", error);
        // Continue with cleanup even if API call fails
      }

      // 2. Clear all localStorage items (comprehensive cleanup)
      try {
        clearAllCache(); // This handles localStorage clearing comprehensively
        logger.log("localStorage cleared");
      } catch (error) {
        logger.error("Error clearing localStorage:", error);
      }

      // 3. Clear all sessionStorage items
      try {
        sessionStorage.clear();
        logger.log("sessionStorage cleared");
      } catch (error) {
        logger.error("Error clearing sessionStorage:", error);
      }

      // 4. Clear sessionId using service
      clearSessionId();

      // 5. Dispatch events to update UI components
      const cartUpdatedEvent = new CustomEvent("cart-updated");
      document.dispatchEvent(cartUpdatedEvent);

      const userLoggedOutEvent = new CustomEvent("user-logged-out");
      document.dispatchEvent(userLoggedOutEvent);

      // 6. Show success message
      toast.success("You have been successfully logged out");

      // 7. Remove query parameters from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("logout");
      url.searchParams.delete("from");
      const cleanUrl = url.pathname + (url.search ? url.search : "");

      // Use replace to avoid adding to history and keep URL clean
      router.replace(cleanUrl);

      logger.log("Patient portal logout completed successfully");
    } catch (error) {
      logger.error("Error during patient portal logout:", error);
      // Still try to clean up URL even on error
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("logout");
        url.searchParams.delete("from");
        router.replace(url.pathname);
      } catch (urlError) {
        logger.error("Error cleaning URL:", urlError);
      }
    }
  }, [router]);

  useEffect(() => {
    // Check for logout parameters
    const logoutParam = searchParams.get("logout");
    const fromParam = searchParams.get("from");
    const isLogout = logoutParam === "true" || fromParam === "patient-portal";

    if (isLogout && !processed) {
      handleLogout();
    }
  }, [searchParams, processed, handleLogout]);

  // This component doesn't render anything
  return null;
}
