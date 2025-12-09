import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getClientDomain } from "@/lib/utils/getClientDomain";

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

    // Get client domain for X-Client-Domain header (required for backend domain whitelist)
    const clientDomain = getClientDomain(request);

    // Call the backend API to check if email exists
    const response = await fetch(`${BASE_URL}/api/v1/auth/check-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
      },
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
