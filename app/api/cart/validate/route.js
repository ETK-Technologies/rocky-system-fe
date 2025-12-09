import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";

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
    const authToken = cookieStore.get("authToken");

    // Get sessionId from query parameters (for guest users)
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    // Validate: Either authToken or sessionId must be provided
    if (!authToken && !sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either authentication token or sessionId is required",
        },
        { status: 400 }
      );
    }

    try {
      // Build URL - only add sessionId if user is NOT authenticated
      // If both authToken and sessionId are provided, prioritize authToken (authenticated user)
      let url = `${BASE_URL}/api/v1/cart/validate`;
      const useSessionId = !authToken && sessionId; // Only use sessionId if no authToken

      if (useSessionId) {
        const encodedSessionId = encodeURIComponent(sessionId);
        url += `?sessionId=${encodedSessionId}`;
      }

      // Get client domain for X-Client-Domain header (required for backend domain whitelist)
      const clientDomain = getClientDomain(req);

      // Prepare headers
      const headers = {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
      };

      // Add Authorization header ONLY if user is authenticated
      // Do NOT send both Authorization and sessionId
      if (authToken) {
        headers["Authorization"] = authToken.value;
      }

      logger.log("Validating cart with new API:", {
        url,
        hasAuth: !!authToken,
        hasSessionId: useSessionId,
        method: "POST",
      });

      // Call the validation endpoint
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
