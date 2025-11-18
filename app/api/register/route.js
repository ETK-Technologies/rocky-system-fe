import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";

const BASE_URL = "https://rocky-be-production.up.railway.app";

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
      sessionId,
    } = await req.json();

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

      // Include sessionId if provided (for guest cart merging)
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      logger.log("Registering user with new auth API");

      const response = await axios.post(
        `${BASE_URL}/api/v1/auth/register`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
            "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
          },
        }
      );

      const { access_token, refresh_token, user, cart } = response.data;

      // Set up cookies for our Next.js app
      const cookieStore = await cookies();

      // Store access token
      if (access_token) {
        cookieStore.set("authToken", `Bearer ${access_token}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60, // 24 hours
        });
      }

      // Store refresh token
      if (refresh_token) {
        cookieStore.set("refreshToken", refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }

      // Store user information
      if (user) {
        cookieStore.set("userId", user.id);
        cookieStore.set("userEmail", user.email);
        cookieStore.set("displayName", user.firstName);
        cookieStore.set("lastName", user.lastName);
        cookieStore.set("userName", `${user.firstName} ${user.lastName}`);
        if (user.avatar) {
          cookieStore.set("userAvatar", user.avatar);
        }
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
