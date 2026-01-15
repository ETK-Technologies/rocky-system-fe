import { NextResponse } from "next/server";
import Stripe from "stripe";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import axios from "axios";
import { getOrigin } from "@/lib/utils/getOrigin";
import {
  getUserIdFromCookies,
  getAuthTokenFromCookies,
  getCookieValue,
} from "@/services/userDataService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const BASE_URL = process.env.BASE_URL;

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const userId = getUserIdFromCookies(cookieStore);
    const authToken = getAuthTokenFromCookies(cookieStore);

    // Check if user is authenticated
    if (!userId || !authToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
          paymentMethods: [],
        },
        { status: 401 }
      );
    }

    // Get Stripe customer ID
    let stripeCustomerId = null;

    logger.log("=== FETCHING SAVED PAYMENT METHODS ===");
    logger.log("User ID:", userId.value);

    // Check if we have Stripe customer ID in cookies first (fastest path)
    const cachedStripeCustomerId = getCookieValue(cookieStore, "stripeCustomerId");
    if (cachedStripeCustomerId) {
      stripeCustomerId = cachedStripeCustomerId.value;
      logger.log(
        "✅ Using cached Stripe customer ID from cookies:",
        stripeCustomerId
      );
    } else {
      // Cookie not found, fetch from custom backend API
      logger.log(
        "🔍 Cookie not found, fetching user profile from custom backend API"
      );

      try {
        // Get origin for Origin header (required for backend domain whitelist)
        const origin = getOrigin(req);
        const appKey = process.env.NEXT_PUBLIC_APP_KEY;
        const appSecret = process.env.NEXT_PUBLIC_APP_SECRET;

        // Ensure Authorization header has "Bearer " prefix
        const authHeader = authToken.value.startsWith("Bearer ")
          ? authToken.value
          : `Bearer ${authToken.value}`;

        // Fetch user profile from custom backend API
        const profileResponse = await axios.get(
          `${BASE_URL}/api/v1/users/profile`,
          {
            headers: {
              accept: "*/*",
              "X-App-Key": appKey,
              "X-App-Secret": appSecret,
              Authorization: authHeader,
              Origin: origin,
            },
          }
        );

        const profileData = profileResponse.data;

        // Extract Stripe customer ID from profile data
        if (profileData.stripeCustomerId) {
          stripeCustomerId = profileData.stripeCustomerId;
          logger.log(
            "✅ Found Stripe customer ID in user profile:",
            stripeCustomerId
          );

          // Save to cookies for future requests
          cookieStore.set("stripeCustomerId", stripeCustomerId, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
          logger.log("💾 Saved Stripe customer ID to cookies for future use");
        } else {
          logger.warn(
            "⚠️ No Stripe customer ID found in user profile"
          );
          logger.log("Profile data received:", {
            id: profileData.id,
            email: profileData.email,
            hasStripeCustomerId: !!profileData.stripeCustomerId,
          });
        }
      } catch (profileError) {
        logger.error(
          "❌ Error fetching user profile from custom backend:",
          profileError.response?.data || profileError.message
        );
        logger.error("Full error:", profileError);
        // Continue without customer ID - will return empty array
      }
    }

    // If no customer ID found, return empty array
    if (!stripeCustomerId) {
      logger.warn("⚠️ No Stripe customer ID found - returning empty payment methods");
      logger.log("💡 Make sure the Stripe customer ID is set in the user profile via /api/v1/users/profile");
      return NextResponse.json({
        success: true,
        paymentMethods: [],
        debug: {
          message: "No Stripe customer ID found",
          userId: userId.value,
          checkedCookie: !!cachedStripeCustomerId,
        },
      });
    }

    // Fetch saved payment methods from Stripe
    logger.log("🔍 Fetching saved payment methods from Stripe for customer:", stripeCustomerId);
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
      });

      logger.log(
        `✅ Found ${paymentMethods.data.length} saved payment method(s)`
      );

      if (paymentMethods.data.length > 0) {
        logger.log("Payment methods:", paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
        })));
      }

      // Format payment methods for frontend
      const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: {
          brand: pm.card?.brand || "unknown",
          last4: pm.card?.last4 || "",
          exp_month: pm.card?.exp_month || 0,
          exp_year: pm.card?.exp_year || 0,
        },
      }));

      return NextResponse.json({
        success: true,
        paymentMethods: formattedPaymentMethods,
        customerId: stripeCustomerId,
      });
    } catch (stripeError) {
      logger.error("❌ Error fetching payment methods from Stripe:", stripeError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch payment methods from Stripe",
          error: stripeError.message,
          paymentMethods: [],
          customerId: stripeCustomerId,
        },
        { status: 500 }
      );
    }
    } catch (error) {
    logger.error("Error fetching saved payment methods:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch saved payment methods",
        error: error.message,
        paymentMethods: [],
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);

    // Check if user is authenticated
    if (!authToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment method ID is required",
        },
        { status: 400 }
      );
    }

    logger.log("🗑️ Deleting payment method:", paymentMethodId);

    // Detach payment method from customer in Stripe
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      logger.log("✅ Payment method detached successfully:", paymentMethodId);

      return NextResponse.json({
        success: true,
        message: "Payment method removed successfully",
        paymentMethodId: paymentMethodId,
      });
    } catch (stripeError) {
      logger.error("❌ Error detaching payment method from Stripe:", stripeError);
      
      // Handle case where payment method is already detached or doesn't exist
      if (stripeError.code === "resource_missing") {
        logger.log("⚠️ Payment method already detached or doesn't exist");
        return NextResponse.json({
          success: true,
          message: "Payment method already removed",
          paymentMethodId: paymentMethodId,
        });
      }

      throw stripeError;
    }
  } catch (error) {
    logger.error("Error deleting payment method:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete payment method",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
