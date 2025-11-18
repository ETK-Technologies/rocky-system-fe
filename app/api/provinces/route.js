import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";

const BASE_URL = "https://rocky-be-production.up.railway.app";

/**
 * GET /api/provinces
 * Fetch list of Canadian provinces from the backend API
 */
export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/provinces`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
        "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
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

