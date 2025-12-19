import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/quizzes/responses/[responseId]/answers
 * Save an individual answer to a quiz response
 */
export async function POST(request, { params }) {
  try {
    const { responseId } = await params;

    if (!responseId) {
      return NextResponse.json(
        { success: false, error: "Response ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { questionId, answer } = body;

    if (!questionId || !answer) {
      return NextResponse.json(
        { success: false, error: "questionId and answer are required" },
        { status: 400 }
      );
    }

    logger.log(`💾 Saving answer for response ${responseId}, question ${questionId}`);

    const origin = getOrigin(request);
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";
    const backendUrl = `${apiUrl}/api/v1/quizzes/responses/${responseId}/answers`;

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      body: JSON.stringify({ questionId, answer }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Backend error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save answer: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    logger.log("✅ Answer saved successfully");

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("❌ Error saving answer:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save answer",
      },
      { status: 500 }
    );
  }
}
