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
} from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/register
 * Register a new user using the new auth API
 */
export async function POST(req) {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      province,
      recaptchaToken,
      sessionId,
    } = await req.json();

    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);

      if (!recaptchaResult.success) {
        logger.error("reCAPTCHA verification failed:", recaptchaResult.error);
        return NextResponse.json(
          {
            success: false,
            error: recaptchaResult.error || "reCAPTCHA verification failed. Please try again.",
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
    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          error: "First name and last name are required",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid email is required",
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number is required",
        },
        { status: 400 }
      );
    }

    if (!dateOfBirth) {
      return NextResponse.json(
        {
          success: false,
          error: "Date of birth is required",
        },
        { status: 400 }
      );
    }

    if (!gender) {
      return NextResponse.json(
        {
          success: false,
          error: "Gender is required",
        },
        { status: 400 }
      );
    }

    if (!province) {
      return NextResponse.json(
        {
          success: false,
          error: "Province is required",
        },
        { status: 400 }
      );
    }

    try {
      // Prepare request body for new API
      const requestBody = {
        firstName,
        lastName,
        email,
        password,
        phone,
        dateOfBirth,
        gender,
        province,
      };

      // Include sessionId if provided - backend will use it to migrate guest cart to authenticated user
      if (sessionId) {
        requestBody.sessionId = sessionId;
        logger.log("Including sessionId in backend register request for cart migration");
      }

      logger.log("Registering user with new auth API");

      // Get origin for Origin header (required for backend domain whitelist)
      const origin = getOrigin(req);

      const response = await axios.post(
        `${BASE_URL}/api/v1/auth/register`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
            "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
            "Origin": origin,
          },
          timeout: 25000, // 25 second timeout (before Next.js 30s default)
        }
      );

      const { access_token, refresh_token, user, cart } = response.data;

      // Get cookie store
      const cookieStore = await cookies();

      // Transform registration response to user data structure
      const userData = transformAuthResponse({
        access_token,
        refresh_token,
        user,
      });

      // Add registration form data to profile
      userData.profile = {
        phone: phone || null,
        province: province || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
      };

      // Store user data (auth + user info + registration profile data) to cookies
      setUserDataToCookies(cookieStore, userData);

      // Fetch full profile data including billing/shipping addresses
      // This ensures all profile data is available after registration
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
          
          // Merge profile data into user data (profile API data takes precedence)
          const mergedUserData = mergeProfileData(userData, profileData);
          
          // Update cookies with merged data
          setUserDataToCookies(cookieStore, mergedUserData);
          
          logger.log("Profile data fetched and merged after registration");
        }
      } catch (profileError) {
        // Log error but don't fail registration if profile fetch fails
        logger.warn(
          "Failed to fetch profile data after registration (non-critical):",
          profileError.response?.data || profileError.message
        );
      }

      logger.log("User registered successfully:", {
        userId: user?.id,
        email: user?.email,
        cartMerged: cart?.merged || false,
      });

      return NextResponse.json({
        success: true,
        message: "Registration successful",
        data: {
          user,
          cart,
          access_token,
          refresh_token,
        },
      });
    } catch (error) {
      logger.error(
        "Error registering user with new auth API:",
        error.response?.data || error.message
      );

      // Handle timeout errors
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return NextResponse.json(
          {
            success: false,
            error: "Request timeout. The server took too long to respond. Please try again.",
          },
          { status: 408 }
        );
      }

      // Handle network errors
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return NextResponse.json(
          {
            success: false,
            error: "Unable to connect to the server. Please check your connection and try again.",
          },
          { status: 503 }
        );
      }

      // Handle specific error responses from the API
      if (error.response?.status === 409) {
        return NextResponse.json(
          {
            success: false,
            error: "User already exists. Please login instead.",
          },
          { status: 409 }
        );
      }

      // Handle 408 timeout from backend
      if (error.response?.status === 408) {
        return NextResponse.json(
          {
            success: false,
            error: "Request timeout. The server took too long to respond. Please try again.",
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
          error: "Registration failed. Please try again.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in register route:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
