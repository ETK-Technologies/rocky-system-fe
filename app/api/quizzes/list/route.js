import { NextResponse } from "next/server";

/**
 * GET /api/quizzes/list
 * Returns list of all quiz slugs for static generation
 */
export async function GET() {
  try {
    // For now, return a static list of known quiz slugs
    // TODO: Fetch this from your database or backend API
    const quizzes = [
      { slug: "ed-pre-consultation" },
      { slug: "hair-pre-consultation-quiz" },
      { slug: "wl-pre-consultation" },
      { slug: "wlprecons" },
      { slug: "wl-consultation-v1" },
      { slug: "ed-consultation" },
      { slug: "hair-consultation" },
      // Add more quiz slugs as needed
    ];

    return NextResponse.json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    console.error("Error fetching quiz list:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch quiz list",
      },
      { status: 500 }
    );
  }
}
