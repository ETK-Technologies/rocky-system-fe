import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/quizzes/responses/[responseId]/complete
 * Complete a quiz and submit all answers
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
    const { answers, prescriptions } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: "answers array is required" },
        { status: 400 }
      );
    }

    logger.log(`🏁 Completing quiz response ${responseId} with ${answers.length} answers`);

    const origin = getOrigin(request);
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";
    const backendUrl = `${apiUrl}/api/v1/quizzes/responses/${responseId}/complete`;

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      body: JSON.stringify({
        answers,
        prescriptions: prescriptions || { items: [] },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`❌ Backend error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to complete quiz: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    logger.log("✅ Quiz completed successfully");

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("❌ Error completing quiz:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to complete quiz",
      },
      { status: 500 }
    );
  }
}
