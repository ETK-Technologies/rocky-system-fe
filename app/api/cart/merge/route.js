import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getClientDomain } from "@/lib/utils/getClientDomain";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/cart/merge
 * Merge guest cart into user cart using the new backend API
 * Manually merge a guest cart (identified by sessionId) into the authenticated user's cart
 * Supports both authenticated users and guest users
 * API Endpoint: POST /api/v1/cart/merge
 */
export async function POST(req) {
  try {
    const { sessionId } = await req.json();

    // Validate required fields
    if (!sessionId || !sessionId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "SessionId is required",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

    // Validate: User must be authenticated to merge cart
    if (!authToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required to merge cart",
        },
        { status: 401 }
      );
    }

    try {
      // Get client domain for X-Client-Domain header (required for backend domain whitelist)
      const clientDomain = getClientDomain(req);

      // Prepare headers
      const headers = {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
        Authorization: authToken.value,
      };

      logger.log("Merging guest cart into user cart:", {
        sessionId,
        hasAuth: !!authToken,
        method: "POST",
      });

      // Call the merge endpoint
      const response = await axios.post(
        `${BASE_URL}/api/v1/cart/merge`,
        { sessionId: sessionId.trim() },
        { headers }
      );

      logger.log("Cart merged successfully:", {
        merged: response.data?.merged,
        cartId: response.data?.id,
      });

      return NextResponse.json({
        success: true,
        message: "Cart merged successfully",
        cart: response.data,
        merged: response.data?.merged || true,
      });
    } catch (error) {
      const errorData = error.response?.data || error.message;
      const errorMessage =
        typeof errorData === "object" && errorData?.message
          ? errorData.message
          : typeof errorData === "string"
          ? errorData
          : "Cart merge failed";

      logger.error("Error merging cart:", {
        error: errorMessage,
        rawError: errorData,
        status: error.response?.status,
      });

      // Handle specific error responses from the API
      if (error.response?.status === 400) {
        return NextResponse.json(
          {
            success: false,
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
            error: "Authentication required",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: error.response?.data,
        },
        { status: error.response?.status || 500 }
      );
    }
  } catch (error) {
    logger.error("Error in cart merge route:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to merge cart. Please try again.",
      },
      { status: 500 }
    );
  }
}
