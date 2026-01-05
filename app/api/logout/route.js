import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import {
  clearUserDataFromCookies,
  getUserDataFromCookies,
} from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/logout
 * Logout user using the new auth API
 */
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const userData = getUserDataFromCookies(cookieStore);

    // Call the new logout API if we have an auth token
    if (userData?.auth?.accessToken) {
      try {
        // Extract Bearer token if present
        const authToken = userData.auth.accessToken;
        const token = authToken.startsWith("Bearer ")
          ? authToken.substring(7)
          : authToken;

        logger.log("Logging out user with new auth API");

        // Get origin for Origin header (required for backend domain whitelist)
        const origin = getOrigin(req);

        await axios.post(
          `${BASE_URL}/api/v1/auth/logout`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
              "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
              "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
              Origin: origin,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        logger.log("User logged out successfully from backend API");

        // Also call Patient Portal logout endpoint to ensure both apps are logged out
        const patientPortalUrl = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL;
        if (patientPortalUrl) {
          try {
            logger.log("Calling Patient Portal logout endpoint...", {
              url: `${patientPortalUrl}/api/logout`,
              hasToken: !!token,
            });

            // Use the same headers as backend call for consistency
            await axios.post(
              `${patientPortalUrl}/api/logout`,
              {},
              {
                headers: {
                  "Content-Type": "application/json",
                  accept: "application/json",
                  "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
                  "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
                  Origin: origin,
                  Authorization: `Bearer ${token}`,
                },
                // Set a timeout to avoid hanging if Patient Portal is unreachable
                timeout: 5000,
                // Don't follow redirects
                maxRedirects: 0,
                // Validate status - accept 2xx and 3xx
                validateStatus: (status) => status >= 200 && status < 400,
              }
            );
            logger.log("Patient Portal logged out successfully");
          } catch (ppError) {
            // Log detailed error for debugging
            logger.error("Error calling Patient Portal logout:", {
              message: ppError.message,
              code: ppError.code,
              status: ppError.response?.status,
              statusText: ppError.response?.statusText,
              data: ppError.response?.data,
              url: ppError.config?.url,
            });
            // Don't fail the logout - Patient Portal logout is best effort
            // The backend token is already invalidated, so Patient Portal will require re-login on next request
          }
        } else {
          logger.warn(
            "NEXT_PUBLIC_PATIENT_PORTAL_URL not configured, skipping Patient Portal logout"
          );
        }
      } catch (error) {
        // Log error but continue with local cleanup
        logger.error(
          "Error calling logout API (continuing with local cleanup):",
          error.response?.data || error.message
        );
      }
    }

    // Clear all user-related cookies using unified service
    clearUserDataFromCookies(cookieStore);

    // Set a flag in cookies to trigger client-side cache clearing
    // This will clear localStorage items like sessionId
    cookieStore.set("clearCache", "true", {
      maxAge: 10, // Short lifespan, just enough for the client to detect it
      path: "/",
    });

    logger.log("All cookies cleared and cache clear flag set");

    // Return JSON response for client-side handling
    return NextResponse.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Error in logout route:", error.message);

    // Even if there's an error, try to clear cookies
    try {
      const cookieStore = await cookies();
      clearUserDataFromCookies(cookieStore);
    } catch (clearError) {
      logger.error("Error clearing cookies:", clearError);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Logout failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
