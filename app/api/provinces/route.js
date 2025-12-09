import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getClientDomain } from "@/lib/utils/getClientDomain";

const BASE_URL = process.env.BASE_URL;

/**
 * GET /api/provinces
 * Fetch list of Canadian provinces from the backend API
 */
export async function GET(request) {
  try {
    // Get client domain for X-Client-Domain header (required for backend domain whitelist)
    const clientDomain = getClientDomain(request);

    const response = await fetch(`${BASE_URL}/api/v1/auth/provinces`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "X-Client-Domain": clientDomain,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      logger.error("Failed to fetch provinces:", response.status);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch provinces",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data.canadian || [],
    });
  } catch (error) {
    logger.error("Error fetching provinces:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch provinces",
      },
      { status: 500 }
    );
  }
}
