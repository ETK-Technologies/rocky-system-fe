import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/checkout
 * Creates an order from the cart using the new backend API
 * Based on the checkout integration guide
 */
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

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
    } = requestData;

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // Step 1: Get cart ID from the cart API
    // The cart API returns cart data, but we need to check if cart exists
    logger.log("Fetching cart to get cart ID...");
    const cartResponse = await axios.get(`${BASE_URL}/api/v1/cart`, {
      headers: {
        Authorization: authToken.value,
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        Origin: origin,
      },
    });

    const cart = cartResponse.data;

    // Check if cart has items
    if (!cart || !cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    // The backend API may use cart ID or we can omit it and let backend use user's cart
    // According to the guide, we can send cartId or let backend use authenticated user's cart
    const cartId = cart.id || null;

    logger.log("Cart retrieved:", {
      hasItems: cart.items?.length > 0,
      cartId: cartId || "will use authenticated user's cart",
    });

    // Step 2: Validate cart (optional but recommended)
    try {
      logger.log("Validating cart before checkout...");
      await axios.post(
        `${BASE_URL}/api/v1/cart/validate`,
        { cartId },
        {
          headers: {
            Authorization: authToken.value,
            "Content-Type": "application/json",
            accept: "application/json",
            "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
            "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
            Origin: origin,
          },
        }
      );
      logger.log("Cart validation passed");
    } catch (validationError) {
      logger.error("Cart validation failed:", validationError.response?.data);
      return NextResponse.json(
        {
          success: false,
          error: "Cart validation failed",
          message:
            validationError.response?.data?.message ||
            "Cart validation failed. Please check your cart and try again.",
          details: validationError.response?.data,
        },
        { status: validationError.response?.status || 400 }
      );
    }

    // Step 3: Build address objects in the new API format
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

    // Step 4: Build checkout request body
    const checkoutRequestBody = {
      shippingAddress,
      billingAddress,
    };

    // Add cartId only if it exists (backend can use authenticated user's cart if not provided)
    if (cartId) {
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
      cartId,
      hasShippingAddress: !!shippingAddress,
      hasBillingAddress: !!billingAddress,
    });

    // Step 5: Create order via POST /api/v1/orders
    // Set a longer timeout (90 seconds) to handle slow backend responses
    // The backend may take time to process payment, send emails, etc.
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

    const { order, payment } = orderResponse.data;

    logger.log("Order created successfully:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      hasPaymentIntent: !!payment?.clientSecret,
    });

    // Step 6: Return order and payment intent
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
    });
  } catch (error) {
    // Handle timeout errors specifically
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      logger.error("Checkout timeout error:", {
        message: error.message,
        code: error.code,
        timeout: error.config?.timeout,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Request timeout - The order may have been created but the server took too long to respond. Please check your order history or contact support.",
          timeout: true,
        },
        { status: 408 }
      );
    }

    logger.error("Checkout error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code,
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
      },
      { status: error.response?.status || 500 }
    );
  }
}
