import { NextResponse } from "next/server";
import Stripe from "stripe";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import axios from "axios";
import { getUserIdFromCookies, getAuthTokenFromCookies, getCookieValue } from "@/services/userDataService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const BASE_URL = process.env.BASE_URL;

export async function POST(req) {
  try {
    const requestData = await req.json();

    const {
      orderId,
      amount, // Amount in cents
      paymentMethodId, // Payment method ID from PaymentElement
      customerEmail,
      customerName,
      billingDetails,
      metadata = {},
    } = requestData;

    // Validation
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid amount is required" },
        { status: 400 }
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, error: "Payment method is required" },
        { status: 400 }
      );
    }

    logger.log("=== CREATING PAYMENT INTENT ===");
    logger.log("Order ID:", orderId);
    logger.log("Amount:", amount, "cents");
    logger.log("Payment Method:", paymentMethodId);
    logger.log("Customer:", customerEmail);
    logger.log("================================");

    // Get or create Stripe customer
    let stripeCustomerId = null;
    try {
      const cookieStore = await cookies();
      const userId = getUserIdFromCookies(cookieStore);
      const authToken = getAuthTokenFromCookies(cookieStore);

      // Check if we have Stripe customer ID in cookies first (fastest path)
      const cachedStripeCustomerId = getCookieValue(cookieStore, "stripeCustomerId");
      if (cachedStripeCustomerId) {
        stripeCustomerId = cachedStripeCustomerId.value;
        logger.log(
          "Using cached Stripe customer ID from cookies:",
          stripeCustomerId
        );
      } else if (userId && authToken) {
        // Cookie not found, fetch from WooCommerce
        logger.log(
          "Fetching WooCommerce customer data for user:",
          userId.value
        );

        // Fetch WooCommerce customer data to check for existing Stripe customer ID
        const customerResponse = await axios.get(
          `${BASE_URL}/wp-json/wc/v3/customers/${userId.value}`,
          {
            headers: {
              Authorization: process.env.ADMIN_TOKEN || authToken.value,
            },
          }
        );

        const customerData = customerResponse.data;
        const metaData = customerData.meta_data || [];

        // Look for existing Stripe customer ID in metadata
        const stripeCustomerMeta = metaData.find(
          (meta) => meta.key === "_stripe_customer_id"
        );

        if (stripeCustomerMeta && stripeCustomerMeta.value) {
          stripeCustomerId = stripeCustomerMeta.value;
          logger.log(
            "Found existing Stripe customer ID in WooCommerce:",
            stripeCustomerId
          );

          // Save to cookies for future requests
          cookieStore.set("stripeCustomerId", stripeCustomerId);
          logger.log("Saved Stripe customer ID to cookies for future use");
        } else {
          // Create new Stripe customer
          logger.log("Creating new Stripe customer...");
          const stripeCustomer = await stripe.customers.create({
            email: customerEmail,
            name: customerName,
            metadata: {
              woocommerce_user_id: userId.value,
            },
          });

          stripeCustomerId = stripeCustomer.id;
          logger.log("Created new Stripe customer:", stripeCustomerId);

          // Save Stripe customer ID to cookies
          cookieStore.set("stripeCustomerId", stripeCustomerId);
          logger.log("Saved new Stripe customer ID to cookies");

          // Save Stripe customer ID to WooCommerce metadata
          try {
            await axios.put(
              `${BASE_URL}/wp-json/wc/v3/customers/${userId.value}`,
              {
                meta_data: [
                  {
                    key: "_stripe_customer_id",
                    value: stripeCustomerId,
                  },
                ],
              },
              {
                headers: {
                  Authorization: process.env.ADMIN_TOKEN || authToken.value,
                  "Content-Type": "application/json",
                },
              }
            );
            logger.log("Saved Stripe customer ID to WooCommerce metadata");
          } catch (metaError) {
            logger.error(
              "Failed to save Stripe customer ID to WooCommerce:",
              metaError.message
            );
            // Continue anyway - customer was created in Stripe
          }
        }
      }
    } catch (customerError) {
      logger.error(
        "Error fetching/creating Stripe customer:",
        customerError.message
      );
      // Continue without customer ID - payment can still succeed
    }

    // Attach payment method to customer if we have a customer ID
    if (stripeCustomerId && paymentMethodId) {
      try {
        logger.log("Attaching payment method to customer...");
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId,
        });
        logger.log("✅ Payment method attached to customer successfully");
      } catch (attachError) {
        // Payment method might already be attached to this or another customer
        if (attachError.code === "resource_already_exists") {
          logger.log("Payment method already attached to a customer");
        } else {
          logger.warn("Failed to attach payment method:", attachError.message);
          // Continue anyway - PaymentIntent creation will still work
        }
      }
    }

    // Create PaymentIntent with manual capture for authorization-only payments
    // This will create an "uncaptured" payment in Stripe dashboard
    const paymentIntentData = {
      amount: Math.round(amount),
      currency: "usd",
      payment_method: paymentMethodId,
      capture_method: "manual", // Authorization only - payment remains uncaptured
      confirm: true, // Confirm immediately to authorize the payment
      description: `Order #${orderId}`,
      receipt_email: customerEmail || undefined,
      return_url: `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/checkout/order-received/${orderId}`,
      metadata: {
        order_id: orderId,
        customer_name: customerName,
        ...metadata,
      },
      // Configure automatic payment methods to not allow redirects
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    };

    // Add customer ID if available
    if (stripeCustomerId) {
      paymentIntentData.customer = stripeCustomerId;
      logger.log(
        "Payment intent will be linked to customer:",
        stripeCustomerId
      );
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    logger.log("✅ PaymentIntent created and confirmed:", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      capture_method: paymentIntent.capture_method,
      captured: paymentIntent.captured,
    });

    // Handle successful authorization (requires_capture)
    if (paymentIntent.status === "requires_capture") {
      const chargeId = paymentIntent.latest_charge || null;

      return NextResponse.json({
        success: true,
        paymentIntent: paymentIntent,
        chargeId: chargeId,
      });
    }

    // Handle payments requiring action (e.g., 3D Secure)
    if (paymentIntent.status === "requires_action") {
      return NextResponse.json({
        success: true,
        paymentIntent: paymentIntent,
        clientSecret: paymentIntent.client_secret,
      });
    }

    // Handle successful payment (if capture_method was automatic)
    if (paymentIntent.status === "succeeded") {
      const chargeId = paymentIntent.latest_charge || null;

      return NextResponse.json({
        success: true,
        paymentIntent: paymentIntent,
        chargeId: chargeId,
      });
    }

    // Handle failed payment
    if (
      paymentIntent.status === "canceled" ||
      paymentIntent.status === "requires_payment_method"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: paymentIntent.last_payment_error?.message || "Payment failed",
          paymentIntent: paymentIntent,
        },
        { status: 400 }
      );
    }

    // Handle other statuses
    return NextResponse.json(
      {
        success: false,
        error: `Unexpected payment status: ${paymentIntent.status}`,
        paymentIntent: paymentIntent,
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error("❌ PaymentIntent creation failed:", error);

    // Handle Stripe-specific errors
    let userFriendlyMessage = "Failed to initialize payment. Please try again.";
    if (error.type === "StripeCardError") {
      userFriendlyMessage = error.message;
    } else if (error.type === "StripeInvalidRequestError") {
      userFriendlyMessage =
        "Invalid payment request. Please check your details and try again.";
    } else if (error.type === "StripeAPIError") {
      userFriendlyMessage =
        "Payment service unavailable. Please try again later.";
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyMessage,
        details: {
          message: error.message,
          type: error.type,
          code: error.code,
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}
