import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

/**
 * GET /api/quizzes/slug/[slug]
 * Fetches quiz data from backend by slug
 */
export async function GET(request, { params }) {
  try {
    // In Next.js 15, params is a Promise and needs to be awaited
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Quiz slug is required" },
        { status: 400 }
      );
    }

    logger.log(`📝 Fetching quiz data for slug: ${slug}`);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Use Railway backend URL for quizzes
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";
    
    // Call backend API (no /wp-json prefix for Railway backend)
    const backendUrl = `${apiUrl}/api/v1/quizzes/slug/${slug}`;
    
    logger.log(`🔗 Backend URL: ${backendUrl}`);
    logger.log(`🔗 API URL: ${apiUrl}`);

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      cache: "no-store", // Disable caching for testing
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

    const quizData = await response.json();
    
    logger.log("✅ Quiz data fetched successfully:", {
      slug: quizData?.slug,
      title: quizData?.title,
      questionsCount: quizData?.questions?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data: quizData,
    });
  } catch (error) {
    logger.error("❌ Error fetching quiz data:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch quiz data",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
