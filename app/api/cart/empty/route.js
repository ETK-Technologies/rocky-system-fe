import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getClientDomain } from "@/lib/utils/getClientDomain";

const BASE_URL = process.env.BASE_URL;

/**
 * DELETE /api/cart/empty
 * Empty cart using the new backend API
 * Supports both authenticated users and guest users
 */
export async function DELETE(req) {
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
      let url = `${BASE_URL}/api/v1/cart`;
      const useSessionId = !authToken && sessionId; // Only use sessionId if no authToken

      if (useSessionId) {
        url += `?sessionId=${encodeURIComponent(sessionId)}`;
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

      logger.log("Emptying cart with new API:", {
        url,
        hasAuth: !!authToken,
        hasSessionId: useSessionId,
        method: "DELETE",
      });

      const response = await axios.delete(url, {
        headers,
      });

      logger.log("Cart emptied successfully:", response.data);

      return NextResponse.json({
        success: true,
        message: response.data?.message || "Cart cleared successfully",
      });
    } catch (error) {
      logger.error(
        "Error emptying cart with new API:",
        error.response?.data || error.message
      );

      // Handle specific error responses from the API
      if (error.response?.status === 400) {
        return NextResponse.json(
          {
            success: false,
            error:
              error.response.data?.message ||
              "Either authentication token or sessionId is required",
          },
          { status: 400 }
        );
      }

      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Cart not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.message || "Failed to empty cart",
        },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error("Error in empty cart route:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to empty cart. Please try again.",
      },
      { status: 500 }
    );
  }
}

// Keep POST method for backward compatibility, but it will use DELETE internally
export async function POST(req) {
  // Forward to DELETE handler
  return DELETE(req);
}
