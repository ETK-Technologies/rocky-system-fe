import { NextResponse } from "next/server";
import Stripe from "stripe";
import { logger } from "@/utils/devLogger";
import { getCurrencyLowerCase } from "@/lib/constants/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const requestData = await req.json();

    const {
      orderId,
      paymentMethodId, // From Stripe Elements
      amount, // Amount in cents
      currency = getCurrencyLowerCase(),
      metadata = {},
    } = requestData;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    logger.log("=== STRIPE PAYMENT PROCESSING ===");
    logger.log("Order ID:", orderId);
    logger.log("Payment Method:", paymentMethodId);
    logger.log("Amount:", amount, currency);
    logger.log("===================================");

    // Create PaymentIntent with manual capture
    logger.log("Creating Stripe PaymentIntent...");
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      capture_method: "manual", // Authorization only - manual capture later
      confirm: true, // Confirm immediately
      metadata: {
        order_id: orderId,
        ...metadata,
      },
      return_url: `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/checkout/order-received/${orderId}`,
    });

    logger.log("PaymentIntent created:", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      captureMethod: paymentIntent.capture_method,
    });

    // Check status
    if (
      paymentIntent.status === "requires_capture" ||
      paymentIntent.status === "succeeded"
    ) {
      logger.log("✅ Payment authorized successfully");

      // Get charge ID
      const chargeId =
        paymentIntent.latest_charge ||
        paymentIntent.charges?.data?.[0]?.id ||
        null;

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        chargeId: chargeId,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        message: "Payment authorized successfully",
      });
    }

    // Handle requires_action (3D Secure)
    if (paymentIntent.status === "requires_action") {
      logger.log("⚠️ Payment requires additional action (3D Secure)");
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: "Additional authentication required",
      });
    }

    // Handle failed payment
    if (
      paymentIntent.status === "canceled" ||
      paymentIntent.status === "requires_payment_method"
    ) {
      logger.error(
        "❌ Payment failed:",
        paymentIntent.last_payment_error?.message
      );
      return NextResponse.json(
        {
          success: false,
          error: paymentIntent.last_payment_error?.message || "Payment failed",
        },
        { status: 400 }
      );
    }

    // Handle other statuses
    logger.warn("⚠️ Unexpected payment status:", paymentIntent.status);
    return NextResponse.json(
      {
        success: false,
        status: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`,
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error("❌ Stripe payment processing failed:", error);
    logger.error("Error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
      decline_code: error.decline_code,
    });

    // Transform Stripe errors into user-friendly messages
    let userFriendlyMessage = "Payment failed. Please try again.";
    if (error.type === "StripeCardError") {
      userFriendlyMessage = error.message;
    } else if (error.type === "StripeRateLimitError") {
      userFriendlyMessage = "Too many requests. Please try again later.";
    } else if (error.type === "StripeInvalidRequestError") {
      userFriendlyMessage = error.message;
    } else if (error.type === "StripeAPIError") {
      userFriendlyMessage = "Stripe API error. Please try again later.";
    } else if (error.type === "StripeConnectionError") {
      userFriendlyMessage = "Network error. Please check your connection.";
    } else if (error.type === "StripeAuthenticationError") {
      userFriendlyMessage =
        "Stripe authentication failed. Please check API keys.";
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyMessage,
        details: {
          message: error.message,
          type: error.type,
          code: error.code,
          decline_code: error.decline_code,
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}
