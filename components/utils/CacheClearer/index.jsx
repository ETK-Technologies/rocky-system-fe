"use client";

import { useEffect } from "react";
import { logger } from "@/utils/devLogger";
import { usePathname } from "next/navigation";
import { clearSessionId, getSessionId } from "@/services/sessionService";
import { clearAllCache } from "@/utils/clearAllCache";
import { isAuthenticated } from "@/services/userDataService";

const CacheClearer = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize sessionId on site entry if user is not authenticated
    // This ensures sessionId exists for guest cart operations
    try {
      // Check authentication status using unified service
      const authenticated = isAuthenticated();

      if (!authenticated) {
        // Auto-generate sessionId if it doesn't exist (getSessionId does this automatically)
        const sessionId = getSessionId();
        if (sessionId) {
          logger.log("SessionId initialized for guest user:", sessionId);
        }
      } else {
        // If user is authenticated, ensure sessionId is cleared (shouldn't exist, but double-check)
        clearSessionId();
      }
    } catch (error) {
      logger.warn("Error initializing sessionId:", error);
    }

    // Function to check for the clearCache cookie and clear localStorage if found
    const checkAndClearCache = () => {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith("clearCache=true")) {
          logger.log("Clearing all cached data due to logout");

          // Clear ALL cached and saved data using comprehensive cleanup function
          clearAllCache();

          // Delete the clearCache cookie itself
          document.cookie = "clearCache=; max-age=0; path=/;";

          break;
        }
      }
    };

    // Run the check when the component mounts and when path changes
    checkAndClearCache();
  }, [pathname]); // Re-run when pathname changes to ensure it works after navigation

  // This component doesn't render anything
  return null;
};

export default CacheClearer;
