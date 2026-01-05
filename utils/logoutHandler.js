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

    logger.log("🔍 Logout API Response:", {
      success: data.success,
      hasPatientPortalUrl: !!data.patientPortalUrl,
      patientPortalUrl: data.patientPortalUrl,
      fullData: data,
    });

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

      // Trigger Patient Portal logout via hidden iframe (SSO-style logout)
      // This ensures Patient Portal cookies are cleared in the user's browser
      // MUST happen BEFORE navigation to ensure it executes
      logger.log("🔍 About to trigger Patient Portal logout...");

      try {
        // Get Patient Portal URL from API response (more reliable than env var)
        const patientPortalUrl =
          data.patientPortalUrl || process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL;

        logger.log("🔍 Inside Patient Portal logout try block");

        logger.log("Patient Portal URL check:", {
          fromAPI: !!data.patientPortalUrl,
          fromEnv: !!process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL,
          url: patientPortalUrl,
          type: typeof patientPortalUrl,
        });

        if (patientPortalUrl) {
          logger.log("Creating Patient Portal logout iframe...");

          // Create hidden iframe with a name (required for form targeting)
          const iframeName = "patient-portal-logout-iframe-" + Date.now();
          const iframe = document.createElement("iframe");
          iframe.name = iframeName;
          iframe.id = iframeName;
          iframe.style.display = "none";
          iframe.width = "0";
          iframe.height = "0";

          // Log when iframe loads
          iframe.onload = () => {
            logger.log("✅ Patient Portal logout iframe loaded");

            // Remove iframe after a short delay
            setTimeout(() => {
              try {
                if (iframe && iframe.parentNode) {
                  iframe.remove();
                  logger.log("Patient Portal logout iframe removed");
                }
              } catch (e) {
                logger.warn("Error removing iframe:", e);
              }
            }, 2000);
          };

          iframe.onerror = (error) => {
            logger.error("❌ Patient Portal logout iframe error:", error);
          };

          // Append iframe to DOM first
          document.body.appendChild(iframe);
          logger.log("Patient Portal logout iframe appended to DOM", {
            iframeName: iframeName,
          });

          // Wait a tiny bit for iframe to be ready, then submit form
          setTimeout(() => {
            try {
              // Create a form that will POST to Patient Portal
              const form = document.createElement("form");
              form.method = "POST";
              form.action = `${patientPortalUrl}/api/logout`;
              form.target = iframeName; // Target the iframe by name
              form.style.display = "none";

              // Append form, submit, then remove
              document.body.appendChild(form);
              logger.log("Form created and appended, submitting...", {
                action: form.action,
                target: form.target,
              });

              form.submit();
              logger.log("✅ Patient Portal logout form submitted (POST)");

              // Remove form after submission
              setTimeout(() => {
                try {
                  if (form.parentNode) {
                    form.remove();
                    logger.log("Form removed");
                  }
                } catch (e) {
                  // Ignore
                }
              }, 100);
            } catch (formError) {
              logger.error("Form POST failed:", formError);
              // Fallback: Use GET request (Patient Portal should support GET for logout)
              logger.warn("Falling back to GET request...");
              iframe.src = `${patientPortalUrl}/api/logout`;
            }
          }, 50); // Small delay to ensure iframe is ready

          logger.log("✅ Patient Portal logout iframe triggered");
        } else {
          logger.warn(
            "⚠️ NEXT_PUBLIC_PATIENT_PORTAL_URL not found - Patient Portal logout skipped"
          );
        }
      } catch (iframeError) {
        logger.error("❌ Error in Patient Portal logout setup:", iframeError);
      }

      // Show success message
      toast.success("You have been logged out successfully");

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
