import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import {
  setCookieValue,
  getCookieValue,
  getAuthTokenFromCookies,
  getUserIdFromCookies,
} from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

export async function POST(req) {
  try {
    const { id_token } = await req.json();

    if (!id_token) {
      return NextResponse.json(
        { error: "Missing Google ID token" },
        { status: 400 }
      );
    }

    // Send the Google ID token to WordPress backend for verification
    // Request with_session to get WordPress cookies and session token
    const response = await axios.post(
      `${BASE_URL}/wp-json/custom/v1/google-login`,
      {
        id_token,
        with_session: 1, // Request session cookies and token
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );

    logger.log("Google login response:", response.data);

    // Extract JWT token and session token from response
    const jwtToken = response.data.token;
    const sessionToken = response.data.session_token;

    if (!jwtToken) {
      return NextResponse.json(
        {
          error: "No authentication token received",
        },
        { status: 401 }
      );
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "No session token received from backend",
        },
        { status: 500 }
      );
    }

    // Extract user ID from the token (same as regular login)
    const tokenParts = jwtToken.split(".");
    const payload = JSON.parse(atob(tokenParts[1]));
    const userId = payload.data.user.id.toString();

    // Get user display name and email from response
    const userEmail = response.data.user_email;
    const userDisplayName =
      response.data.user_display_name || userEmail.split("@")[0];

    // Extract user details from response (backend provides display name)
    try {
      const firstName = userDisplayName.split(" ")[0] || "";
      const lastName = userDisplayName.split(" ").slice(1).join(" ") || "";
      const fullName = userDisplayName || `${firstName} ${lastName}`.trim();

      // Set cookies for the authenticated user
      const cookieStore = await cookies();

      // For Google login, create Basic auth credentials using email:session_token
      // This matches the regular login approach (username:password)
      // The session_token is validated by WordPress via the authenticate filter
      const encodedCredentials = btoa(`${userEmail}:${sessionToken}`);
      setCookieValue(cookieStore, "authToken", `Basic ${encodedCredentials}`);

      setCookieValue(cookieStore, "userId", userId);
      setCookieValue(cookieStore, "userName", fullName);
      setCookieValue(cookieStore, "userEmail", userEmail);
      setCookieValue(
        cookieStore,
        "displayName",
        firstName || userDisplayName.split(" ")[0]
      );
      setCookieValue(cookieStore, "googleAuth", "true");

      // Verify the cookies were set correctly (same as regular login)
      const storedUserId = getUserIdFromCookies(cookieStore);
      if (!storedUserId || storedUserId.value !== userId) {
        logger.error("Failed to store userId in cookies");
        return NextResponse.json(
          {
            error: "Failed to store user session. Please try again.",
          },
          { status: 500 }
        );
      }

      // Fetch additional user profile data (phone, province, dob) - same as regular login
      try {
        const authToken = getAuthTokenFromCookies(cookieStore);
        if (authToken) {
          const wpResponse = await axios.get(
            `${BASE_URL}/wp-json/custom/v1/user-profile`,
            {
              headers: {
                Authorization: authToken.value,
              },
            }
          );

          const phone = wpResponse.data.custom_meta?.phone_number;
          const province = wpResponse.data.custom_meta?.province;
          const dob = wpResponse.data.custom_meta?.date_of_birth;

          setCookieValue(cookieStore, "pn", phone || "");
          setCookieValue(cookieStore, "province", province || "");
          setCookieValue(cookieStore, "dob", dob || "");

          logger.log("Google login: User profile data fetched successfully");

          // Fetch Stripe customer ID from WooCommerce and save to cookies
          try {
            const customerResponse = await axios.get(
              `${BASE_URL}/wp-json/wc/v3/customers/${userId}`,
              {
                headers: {
                  Authorization: process.env.ADMIN_TOKEN || authToken.value,
                },
              }
            );

            const metaData = customerResponse.data.meta_data || [];
            const stripeCustomerMeta = metaData.find(
              (meta) => meta.key === "_stripe_customer_id"
            );

            if (stripeCustomerMeta && stripeCustomerMeta.value) {
              setCookieValue(cookieStore, "stripeCustomerId", stripeCustomerMeta.value);
              logger.log(
                "Stripe customer ID saved to cookies:",
                stripeCustomerMeta.value
              );
            }
          } catch (customerError) {
            logger.error(
              "Failed to fetch Stripe customer ID:",
              customerError.message
            );
            // Continue login even if we can't fetch customer ID
          }
        }
      } catch (profileError) {
        logger.log(
          "Could not fetch extended profile for Google user:",
          profileError.message
        );
        // Don't fail the login if profile fetch fails
      }

      return NextResponse.json({
        success: true,
        userId: userId,
        userDisplayName: firstName || userDisplayName,
      });
    } catch (profileError) {
      logger.error("Error setting up user session:", profileError.message);

      // Still set basic cookies even if something fails
      const cookieStore = await cookies();

      // For Google login, create Basic auth credentials using email:session_token
      const encodedCredentials = btoa(`${userEmail}:${sessionToken}`);
      setCookieValue(cookieStore, "authToken", `Basic ${encodedCredentials}`);

      setCookieValue(cookieStore, "userId", userId);
      setCookieValue(cookieStore, "userEmail", userEmail);
      setCookieValue(cookieStore, "displayName", userDisplayName);
      setCookieValue(cookieStore, "googleAuth", "true");

      // Try to fetch additional user profile data even in fallback
      try {
        const authToken = getAuthTokenFromCookies(cookieStore);
        if (authToken) {
          const wpResponse = await axios.get(
            `${BASE_URL}/wp-json/custom/v1/user-profile`,
            {
              headers: {
                Authorization: authToken.value,
              },
            }
          );

          const phone = wpResponse.data.custom_meta?.phone_number;
          const province = wpResponse.data.custom_meta?.province;
          const dob = wpResponse.data.custom_meta?.date_of_birth;

          setCookieValue(cookieStore, "pn", phone || "");
          setCookieValue(cookieStore, "province", province || "");
          setCookieValue(cookieStore, "dob", dob || "");

          // Fetch Stripe customer ID from WooCommerce and save to cookies
          try {
            const customerResponse = await axios.get(
              `${BASE_URL}/wp-json/wc/v3/customers/${userId}`,
              {
                headers: {
                  Authorization: process.env.ADMIN_TOKEN || authToken.value,
                },
              }
            );

            const metaData = customerResponse.data.meta_data || [];
            const stripeCustomerMeta = metaData.find(
              (meta) => meta.key === "_stripe_customer_id"
            );

            if (stripeCustomerMeta && stripeCustomerMeta.value) {
              setCookieValue(cookieStore, "stripeCustomerId", stripeCustomerMeta.value);
              logger.log(
                "Stripe customer ID saved to cookies (fallback):",
                stripeCustomerMeta.value
              );
            }
          } catch (customerError) {
            logger.error(
              "Failed to fetch Stripe customer ID (fallback):",
              customerError.message
            );
            // Continue login even if we can't fetch customer ID
          }
        }
      } catch (fetchError) {
        logger.log("Could not fetch profile in fallback:", fetchError.message);
      }

      return NextResponse.json({
        success: true,
        userId: userId,
        userDisplayName: userDisplayName,
      });
    }
  } catch (error) {
    logger.error(
      "Error during Google login:",
      error.response?.data || error.message
    );

    // Handle specific error cases from the backend
    const errorData = error.response?.data;
    const statusCode = error.response?.status || 500;

    let errorMessage = "Google login failed. Please try again.";

    if (errorData?.code === "no_match") {
      errorMessage =
        errorData.message ||
        "No account found for this Google account. Please sign in with your email and password first.";
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorData?.code,
      },
      { status: statusCode }
    );
  }
}
