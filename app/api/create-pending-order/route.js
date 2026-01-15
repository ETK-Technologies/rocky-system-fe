import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";

/**
 * @deprecated This endpoint uses WordPress/WooCommerce APIs.
 * Use /api/checkout instead, which uses the new backend API and handles order creation with payment intent.
 *
 * This endpoint is kept for backward compatibility but should not be used for new implementations.
 */
export async function POST(req) {
  logger.warn(
    "⚠️ DEPRECATED: /api/create-pending-order endpoint called. Use /api/checkout instead."
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "This endpoint is deprecated. Please use /api/checkout instead.",
      message:
        "The checkout endpoint has been migrated to use the new backend API. Please update your frontend code to use /api/checkout.",
    },
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
}

// OLD IMPLEMENTATION - KEPT FOR REFERENCE ONLY
/*
import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import {
  transformPaymentError,
  logPaymentError,
} from "@/utils/paymentErrorHandler";
import {
  validateCheckoutData,
  formatValidationErrors,
} from "@/utils/checkoutValidation";

const BASE_URL = process.env.BASE_URL;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;

export async function POST_OLD(req) {
  try {
    const requestData = await req.json();

    const {
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
      discreet,
      toMailBox,
      customerNotes,
      cardNumber,
      cardType,
      cardExpMonth,
      cardExpYear,
      cardCVD,
      savedCardToken,
      savedCardId,
      useSavedCard,
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
      totalAmount,
      awin_awc,
      awin_channel,
    } = requestData;

    // Validate checkout data before processing
    // For Stripe payments, skip card validation (pass dummy values)
    const validationResult = validateCheckoutData({
      billing_address: {
        first_name: firstName,
        last_name: lastName,
        address_1: addressOne,
        address_2: addressTwo,
        city,
        state,
        postcode,
        country,
        email,
        phone,
      },
      shipping_address: {
        ship_to_different_address: shipToAnotherAddress,
        first_name: shippingFirstName,
        last_name: shippingLastName,
        address_1: shippingAddressOne,
        address_2: shippingAddressTwo,
        city: shippingCity,
        state: shippingState,
        postcode: shippingPostCode,
        country: shippingCountry,
        phone: shippingPhone,
      },
      // Skip card validation for pending orders (Stripe handles it)
      cardNumber: "dummy",
      cardExpMonth: "12",
      cardExpYear: "30",
      cardCVD: "123",
      useSavedCard: false,
    });

    if (!validationResult.isValid) {
      logger.log("Order creation validation failed:", validationResult.errors);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.errors,
          message: formatValidationErrors(validationResult.errors),
        },
        { status: 500 }
      );
    }

    logger.log("Order creation data validation passed");

    const cookieStore = await cookies();
    // Dynamic import since this file has old commented code above
    const userDataService = await import("@/services/userDataService");
    const encodedCredentials = userDataService.getAuthTokenFromCookies(cookieStore);
    const cartNonce = userDataService.getCookieValue(cookieStore, "cart-nonce");
    const userId = userDataService.getUserIdFromCookies(cookieStore);

    logger.log("Authentication check:", {
      hasAuthToken: !!encodedCredentials,
      hasUserId: !!userId,
      userIdValue: userId?.value,
    });

    if (!encodedCredentials || !userId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Validate cart before creating pending order (stock, pricing, etc.)
    try {
      const { searchParams } = new URL(req.url);
      const sessionId = searchParams.get("sessionId");
      
      const BASE_URL = process.env.BASE_URL;
      let validateUrl = `${BASE_URL}/api/v1/cart/validate`;
      const useSessionId = !encodedCredentials && sessionId;
      
      if (useSessionId) {
        validateUrl += `?sessionId=${encodeURIComponent(sessionId)}`;
      }

      const validateHeaders = {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      };

      if (encodedCredentials) {
        validateHeaders["Authorization"] = encodedCredentials.value;
      }

      logger.log("Validating cart before creating pending order...");
      const cartValidationResponse = await axios.post(
        validateUrl,
        {},
        { headers: validateHeaders }
      );

      logger.log("Cart validation passed:", cartValidationResponse.status);
    } catch (cartValidationError) {
      logger.error("Cart validation failed:", cartValidationError.response?.data || cartValidationError.message);
      
      const validationError = cartValidationError.response?.data || {};
      const errorMessage = validationError.message || validationError.error || "Cart validation failed. Please check your cart and try again.";

      return NextResponse.json(
        {
          error: "Cart validation failed",
          message: errorMessage,
          details: validationError.details || validationError,
        },
        { status: cartValidationError.response?.status || 400 }
      );
    }

    // Get cart items and coupons to build order line items
    let cartItems = [];
    let appliedCoupons = [];
    try {
      const cartResponse = await axios.get(
        `${BASE_URL}/wp-json/wc/store/cart`,
        {
          headers: {
            Authorization: encodedCredentials.value,
            Nonce: cartNonce?.value || "",
          },
        }
      );
      cartItems = cartResponse.data.items || [];
      appliedCoupons = cartResponse.data.coupons || [];
      logger.log("Cart data retrieved:", {
        itemsCount: cartItems.length,
        couponsCount: appliedCoupons.length,
        coupons: appliedCoupons.map((c) => c.code),
      });
    } catch (cartError) {
      logger.error("Failed to fetch cart items:", cartError);
      return NextResponse.json(
        { error: "Failed to fetch cart items" },
        { status: 500 }
      );
    }

    // Build line items from cart with subscription metadata
    const lineItems = cartItems.map((item) => {
      const lineItem = {
        product_id: item.id,
        quantity: item.quantity,
        price: item.prices?.price ? parseFloat(item.prices.price) / 100 : 0,
      };

      // Check if this is a one-time purchase by looking at the variation attributes
      const isOneTimePurchase = item.variation?.some(
        (attr) =>
          attr.attribute === "Subscription Type" &&
          attr.value.toLowerCase().includes("one-time")
      );

      // Add subscription metadata only if this is NOT a one-time purchase
      if (item.extensions?.subscriptions && !isOneTimePurchase) {
        const subscriptionData = item.extensions.subscriptions;
        lineItem.meta_data = [
          {
            key: "_subscription_period",
            value: subscriptionData.billing_period || "month",
          },
          {
            key: "_subscription_period_interval",
            value: subscriptionData.billing_interval || "1",
          },
        ];

        // Add additional subscription metadata if available
        if (subscriptionData.subscription_length) {
          lineItem.meta_data.push({
            key: "_subscription_length",
            value: subscriptionData.subscription_length,
          });
        }
        if (subscriptionData.trial_length) {
          lineItem.meta_data.push({
            key: "_subscription_trial_length",
            value: subscriptionData.trial_length,
          });
        }
        if (subscriptionData.trial_period) {
          lineItem.meta_data.push({
            key: "_subscription_trial_period",
            value: subscriptionData.trial_period,
          });
        }
        if (subscriptionData.sign_up_fees) {
          lineItem.meta_data.push({
            key: "_subscription_sign_up_fee",
            value: subscriptionData.sign_up_fees,
          });
        }

        logger.log(`Added subscription metadata for product ${item.name}:`, {
          period: subscriptionData.billing_period,
          interval: subscriptionData.billing_interval,
        });
      } else if (isOneTimePurchase) {
        logger.log(
          `Skipping subscription metadata for one-time purchase product: ${item.name}`
        );
      }

      return lineItem;
    });

    // Determine AWIN values with server-side fallback
    const awcCookie = cookieStore.get("awc")?.value || "";
    const resolvedAwinAwc = (awin_awc || "").trim() || awcCookie;
    const resolvedAwinChannel = (awin_channel || "").trim() || "other";

    // Build order data for WooCommerce REST API v3
    const orderData = {
      status: "pending", // Create order without payment processing
      customer_id: parseInt(userId.value), // Set the authenticated user's ID
      billing: {
        first_name: firstName,
        last_name: lastName,
        address_1: addressOne,
        address_2: addressTwo || "",
        city,
        state,
        postcode,
        country: country || "CA",
        email,
        phone,
      },
      shipping: {
        first_name: shipToAnotherAddress ? shippingFirstName : firstName,
        last_name: shipToAnotherAddress ? shippingLastName : lastName,
        address_1: shipToAnotherAddress ? shippingAddressOne : addressOne,
        address_2: shipToAnotherAddress ? shippingAddressTwo : addressTwo || "",
        city: shipToAnotherAddress ? shippingCity : city,
        state: shipToAnotherAddress ? shippingState : state,
        postcode: shipToAnotherAddress ? shippingPostCode : postcode,
        country: shipToAnotherAddress ? shippingCountry : country || "CA",
        phone: shipToAnotherAddress ? shippingPhone : phone,
      },
      line_items: lineItems,
      ...(appliedCoupons.length > 0 && {
        coupon_lines: appliedCoupons.map((coupon) => ({
          code: coupon.code,
          discount: coupon.discount || "0",
          discount_tax: coupon.discount_tax || "0",
        })),
      }),
      meta_data: [
        { key: "_meta_discreet", value: discreet ? "1" : "0" },
        { key: "_meta_mail_box", value: toMailBox ? "1" : "0" },
        { key: "_awin_awc", value: resolvedAwinAwc || "" },
        { key: "_awin_channel", value: resolvedAwinChannel },
        { key: "_is_created_from_rocky_fe", value: "true" },
      ],
    };

    // Add customer note if provided
    if (customerNotes && customerNotes.trim()) {
      orderData.customer_note = customerNotes.trim();
    }

    // Add payment method info for saved cards (for reference, not processing)
    if (useSavedCard && savedCardToken) {
      orderData.meta_data.push(
        { key: "_saved_card_token", value: savedCardToken },
        { key: "_saved_card_id", value: savedCardId || "1" },
        { key: "_payment_method", value: "bambora_credit_card" }
      );
    }

    logger.log("Creating order with data:", JSON.stringify(orderData, null, 2));
    logger.log(
      "Order will be associated with customer_id:",
      orderData.customer_id
    );
    logger.log("Applied coupons:", orderData.coupon_lines);

    // Create order using WooCommerce REST API v3
    const response = await axios.post(
      `${BASE_URL}/wp-json/wc/v3/orders`,
      orderData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${CONSUMER_KEY}:${CONSUMER_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    logger.log("Order created successfully:", {
      order_id: response.data.id,
      order_key: response.data.order_key,
      status: response.data.status,
    });

    // Create subscriptions using WooCommerce Subscriptions REST API
    // This is the official approach for creating subscriptions programmatically
    try {
      logger.log(
        "Creating subscriptions using WooCommerce Subscriptions REST API..."
      );

      const order = response.data;

      // Group line items by subscription schedule (period + interval)
      // Only include items that have subscription metadata (excludes one-time purchases)
      const subscriptionGroups = new Map();

      for (const lineItem of order.line_items) {
        if (lineItem.meta_data) {
          const periodMeta = lineItem.meta_data.find(
            (meta) => meta.key === "_subscription_period"
          );
          const intervalMeta = lineItem.meta_data.find(
            (meta) => meta.key === "_subscription_period_interval"
          );

          if (periodMeta && intervalMeta) {
            const scheduleKey = `${periodMeta.value}_${intervalMeta.value}`;

            if (!subscriptionGroups.has(scheduleKey)) {
              subscriptionGroups.set(scheduleKey, {
                billing_period: periodMeta.value,
                billing_interval: parseInt(intervalMeta.value),
                line_items: [],
                meta_data: lineItem.meta_data.filter((meta) =>
                  meta.key.startsWith("_subscription_")
                ),
              });
            }

            // Build complete line item with all product details for subscription
            const subscriptionLineItem = {
              product_id: lineItem.product_id,
              quantity: lineItem.quantity,
            };

            // Add variation_id if present (critical for variable products like different pill counts)
            if (lineItem.variation_id) {
              subscriptionLineItem.variation_id = lineItem.variation_id;
            }

            // Add product name for proper display in subscription details
            if (lineItem.name) {
              subscriptionLineItem.name = lineItem.name;
            }

            // Add SKU if available
            if (lineItem.sku) {
              subscriptionLineItem.sku = lineItem.sku;
            }

            // Add price information to ensure correct subscription pricing
            if (lineItem.price !== undefined && lineItem.price !== null) {
              subscriptionLineItem.price = lineItem.price;
            }

            // Include subtotal and total if available
            if (lineItem.subtotal !== undefined) {
              subscriptionLineItem.subtotal = lineItem.subtotal;
            }
            if (lineItem.total !== undefined) {
              subscriptionLineItem.total = lineItem.total;
            }

            subscriptionGroups
              .get(scheduleKey)
              .line_items.push(subscriptionLineItem);

            logger.log(
              `Product ${lineItem.product_id} (${
                lineItem.name || "N/A"
              }) added to subscription group: ${scheduleKey}`,
              {
                variation_id: subscriptionLineItem.variation_id || "none",
                quantity: subscriptionLineItem.quantity,
                price: subscriptionLineItem.price,
              }
            );
          } else {
            logger.log(
              `Product ${lineItem.product_id} (${lineItem.name}) skipped - no subscription metadata (likely one-time purchase)`
            );
          }
        }
      }

      if (subscriptionGroups.size === 0) {
        logger.log(
          "No subscription items found in order. Skipping subscription creation."
        );
        return NextResponse.json({
          success: true,
          data: {
            id: response.data.id,
            order_id: response.data.id,
            order_key: response.data.order_key,
            status: response.data.status,
            payment_deferred: true,
            message:
              "Order created successfully (one-time purchase). Payment will be processed separately.",
          },
        });
      }

      // Create a subscription for each distinct subscription schedule
      const subscriptionPromises = Array.from(subscriptionGroups.entries()).map(
        async ([scheduleKey, subscriptionData]) => {
          const subscriptionPayload = {
            parent_id: order.id,
            customer_id: order.customer_id,
            status: "pending", // Leave pending until payment is captured
            billing_period: subscriptionData.billing_period,
            billing_interval: subscriptionData.billing_interval,
            line_items: subscriptionData.line_items,
            billing: order.billing,
            shipping: order.shipping,
            meta_data: subscriptionData.meta_data,
          };

          logger.log(
            `Creating subscription for schedule ${scheduleKey}:`,
            subscriptionPayload
          );

          const subscriptionResponse = await axios.post(
            `${BASE_URL}/wp-json/wc/v3/subscriptions`,
            subscriptionPayload,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(
                  `${CONSUMER_KEY}:${CONSUMER_SECRET}`
                ).toString("base64")}`,
              },
            }
          );

          return subscriptionResponse.data;
        }
      );

      const createdSubscriptions = await Promise.all(subscriptionPromises);

      logger.log(
        `Successfully created ${createdSubscriptions.length} subscriptions for order:`,
        order.id,
        createdSubscriptions.map((sub) => sub.id)
      );
    } catch (subscriptionError) {
      logger.error(
        "Error creating subscriptions via REST API:",
        subscriptionError.response?.data || subscriptionError.message
      );
      // Don't fail the order creation if subscription creation fails - log it for manual review
    }

    // Return the response in a consistent format
    return NextResponse.json({
      success: true,
      data: {
        id: response.data.id,
        order_id: response.data.id, // For compatibility
        order_key: response.data.order_key,
        status: response.data.status,
        total: response.data.total, // Add total for Stripe payment
        currency: response.data.currency || getCurrency(),
        payment_deferred: true,
        message:
          "Order created successfully. Payment will be processed separately.",
      },
    });
  } catch (error) {
    logger.error(
      "Error creating order:",
      error.response?.data || error.message
    );

    // Transform technical errors into user-friendly messages
    const originalError =
      error.response?.data?.message ||
      error.message ||
      "Failed to create order.";
    const userFriendlyMessage = transformPaymentError(
      originalError,
      error.response?.data
    );

    // Log the original error for debugging
    logPaymentError("create-order-only", error, userFriendlyMessage);

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        details: error.response?.data || null,
      },
      { status: error.response?.status || 500 }
    );
  }
}
*/
