import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";

const BASE_URL = "https://rocky-be-production.up.railway.app";
const APP_KEY = "app_04ecfac3213d7b179dc1e5ae9cb7a627";
const APP_SECRET = "sk_2c867224696400bc2b377c3e77356a9e";

/**
 * GET /api/pages/slug/[slug]
 * Fetch a published page by slug from the backend API
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BASE_URL}/api/v1/pages/slug/${slug}`, {
      method: "GET",
      headers: {
        accept: "*/*",
        "X-App-Key": APP_KEY,
        "X-App-Secret": APP_SECRET,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      logger.error(`Failed to fetch page with slug ${slug}:`, response.status);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch page",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error("Error fetching page:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch page",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

