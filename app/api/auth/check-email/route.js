import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    logger.log("Checking email availability:", email);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Also get the full URL for Referer header (backend accepts both)
    const referer = request.headers.get("referer") || request.url || origin;

    logger.log("Sending headers:", {
      origin,
      referer,
      hasOrigin: !!origin,
      hasReferer: !!referer,
    });

    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
      "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
    };

    // Add Origin header if we have a valid origin
    if (origin) {
      headers["Origin"] = origin;
    }

    // Add Referer header as fallback (backend accepts both)
    if (referer) {
      headers["Referer"] = referer;
    }

    // Call the backend API to check if email exists
    const response = await fetch(`${BASE_URL}/api/v1/auth/check-email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    logger.log("Backend email check response:", {
      status: response.status,
      data,
    });

    if (!response.ok) {
      logger.error("Email check failed:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to verify email",
        },
        { status: response.status }
      );
    }

    // Return the response from backend
    // Assuming backend returns { exists: true/false }
    return NextResponse.json({
      success: true,
      exists: data.exists || false,
      message: data.message,
    });
  } catch (error) {
    logger.error("Email check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while checking email",
      },
      { status: 500 }
    );
  }
}
