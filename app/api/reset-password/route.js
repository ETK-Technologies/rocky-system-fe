import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { getAppAuthHeaders } from "@/utils/environmentConfig";
import { getOrigin } from "@/lib/utils/getOrigin";

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    // Get backend API base URL
    const apiUrl =
      process.env.BASE_URL || "https://rocky-be-production.up.railway.app";

    // Get app authentication headers
    const authHeaders = getAppAuthHeaders();

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Call the new backend API to reset the password
    try {
      const response = await axios.post(
        `${apiUrl}/api/v1/auth/reset-password`,
        {
          token,
          newPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            ...authHeaders,
            Origin: origin,
          },
        }
      );

      return NextResponse.json(
        {
          success: true,
          message:
            response.data?.message || "Password has been reset successfully",
        },
        { status: 200 }
      );
    } catch (apiError) {
      logger.error("API password reset error:", apiError.response?.data);
      return NextResponse.json(
        {
          success: false,
          message:
            apiError.response?.data?.message ||
            apiError.response?.data?.error?.message ||
            "Failed to reset password",
        },
        { status: apiError.response?.status || 400 }
      );
    }
  } catch (error) {
    logger.error("Password reset error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while resetting your password",
      },
      { status: 500 }
    );
  }
}
