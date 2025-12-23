import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

/**
 * GET /api/quizzes/responses/session/[sessionId]
 * Get a quiz response by session ID
 */
export async function GET(request, { params }) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    logger.log(`📖 Fetching quiz response by session: ${sessionId}`);

    const origin = getOrigin(request);
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";
    const backendUrl = `${apiUrl}/api/v1/quizzes/responses/session/${sessionId}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Backend error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch response: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    logger.log("✅ Response fetched successfully by session");

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("❌ Error fetching response by session:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch response",
      },
      { status: 500 }
    );
  }
}
