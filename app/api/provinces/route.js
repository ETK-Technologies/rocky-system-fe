import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

/**
 * GET /api/provinces
 * Fetch list of US states (provinces) from the backend API
 * Response format: { "US": [{ code, name }, ...] }
 */
export async function GET(request) {
  try {
    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Ensure BASE_URL is set, fallback to production URL if needed
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";

    const response = await fetch(`${apiUrl}/api/v1/auth/provinces`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      logger.error("Failed to fetch provinces:", response.status, response.statusText);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch provinces",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Response structure: { "US": [{ code, name }, ...] }
    // Extract the US states array (default country is US)
    const states = data.US || [];
    
    logger.log("Fetched provinces/states:", states.length);
    
    return NextResponse.json({
      success: true,
      data: states,
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
