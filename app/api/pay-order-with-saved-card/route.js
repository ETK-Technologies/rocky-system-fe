import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import {
  transformPaymentError,
  logPaymentError,
} from "@/utils/paymentErrorHandler";
import { getAuthTokenFromCookies, getUserIdFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;
const API_SECRET_KEY =
  process.env.SAVED_CARD_API_SECRET ||
  "+i/h/yeqsqqlEg9pA/niaDqS4WzRh7YTCFNwOma/rXQ=";

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);

    // Check if user is authenticated
    if (!authToken || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Parse the request body
    const data = await req.json();
    const {
      order_id,
      savedCardToken,
      cardId = 1,
      cvv = "",
      billing_address = null, // Add billing address parameter
    } = data;

    // Validate required fields
    if (!order_id || !savedCardToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: order_id and savedCardToken are required",
        },
        { status: 500 }
      );
    }

    // Validate billing address if provided
    if (billing_address !== null && typeof billing_address !== "object") {
      logger.warn("Invalid billing_address format received:", billing_address);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid billing address format",
        },
        { status: 500 }
      );
    }

    // Prepare the request payload
    const requestPayload = {
      order_id,
      savedCardToken,
      cardId,
      cvv,
    };

    // Only include billing_address if it's a valid object
    if (billing_address && typeof billing_address === "object") {
      requestPayload.billing_address = billing_address;
      logger.log("Including billing address for address verification");
    } else {
      logger.log(
        "No billing address provided, proceeding without address verification"
      );
    }

    // Call the WordPress custom endpoint to process the payment with a saved card
    const response = await axios.post(
      `${BASE_URL}/wp-json/custom/v1/pay-order-with-saved-card`,
      requestPayload,
      {
        headers: {
          Authorization: `${authToken.value}`,
          "x-api-secret": API_SECRET_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Subscriptions are created during order creation (before payment)
    // No need to create subscriptions here - they already exist
    logger.log(
      "Payment processed successfully. Subscriptions were created during order creation."
    );

    // Return the response data
    return NextResponse.json({
      success: true,
      order_id: response.data.order_id,
      order_key: response.data.order_key,
      order_status: response.data.order_status,
      transaction_id: response.data.transaction_id,
      message: "Payment processed successfully",
    });
  } catch (error) {
    logger.error(
      "Error processing payment with saved card:",
      error.response?.data || error.message
    );

    // If payment failed, try to refresh the cart nonce
    try {
      // Re-get cookieStore and authToken to ensure they're available in this scope
      const currentCookieStore = await cookies();
      const currentAuthToken = getAuthTokenFromCookies(currentCookieStore);
      if (!currentAuthToken) {
        logger.error("No authToken available for cart refresh");
        throw new Error("Authentication token not available");
      }

      const cartResponse = await axios.get(
        `${BASE_URL}/wp-json/wc/store/cart`,
        {
          headers: {
            Authorization: currentAuthToken.value,
          },
        }
      );

      // Update the cart nonce if available
      if (cartResponse.headers && cartResponse.headers.nonce) {
        currentCookieStore.set("cart-nonce", cartResponse.headers.nonce);
      }
    } catch (refreshError) {
      logger.error("Error refreshing cart nonce:", refreshError);
    }

    // Transform technical errors into user-friendly messages
    const originalError =
      error.response?.data?.message ||
      error.message ||
      "Payment processing failed.";
    const userFriendlyMessage = transformPaymentError(
      originalError,
      error.response?.data
    );

    // Log the original error for debugging
    logPaymentError("saved-card-payment", error, userFriendlyMessage);

    return NextResponse.json(
      {
        success: false,
        message: userFriendlyMessage,
        error: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
