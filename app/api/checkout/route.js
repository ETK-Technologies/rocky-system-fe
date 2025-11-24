import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import Stripe from "stripe";
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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req) {
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
      totalAmount, // Ensure it's passed from the frontend
      awin_awc,
      awin_channel,
      useStripe = false, // Flag to use Stripe instead of Bambora
    } = requestData;

    // ========================================
    // DEBUG: Log payment method selection
    // ========================================
    logger.log("=== BACKEND PAYMENT METHOD DEBUG ===");
    logger.log("useSavedCard:", useSavedCard);
    logger.log("useStripe:", useStripe);
    logger.log("savedCardToken:", savedCardToken ? "EXISTS" : "NULL");
    logger.log("cardNumber:", cardNumber ? "EXISTS" : "NULL");
    logger.log("===================================");

    // Validate checkout data before processing
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
      cardNumber,
      cardExpMonth,
      cardExpYear,
      cardCVD,
      useSavedCard,
    });

    if (!validationResult.isValid) {
      logger.log("Checkout validation failed:", validationResult.errors);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.errors,
          message: formatValidationErrors(validationResult.errors),
        },
        { status: 500 }
      );
    }

    logger.log("Checkout data validation passed");

    const cookieStore = await cookies();
    const encodedCredentials = cookieStore.get("authToken");
    const cartNonce = cookieStore.get("cart-nonce");

    if (!encodedCredentials) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Validate cart before processing checkout (stock, pricing, etc.)
    try {
      const { searchParams } = new URL(req.url);
      const sessionId = searchParams.get("sessionId");
      
      const ROCKY_BE_BASE_URL = process.env.ROCKY_BE_BASE_URL;
      let validateUrl = `${ROCKY_BE_BASE_URL}/api/v1/cart/validate`;
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

      logger.log("Validating cart before checkout...");
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

    let token = "";
    let stripePaymentMethodId = "";
    let cardNumberLastFourNumbers = "";

    // Process payment token/method based on payment processor
    if (!useSavedCard && cardNumber) {
      cardNumberLastFourNumbers = cardNumber.slice(-4);

      if (!useStripe) {
        // ========================================
        // EXISTING: Use Bambora tokenization
        // ========================================
        try {
          token = await generateToken({
            cvd: cardCVD,
            expiry_month: cardExpMonth,
            expiry_year: cardExpYear,
            number: cardNumber,
          });
        } catch (error) {
          return NextResponse.json(
            { error: "Failed to process card. Check your details." },
            { status: 500 }
          );
        }
      }
    }

    // Determine AWIN values with server-side fallback
    const awcCookie = cookieStore.get("awc")?.value || "";
    const resolvedAwinAwc = (requestData.awin_awc || "").trim() || awcCookie;
    const resolvedAwinChannel =
      (requestData.awin_channel || "").trim() ||
      (resolvedAwinAwc ? "aw" : "other");

    // Prepare WooCommerce Store API checkout payload
    const checkoutData = {
      billing_address: {
        first_name: firstName,
        last_name: lastName,
        company: "",
        address_1: addressOne,
        address_2: addressTwo || "",
        city,
        state,
        postcode,
        country,
        email,
        phone,
      },
      shipping_address: shipToAnotherAddress
        ? {
            first_name: shippingFirstName || firstName,
            last_name: shippingLastName || lastName,
            company: "",
            address_1: shippingAddressOne || addressOne,
            address_2: shippingAddressTwo || addressTwo || "",
            city: shippingCity || city,
            state: shippingState || state,
            postcode: shippingPostCode || postcode,
            country: shippingCountry || country,
            phone: shippingPhone || phone,
          }
        : {
            first_name: firstName,
            last_name: lastName,
            company: "",
            address_1: addressOne,
            address_2: addressTwo || "",
            city,
            state,
            postcode,
            country,
            phone,
          },
      customer_note: customerNotes || "",
      payment_method: useStripe ? "stripe_cc" : "bambora_credit_card", // Use stripe_cc for Stripe Credit Card
      payment_data: [],
      meta_data: [
        {
          key: "_meta_discreet",
          value: discreet ? "1" : "0",
        },
        {
          key: "_meta_mail_box",
          value: toMailBox ? "1" : "0",
        },
        // AWIN tracking metadata from frontend utility
        { key: "_awin_awc", value: resolvedAwinAwc || "" },
        { key: "_awin_channel", value: resolvedAwinChannel },
        { key: "_is_created_from_rocky_fe", value: "true" },
      ],
    };

    // Add appropriate payment data based on payment method
    if (useSavedCard && savedCardToken) {
      // ========================================
      // EXISTING: Saved Card (Bambora)
      // No changes - keep existing flow
      // ========================================
      checkoutData.payment_data.push(
        {
          // The token parameter is for the customer profile code in Bambora
          key: "bambora_credit_card-customer-code",
          value: savedCardToken,
        },
        {
          // The card ID parameter
          key: "bambora_credit_card-card-id",
          value: savedCardId || "1",
        },
        {
          // This enables payment with saved cards
          key: "tokenize",
          value: "true",
        },
        {
          // Specify that we're using an existing saved card
          key: "wc-bambora_credit_card-payment-token",
          value: savedCardToken,
        },
        {
          // This indicates we're not saving a new card
          key: "wc-bambora_credit_card-new-payment-method",
          value: "0",
        }
      );

      // Add CVV if provided
      if (cardCVD) {
        checkoutData.payment_data.push({
          key: "wc-bambora-credit-card-cvv",
          value: cardCVD,
        });
      }
    } else if (useStripe && cardNumber) {
      // ========================================
      // NEW: New Card (Stripe) - Create Source on backend
      // WooCommerce Stripe plugin does NOT accept raw card data
      // We must create a Source first and pass the Source ID
      // ========================================
      logger.log("Creating Stripe Source on backend...");

      try {
        const Stripe = require("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Create Source using Stripe SDK (requires "Raw card data APIs" enabled in Stripe Dashboard)
        const source = await stripe.sources.create({
          type: "card",
          card: {
            number: cardNumber.replace(/\s/g, ""),
            exp_month: parseInt(cardExpMonth),
            exp_year: parseInt(cardExpYear),
            cvc: cardCVD,
          },
          owner: {
            name: `${firstName} ${lastName}`,
            email: email,
            phone: phone,
            address: {
              line1: addressOne,
              line2: addressTwo || undefined,
              city: city,
              state: state,
              postal_code: postcode,
              country: country,
            },
          },
        });

        logger.log("✅ Stripe Source created successfully:", source.id);
        logger.log("Card details:", {
          brand: source.card?.brand,
          last4: source.card?.last4,
        });

        // Pass the Stripe Source ID to WooCommerce Stripe plugin
        checkoutData.payment_data.push(
          {
            key: "stripe_source",
            value: source.id, // src_xxxxx
          },
          {
            key: "wc-stripe-new-payment-method",
            value: true, // Save card for future use
          }
        );

        // Store card details for reference
        cardNumberLastFourNumbers = source.card?.last4 || cardNumber.slice(-4);
      } catch (stripeError) {
        logger.error("❌ Stripe Source creation failed:", stripeError.message);
        logger.error("Error type:", stripeError.type);
        logger.error("Error code:", stripeError.code);

        return NextResponse.json(
          {
            error: "Failed to process card. Please try again.",
            details: stripeError.message,
          },
          { status: 400 }
        );
      }
    } else {
      // ========================================
      // EXISTING: New Card (Bambora)
      // ========================================
      checkoutData.payment_data.push(
        {
          key: "wc-bambora-credit-card-js-token",
          value: token,
        },
        {
          key: "wc-bambora-credit-card-account-number",
          value: cardNumberLastFourNumbers,
        },
        {
          key: "wc-bambora-credit-card-card-type",
          value: cardType,
        },
        {
          key: "wc-bambora-credit-card-exp-month",
          value: cardExpMonth,
        },
        {
          key: "wc-bambora-credit-card-exp-year",
          value: cardExpYear,
        },
        {
          key: "wc-bambora_credit_card-new-payment-method",
          value: "1",
        }
      );
    }

    // Debug the final checkout data with enhanced logging
    logger.log("FINAL checkoutData", JSON.stringify(checkoutData, null, 2));

    // Write to server log file for debugging
    const fs = require("fs");
    const path = require("path");
    const logDir =
      process.env.NODE_ENV === "development"
        ? path.join(process.cwd(), "tmp")
        : "/tmp";

    try {
      // Create tmp directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Write checkout data to log file
      fs.writeFileSync(
        path.join(logDir, `checkout-log-${Date.now()}.json`),
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            checkoutData,
            savedCardUsed: useSavedCard,
            totalAmount,
          },
          null,
          2
        )
      );
    } catch (logError) {
      logger.error("Error writing debug log:", logError);
    }

    // Call the WooCommerce Store API checkout endpoint
    const response = await axios.post(
      `${BASE_URL}/wp-json/wc/store/v1/checkout`,
      checkoutData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: encodedCredentials.value,
          Nonce: cartNonce?.value || "",
        },
      }
    );

    // Return the response in a consistent format
    return NextResponse.json({
      success: true,
      data: {
        id: response.data.id || response.data.order_id,
        order_key: response.data.order_key,
        status: response.data.status,
        payment_result: response.data.payment_result,
      },
    });
  } catch (error) {
    // If checkout failed, try to refresh the cart nonce
    try {
      const cookieStore = await cookies();
      const encodedCredentials = cookieStore.get("authToken");

      if (encodedCredentials?.value) {
        const cartResponse = await axios.get(
          `${BASE_URL}/wp-json/wc/store/cart`,
          {
            headers: { Authorization: encodedCredentials.value },
          }
        );

        const refreshedNonce = cartResponse.headers?.nonce;
        if (refreshedNonce) {
          cookieStore.set("cart-nonce", refreshedNonce);
        }
      }
    } catch (refreshError) {
      logger.error("Error refreshing cart nonce:", refreshError);
    }

    // Transform technical errors into user-friendly messages
    const originalError =
      error.response?.data?.message || error.message || "Failed to checkout.";
    const userFriendlyMessage = transformPaymentError(
      originalError,
      error.response?.data
    );

    // Log the original error for debugging
    logPaymentError("checkout", error, userFriendlyMessage);

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        details: error.response?.data || null,
      },
      { status: error.response?.status || 500 }
    );
  }
}

async function generateToken({ cvd, expiry_month, expiry_year, number }) {
  const res = await axios.post(
    "https://www.beanstream.com/scripts/tokenization/tokens",
    { cvd, expiry_month, expiry_year, number },
    {
      headers: {
        "Content-Type": "application/json",
        Host: "www.beanstream.com",
        Origin: "https://libs.na.bambora.com",
        Referer: "https://libs.na.bambora.com",
      },
    }
  );

  if (!res.data || !res.data.token) {
    throw new Error("No token from Bambora API");
  }

  return res.data.token;
}
