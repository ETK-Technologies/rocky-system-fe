import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/utils/getOrigin";
import { getAuthTokenFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/cart/validate
 * Validate cart for checkout using the new backend API
 * Checks stock availability, pricing, etc.
 * Supports both authenticated users and guest users
 * API Endpoint: POST /api/v1/cart/validate
 */
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);

    // Backend only supports authenticated users for cart validation
    // Skip validation for guest users (non-authenticated)
    if (!authToken) {
      logger.log("Cart validation skipped for guest user (backend requires authentication)");
      // Return success response for guest users - validation will happen at checkout
      return NextResponse.json({
        success: true,
        valid: true,
        message: "Validation skipped for guest user - will validate at checkout",
        skipped: true,
      });
    }

    // Build URL - backend expects empty body for authenticated users
    const url = `${BASE_URL}/api/v1/cart/validate`;

    try {
      // Get origin for Origin header (required for backend domain whitelist)
      const origin = getOrigin(req);

      // Prepare headers - match backend expectations
      const headers = {
        accept: "*/*", // Backend expects "accept: */*" not "application/json"
        "Content-Type": "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      };

      // Add Authorization header ONLY if user is authenticated (backend expects "Bearer <token>")
      if (authToken) {
        headers["Authorization"] = authToken.value; // Already includes "Bearer " prefix
      }

      // Backend expects empty body for authenticated users
      // For guest users, also try empty body (sessionId is in query string)
      const requestPayload = {};

      logger.log("Validating cart with new API:", {
        url,
        hasAuth: !!authToken,
        method: "POST",
        headers: {
          accept: headers.accept,
          Authorization: headers.Authorization ? "Present" : "None",
          "X-App-Key": headers["X-App-Key"] ? "Present" : "None",
        },
      });

      // Call validation endpoint - empty body as backend expects (only for authenticated users)
      const response = await axios.post(url, {}, { headers });

      logger.log("Cart validation successful:", response.status);

      return NextResponse.json({
        success: true,
        valid: true,
        message: response.data?.message || "Cart is valid for checkout",
        data: response.data,
      });
    } catch (error) {
      const errorData = error.response?.data || error.message;
      const errorMessage =
        typeof errorData === "object" && errorData?.message
          ? errorData.message
          : typeof errorData === "string"
          ? errorData
          : "Cart validation failed";

      logger.error("Error validating cart:", {
        error: errorMessage,
        rawError: errorData,
        status: error.response?.status,
        url,
      });

      // Handle specific error responses from the API
      if (error.response?.status === 400) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            error: errorMessage,
            details: error.response.data?.details || error.response.data,
          },
          { status: 400 }
        );
      }

      if (error.response?.status === 401) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            error: "Authentication required",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: errorMessage,
          details: error.response?.data,
        },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error("Error in cart validate route:", error.message);

    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: "Failed to validate cart. Please try again.",
      },
      { status: 500 }
    );
  }
}
