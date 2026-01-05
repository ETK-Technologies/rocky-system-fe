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

    // Extract auth token for logout calls
    let token = null;
    if (userData?.auth?.accessToken) {
      const authToken = userData.auth.accessToken;
      token = authToken.startsWith("Bearer ")
        ? authToken.substring(7)
        : authToken;
    }

    // Step 1: Call backend logout API (if we have a token)
    if (token) {
      try {
        logger.log("Logging out user with backend API");

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

        logger.log("Backend logout successful");
      } catch (error) {
        // Log error but continue with other logout steps
        logger.error(
          "Backend logout error (continuing with other logout steps):",
          error.response?.data || error.message
        );
      }
    }

    // Note: Patient Portal logout is handled client-side via hidden iframe
    // Server-side calls cannot clear cookies in the user's browser due to browser security restrictions
    // The client-side logout handler (utils/logoutHandler.js) creates a hidden iframe
    // that loads Patient Portal's logout endpoint, allowing Patient Portal to clear its own cookies

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
    // Include Patient Portal URL so client can trigger iframe logout
    const patientPortalUrl = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL;

    return NextResponse.json({
      success: true,
      message: "Logout successful",
      patientPortalUrl: patientPortalUrl || null, // Include URL for client-side iframe logout
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
