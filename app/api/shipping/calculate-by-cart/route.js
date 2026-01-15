import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import { getAuthTokenFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/shipping/calculate-by-cart
 * Calculate shipping options when province/state changes in checkout
 * Uses the new backend API endpoint
 */
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const requestData = await req.json();
    const { country, state, postalCode } = requestData;

    // Validate required fields
    if (!country) {
      return NextResponse.json(
        { success: false, error: "Country is required" },
        { status: 400 }
      );
    }

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // Step 1: Get cart ID from the cart API
    logger.log("Fetching cart to get cart ID for shipping calculation...");
    const cartResponse = await axios.get(
      `${BASE_URL}/api/v1/cart`,
      {
        headers: {
          Authorization: authToken.value,
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "Origin": origin,
        },
      }
    );

    const cart = cartResponse.data;
    const cartId = cart.id;

    if (!cartId) {
      return NextResponse.json(
        { success: false, error: "Cart not found" },
        { status: 400 }
      );
    }

    logger.log("Cart ID retrieved for shipping calculation:", cartId);

    // Step 2: Calculate shipping using the new backend API
    const shippingRequestBody = {
      cartId,
      country,
    };

    // Add optional fields if provided
    if (state) {
      shippingRequestBody.state = state;
    }
    if (postalCode) {
      shippingRequestBody.postalCode = postalCode;
    }

    logger.log("Calculating shipping with:", shippingRequestBody);

    const shippingResponse = await axios.post(
      `${BASE_URL}/api/v1/shipping/calculate-by-cart`,
      shippingRequestBody,
      {
        headers: {
          Authorization: authToken.value,
          "Content-Type": "application/json",
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "Origin": origin,
        },
      }
    );

    const shippingOptions = shippingResponse.data;

    logger.log("Shipping options calculated:", {
      optionsCount: shippingOptions.length,
      options: shippingOptions.map((opt) => ({
        methodId: opt.methodId,
        title: opt.title,
        cost: opt.cost,
      })),
    });

    // Return shipping options
    return NextResponse.json({
      success: true,
      shippingOptions,
    });
  } catch (error) {
    logger.error("Shipping calculation error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to calculate shipping. Please try again.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.response?.data || null,
      },
      { status: error.response?.status || 500 }
    );
  }
}



