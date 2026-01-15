import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import { getAuthTokenFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/checkout
 * Creates an order from the cart using the new backend API
 * Based on the checkout integration guide
 */
export async function POST(req) {
  const startTime = Date.now();
  const timings = {};

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
    const {
      // Address data
      firstName,
      lastName,
      addressOne,
      addressTwo,
      city,
      state,
      postcode,
      country,
      phone,
      email,
      shipToAnotherAddress,
      shippingFirstName,
      shippingLastName,
      shippingAddressOne,
      shippingAddressTwo,
      shippingCity,
      shippingState,
      shippingPostCode,
      shippingCountry,
      shippingPhone,
      // Optional fields
      customerNotes,
      discreet,
      toMailBox,
      // Payment method (for saved cards - will be handled separately)
      paymentMethodId,
      // Cart ID (optional - if provided from frontend, use it; otherwise backend uses authenticated user's cart)
      cartId: cartIdFromRequest,
    } = requestData;

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // OPTIMIZATION: Use cartId from request if provided, otherwise skip cart fetch
    // The backend API can use the authenticated user's cart without needing cartId
    // If cartId is provided from frontend (already fetched on checkout page), use it
    const cartId =
      cartIdFromRequest && typeof cartIdFromRequest === "string"
        ? cartIdFromRequest
        : null; // Let backend use authenticated user's cart if not provided
    logger.log(
      cartId
        ? `Using cartId from request: ${cartId}`
        : "Skipping cart fetch - backend will use authenticated user's cart"
    );

    // OPTIMIZATION: Make cart validation non-blocking (fire-and-forget)
    // Cart validation runs in parallel and won't block checkout flow
    // If validation fails, backend will catch it during order creation
    // Only validate if we have a valid string cartId
    const validationStartTime = Date.now();
    if (cartId && typeof cartId === "string") {
      logger.log("Validating cart (non-blocking)...");
      axios
        .post(
          `${BASE_URL}/api/v1/cart/validate`,
          { cartId }, // Only send cartId if it's a valid string
          {
            headers: {
              Authorization: authToken.value,
              "Content-Type": "application/json",
              accept: "application/json",
              "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
              "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
              Origin: origin,
            },
            timeout: 5000, // 5 seconds timeout (shorter since non-blocking)
          }
        )
        .then(() => {
          timings.cartValidation = Date.now() - validationStartTime;
          logger.log(
            `✅ Cart validation passed in ${timings.cartValidation}ms (non-blocking)`
          );
        })
        .catch((validationError) => {
          timings.cartValidation = Date.now() - validationStartTime;
          logger.warn(
            `⚠️ Cart validation failed in ${timings.cartValidation}ms (non-blocking, continuing):`,
            validationError.response?.data
          );
        });
    } else {
      logger.log(
        "Skipping cart validation (no valid cartId provided, backend will validate during order creation)"
      );
    }

    // Step 1: Build address objects in the new API format (runs in parallel with validation)
    const shippingAddress = {
      type: "SHIPPING",
      firstName: shipToAnotherAddress
        ? shippingFirstName || firstName
        : firstName,
      lastName: shipToAnotherAddress ? shippingLastName || lastName : lastName,
      addressLine1: shipToAnotherAddress
        ? shippingAddressOne || addressOne
        : addressOne,
      addressLine2: shipToAnotherAddress
        ? shippingAddressTwo || addressTwo || ""
        : addressTwo || "",
      city: shipToAnotherAddress ? shippingCity || city : city,
      state: shipToAnotherAddress ? shippingState || state : state,
      postalCode: shipToAnotherAddress
        ? shippingPostCode || postcode
        : postcode,
      country: shipToAnotherAddress
        ? shippingCountry || country
        : country || "CA",
      phone: shipToAnotherAddress ? shippingPhone || phone : phone,
      isDefault: true,
    };

    const billingAddress = {
      type: "BILLING",
      firstName,
      lastName,
      addressLine1: addressOne,
      addressLine2: addressTwo || "",
      city,
      state,
      postalCode: postcode,
      country: country || "CA",
      phone,
      isDefault: true,
    };

    // Step 2: Build checkout request body
    const checkoutRequestBody = {
      shippingAddress,
      billingAddress,
    };

    // Add cartId only if it's a valid string (backend can use authenticated user's cart if not provided)
    if (cartId && typeof cartId === "string") {
      checkoutRequestBody.cartId = cartId;
    }

    // Add payment method ID if provided (for saved cards)
    if (paymentMethodId) {
      checkoutRequestBody.paymentMethodId = paymentMethodId;
    }

    // Add metadata for tracking
    checkoutRequestBody.metaData = [
      { key: "_meta_discreet", value: discreet ? "1" : "0" },
      { key: "_meta_mail_box", value: toMailBox ? "1" : "0" },
      { key: "_is_created_from_rocky_fe", value: "true" },
    ];

    // Add customer notes to metadata if provided
    if (customerNotes && customerNotes.trim()) {
      checkoutRequestBody.metaData.push({
        key: "customerNotes",
        value: customerNotes.trim(),
      });
    }

    logger.log("Creating order with checkout request:", {
      cartId: cartId || "using authenticated user's cart",
      hasShippingAddress: !!shippingAddress,
      hasBillingAddress: !!billingAddress,
    });

    // Step 3: Create order via POST /api/v1/orders
    // Set a longer timeout (90 seconds) to handle slow backend responses
    // The backend may take time to process payment, send emails, etc.
    const orderStartTime = Date.now();
    logger.log("⏳ Creating order (this may take time)...");
    const orderResponse = await axios.post(
      `${BASE_URL}/api/v1/orders`,
      checkoutRequestBody,
      {
        headers: {
          Authorization: authToken.value,
          "Content-Type": "application/json",
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          Origin: origin,
        },
        timeout: 90000, // 90 seconds timeout
      }
    );
    timings.orderCreation = Date.now() - orderStartTime;
    logger.log(`✅ Order created successfully in ${timings.orderCreation}ms`);

    const { order, payment } = orderResponse.data;

    logger.log("Order created successfully:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      hasPaymentIntent: !!payment?.clientSecret,
    });

    // Log total timing and breakdown
    timings.total = Date.now() - startTime;
    logger.log("📊 Checkout Performance Breakdown:", {
      total: `${timings.total}ms (${(timings.total / 1000).toFixed(2)}s)`,
      cartFetch: "SKIPPED (optimized)",
      cartValidation: timings.cartValidation
        ? `${timings.cartValidation}ms (non-blocking)`
        : "non-blocking (may still be running)",
      orderCreation: `${timings.orderCreation}ms`,
      other: `${
        timings.total - (timings.cartValidation || 0) - timings.orderCreation
      }ms`,
    });

    // Step 4: Return order and payment intent
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
      },
      payment: payment
        ? {
            clientSecret: payment.clientSecret,
            paymentIntentId: payment.paymentIntentId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
          }
        : null,
      timings, // Include performance timing in response for debugging
    });
  } catch (error) {
    timings.total = Date.now() - startTime;

    // Handle timeout errors specifically
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      logger.error("Checkout timeout error:", {
        message: error.message,
        code: error.code,
        timeout: error.config?.timeout,
        timings,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Request timeout - The order may have been created but the server took too long to respond. Please check your order history or contact support.",
          timeout: true,
          timings, // Include timing info to identify which step timed out
        },
        { status: 408 }
      );
    }

    logger.error("Checkout error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code,
      timings,
    });

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to create order. Please try again.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.response?.data || null,
        timings, // Include timing info in error response
      },
      { status: error.response?.status || 500 }
    );
  }
}
