import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import { cookies } from "next/headers";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/quizzes/[quizId]/start
 * Start a quiz session for the given quiz ID
 */
export async function POST(request, { params })  {
  try {
    // In Next.js 15, params is a Promise and needs to be awaited
    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json(
        { success: false, error: "Quiz ID is required" },
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

    // Parse request body if any
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (error) {
      // No body or invalid JSON, continue with empty object
      logger.log("No request body provided or invalid JSON");
    }

    if (authToken) {
      logger.log("🔐 Starting quiz with authenticated user");
      headers["Authorization"] = `${authToken.value}`;
    } else {
      logger.log("🔓 Starting quiz with guest user");
      // Check if sessionId is provided in request body
      if (requestBody.sessionId) {
        logger.log("👤 Using sessionId from request:", requestBody.sessionId);
      } else {
        logger.warn("⚠️ No sessionId provided in request body for guest user");
      }
    }

    logger.log(`🚀 Starting quiz session for quiz ID: ${quizId}`);

    // Use Railway backend URL
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";

    // Call backend API to start quiz
    const backendUrl = `${apiUrl}/api/v1/quizzes/${quizId}/start`;

    logger.log(`🔗 Backend URL: ${backendUrl}`);
    logger.log(`🔗 API URL: ${apiUrl}`);

    logger.log("Start Quiz with Body:", requestBody);
    

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
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

    const quizSessionData = await response.json();

    logger.log("✅ Quiz session started successfully:", {
      quizId: quizId,
      sessionId: quizSessionData?.session_id || quizSessionData?.sessionId,
    });

    return NextResponse.json({
      success: true,
      data: quizSessionData,
    });
  } catch (error) {
    logger.error("❌ Error starting quiz session:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to start quiz session",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
