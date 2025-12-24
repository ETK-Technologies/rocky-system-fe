import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { getAppAuthHeaders } from "@/utils/environmentConfig";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Get backend API base URL
    const apiUrl =
      process.env.BASE_URL || "https://rocky-be-production.up.railway.app";

    // Get app authentication headers
    const authHeaders = getAppAuthHeaders();

    // Call the new backend API for password reset
    try {
      const response = await axios.post(
        `${apiUrl}/api/v1/auth/forgot-password`,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            ...authHeaders,
          },
        }
      );

      // Return the success response from backend
      return NextResponse.json(
        {
          success: true,
          message:
            response.data?.message ||
            "Password reset instructions have been sent to your email",
        },
        { status: 200 }
      );
    } catch (apiError) {
      logger.error("API error:", apiError.response?.data);
      return NextResponse.json(
        {
          success: false,
          message:
            apiError.response?.data?.message ||
            apiError.response?.data?.error?.message ||
            "Failed to process password reset request",
        },
        { status: apiError.response?.status || 400 }
      );
    }
  } catch (error) {
    logger.error("Forgot password error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while processing your request",
      },
      { status: 500 }
    );
  }
}
