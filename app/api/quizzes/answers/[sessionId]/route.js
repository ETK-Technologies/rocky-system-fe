import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import { cookies } from "next/headers";

const BASE_URL = process.env.BASE_URL;

/**
 * GET /api/quizzes/answers/[sessionId]
 * Fetch existing quiz answers for a given session ID
 */
export async function GET(request, { params }) {
  try {
    // In Next.js 15, params is a Promise and needs to be awaited
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    const headers = {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
      "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      Origin: origin,
    };

    if (authToken) {
      logger.log("🔐 Fetching answers with authenticated user");
      headers["Authorization"] = `${authToken.value}`;
    } else {
      logger.log("🔓 Fetching answers with guest user for session:", sessionId);
    }

    logger.log(`📥 Fetching existing answers for session ID: ${sessionId}`);

    // Use Railway backend URL
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";

    // Call backend API to fetch answers
    const backendUrl = `${apiUrl}/api/v1/quizzes/responses/session/${sessionId}`;

    logger.log("🚀 Making request to backend API with Session", sessionId);

    logger.log(`🔗 Backend URL: ${backendUrl}`);
    logger.log(`🔗 API URL: ${apiUrl}`);

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: headers,
      cache: "no-store", // Disable caching
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Backend error: ${response.status} - ${errorText}`);

      return NextResponse.json(
        {
          success: false,
          error: `Backend returned ${response.status}`,
          details: errorText,
          requestedUrl: backendUrl,
          apiUrl: apiUrl,
        },
        { status: response.status }
      );
    }

    const answersData = await response.json();

    logger.log("✅ Quiz answers fetched successfully:", {
      sessionId: sessionId,
      answersCount: answersData?.data?.answers?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data: answersData.data || answersData,
    });
  } catch (error) {
    logger.error("❌ Error fetching quiz answers:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch quiz answers",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
