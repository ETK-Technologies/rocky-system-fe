import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";

const BASE_URL = process.env.ROCKY_BE_BASE_URL;

/**
 * POST /api/patient-portal-logout
 * Patient portal logout - calls new auth API and clears cookies without redirect
 */
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken")?.value;

    // Call the new logout API if we have an auth token
    if (authToken) {
      try {
        // Extract Bearer token if present
        const token = authToken.startsWith("Bearer ")
          ? authToken.substring(7)
          : authToken;

        logger.log("Logging out user from patient portal with new auth API");

        await axios.post(
          `${BASE_URL}/api/v1/auth/logout`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        logger.log("User logged out successfully from patient portal API");
      } catch (error) {
        // Log error but continue with local cleanup
        logger.error(
          "Error calling logout API (continuing with local cleanup):",
          error.response?.data || error.message
        );
      }
    }

    // Clear all authentication-related cookies
    cookieStore.delete("authToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("userId");
    cookieStore.delete("userEmail");
    cookieStore.delete("userName");
    cookieStore.delete("displayName");
    cookieStore.delete("lastName");
    cookieStore.delete("userAvatar");
    cookieStore.delete("stripeCustomerId");
    cookieStore.delete("province");
    cookieStore.delete("phone");
    cookieStore.delete("DOB");
    cookieStore.delete("pn");
    cookieStore.delete("dob");

    // Set a flag in cookies to trigger client-side cache clearing
    cookieStore.set("clearCache", "true", {
      maxAge: 10, // Short lifespan, just enough for the client to detect it
      path: "/",
    });

    logger.log("All cookies cleared and cache clear flag set for patient portal");

    // Return success without redirect
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Error during patient portal logout:",
      error.response?.data || error.message
    );

    // Even if there's an error, try to clear cookies
    try {
      const cookieStore = await cookies();
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userId");
      cookieStore.delete("userEmail");
      cookieStore.delete("userName");
      cookieStore.delete("displayName");
    } catch (clearError) {
      logger.error("Error clearing cookies:", clearError);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Logout failed. Please try again.",
      },
      { status: error.response?.status || 500 }
    );
  }
}
