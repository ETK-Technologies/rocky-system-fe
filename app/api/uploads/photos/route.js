import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";
import { cookies } from "next/headers";

const BASE_URL = process.env.BASE_URL;

/**
 * POST /api/uploads/photos
 * Upload photos to the backend API
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

    logger.log("🚀 Received photo upload request", authToken);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    const headers = {
      "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
      "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      Origin: origin,
    };

    // Get FormData from request
    const formData = await request.formData();

    // Get sessionId if present (for guest users)
    const sessionId = formData.get("sessionId");

    if (authToken) {
      logger.log("🔐 Uploading photos with authenticated user");
      headers["Authorization"] = `${authToken.value}`;
    } else if (sessionId) {
      logger.log("🔓 Uploading photos with guest user, sessionId:", sessionId);
      // Keep sessionId in formData - backend will read it from there
    } else {
      logger.warn("⚠️ No authentication token or sessionId provided");
    }

    logger.log("📤 Uploading photos to backend API");

    // Use Railway backend URL
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";

    // Forward the request to backend API
    const response = await fetch(`${apiUrl}/api/v1/uploads/photos`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("❌ Photo upload failed:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Upload failed",
        },
        { status: response.status }
      );
    }

    logger.log("✅ Photos uploaded successfully:", data);

    return NextResponse.json({
      success: true,
      files: data.files || [],
      totalFiles: data.totalFiles || 0,
      message: data.message,
    });
  } catch (error) {
    logger.error("❌ Error uploading photos:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
