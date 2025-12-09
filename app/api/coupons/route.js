import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

// Helper function to decode HTML entities in error messages
const decodeHtmlEntities = (text) => {
  if (typeof text !== "string") return text;
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

/**
 * POST /api/coupons
 * Apply coupon to cart using the new backend API
 * Supports both authenticated users and guest users
 */
export async function POST(req) {
  let couponCode = "";
  try {
    const { code } = await req.json();
    couponCode = code;
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

    // Get sessionId from query parameters (for guest users)
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    // Validate required fields
    if (!code || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Coupon code is required",
        },
        { status: 400 }
      );
    }

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
      // Get origin for Origin header (required for backend domain whitelist)
      const origin = getOrigin(req);

      // Prepare headers
      const headers = {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      };

      // Add Authorization header ONLY if user is authenticated
      // Note: The API docs only mention authorization, but we'll support sessionId for guest users if needed
      if (authToken) {
        headers["Authorization"] = authToken.value;
      }

      logger.log("Applying coupon with new API:", {
        couponCode: code,
        hasAuth: !!authToken,
        hasSessionId: !!sessionId,
        method: "POST",
      });

      // Build URL - add sessionId as query parameter if provided (for guest users)
      let url = `${BASE_URL}/api/v1/cart/coupon`;
      const useSessionId = !authToken && sessionId;

      if (useSessionId) {
        const encodedSessionId = encodeURIComponent(sessionId);
        url += `?sessionId=${encodedSessionId}`;
      }

      const response = await axios.post(
        url,
        { couponCode: code.trim() },
        { headers }
      );

      logger.log("Coupon applied successfully:", response.data);

      // Fetch updated cart to return full cart data
      let cartUrl = `${BASE_URL}/api/v1/cart`;
      if (useSessionId) {
        const encodedSessionId = encodeURIComponent(sessionId);
        cartUrl += `?sessionId=${encodedSessionId}`;
      }

      const cartHeaders = {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      };

      if (authToken) {
        cartHeaders["Authorization"] = authToken.value;
      }

      const cartResponse = await axios.get(cartUrl, { headers: cartHeaders });
      const cartData = cartResponse.data;

      return NextResponse.json(cartData);
    } catch (error) {
      const errorData = error.response?.data || error.message;
      const errorMessage =
        typeof errorData === "object" && errorData?.message
          ? decodeHtmlEntities(errorData.message)
          : typeof errorData === "string"
          ? decodeHtmlEntities(errorData)
          : errorData;

      logger.error("Error applying coupon:", {
        couponCode,
        error: errorMessage,
        rawError: errorData,
      });

      // Handle specific error responses from the API
      if (error.response?.status === 400) {
        return NextResponse.json(
          {
            success: false,
            error: error.response.data?.message || "Invalid or expired coupon",
          },
          { status: 400 }
        );
      }

      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Coupon not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.message || "Failed to apply coupon",
        },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error("Error in apply coupon route:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to apply coupon. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coupons
 * Remove coupon from cart using the new backend API
 * Supports both authenticated users and guest users
 * API Endpoint: DELETE /api/v1/cart/coupon
 */
export async function DELETE(req) {
  try {
    // Note: The API doesn't require a body, but frontend may send { code } for compatibility
    // We'll ignore it since DELETE removes the coupon from the cart directly
    try {
      await req.json(); // Consume body if present, but don't use it
    } catch (e) {
      // Body is optional, continue without it
    }
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
      let url = `${BASE_URL}/api/v1/cart/coupon`;
      const useSessionId = !authToken && sessionId; // Only use sessionId if no authToken

      if (useSessionId) {
        const encodedSessionId = encodeURIComponent(sessionId);
        url += `?sessionId=${encodedSessionId}`;
      }

      // Prepare headers
      const headers = {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      };

      // Add Authorization header ONLY if user is authenticated
      // Do NOT send both Authorization and sessionId
      if (authToken) {
        headers["Authorization"] = authToken.value;
      }

      logger.log("Removing coupon with new API:", {
        url,
        hasAuth: !!authToken,
        hasSessionId: useSessionId,
        method: "DELETE",
      });

      // Use DELETE method as per API documentation
      const response = await axios.delete(url, { headers });

      logger.log("Coupon removed successfully:", response.status);

      // Fetch updated cart to return full cart data
      let cartUrl = `${BASE_URL}/api/v1/cart`;
      if (useSessionId) {
        const encodedSessionId = encodeURIComponent(sessionId);
        cartUrl += `?sessionId=${encodedSessionId}`;
      }

      const cartHeaders = {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      };

      if (authToken) {
        cartHeaders["Authorization"] = authToken.value;
      }

      const cartResponse = await axios.get(cartUrl, { headers: cartHeaders });
      const cartData = cartResponse.data;

      return NextResponse.json(cartData);
    } catch (error) {
      const errorData = error.response?.data || error.message;
      const errorMessage =
        typeof errorData === "object" && errorData?.message
          ? decodeHtmlEntities(errorData.message)
          : typeof errorData === "string"
          ? decodeHtmlEntities(errorData)
          : errorData;

      logger.error("Error removing coupon:", {
        error: errorMessage,
        rawError: errorData,
        status: error.response?.status,
      });

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
            error: "Coupon not found or cart not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.message || "Failed to remove coupon",
        },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error("Error in remove coupon route:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove coupon. Please try again.",
      },
      { status: 500 }
    );
  }
}
