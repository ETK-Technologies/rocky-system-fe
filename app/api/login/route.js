import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import { verifyRecaptchaToken } from "@/lib/utils/recaptchaVerify";
import {
  setUserDataToCookies,
  transformAuthResponse,
  transformProfileResponse,
  mergeProfileData,
  getUserDataFromCookies,
} from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/login
 * Authenticate user with email and password using the new auth API
 */
export async function POST(req) {
  try {
    const { email, password, recaptchaToken, sessionId } = await req.json();

    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);

      if (!recaptchaResult.success) {
        logger.error("reCAPTCHA verification failed:", recaptchaResult.error);
        return NextResponse.json(
          {
            success: false,
            error:
              recaptchaResult.error ||
              "reCAPTCHA verification failed. Please try again.",
          },
          { status: 400 }
        );
      }

      logger.log("reCAPTCHA verified successfully", {
        score: recaptchaResult.score,
        hostname: recaptchaResult.hostname,
      });
    }

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: "Password is required",
        },
        { status: 400 }
      );
    }

    try {
      // Prepare request body for new API
      const requestBody = {
        email,
        password,
      };

      // Include sessionId if provided - backend will use it to migrate guest cart to authenticated user
      if (sessionId) {
        requestBody.sessionId = sessionId;
        logger.log(
          "Including sessionId in backend login request for cart migration"
        );
      }

      logger.log("Logging in user with new auth API");

      // Get origin for Origin header (required for backend domain whitelist)
      const origin = getOrigin(req);

      const response = await axios.post(
        `${BASE_URL}/api/v1/auth/login`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
            "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
            Origin: origin,
          },
          timeout: 25000, // 25 second timeout (before Next.js 30s default)
        }
      );

      const { access_token, refresh_token, user, cart } = response.data;

      // Get cookie store
      const cookieStore = await cookies();

      // Transform login response to user data structure
      const userData = transformAuthResponse({
        access_token,
        refresh_token,
        user,
      });

      // Store user data (auth + user info) to cookies
      setUserDataToCookies(cookieStore, userData);

      // Fetch full profile data including billing/shipping addresses, phone, province, DOB
      // This ensures all profile data is available in cookies for checkout
      try {
        const profileResponse = await axios.get(
          `${BASE_URL}/api/v1/auth/profile`,
          {
            headers: {
              accept: "*/*",
              "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
              "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
              Authorization: `Bearer ${access_token}`,
              Origin: origin,
            },
          }
        );

        const profileDataRaw = profileResponse.data;

        // Transform profile response to profile data structure
        if (profileDataRaw) {
          const profileData = transformProfileResponse(profileDataRaw);

          // Merge profile data into user data
          const mergedUserData = mergeProfileData(userData, profileData);

          // Update cookies with merged data
          setUserDataToCookies(cookieStore, mergedUserData);

          logger.log("Profile data fetched and merged after login");
        }
      } catch (profileError) {
        // Log error but don't fail login if profile fetch fails
        logger.warn(
          "Failed to fetch profile data after login (non-critical):",
          profileError.response?.data || profileError.message
        );
      }

      logger.log("User logged in successfully:", {
        userId: user?.id,
        email: user?.email,
        cartMerged: cart?.merged || false,
      });

      return NextResponse.json({
        success: true,
        message: "Login successful",
        data: {
          user,
          cart,
          access_token,
          refresh_token,
        },
      });
    } catch (error) {
      logger.error(
        "Error logging in with new auth API:",
        error.response?.data || error.message
      );

      // Handle timeout errors
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Request timeout. The server took too long to respond. Please try again.",
          },
          { status: 408 }
        );
      }

      // Handle network errors
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to connect to the server. Please check your connection and try again.",
          },
          { status: 503 }
        );
      }

      // Handle specific error responses from the API
      if (error.response?.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid credentials. Please check your email and password.",
          },
          { status: 401 }
        );
      }

      // Handle 408 timeout from backend
      if (error.response?.status === 408) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Request timeout. The server took too long to respond. Please try again.",
          },
          { status: 408 }
        );
      }

      if (error.response?.data?.message) {
        return NextResponse.json(
          {
            success: false,
            error: error.response.data.message,
          },
          { status: error.response.status || 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Login failed. Please try again.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in login route:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Login failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
