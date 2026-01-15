import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import https from "https";
import axios from "axios";
import { getUserIdFromCookies, getAuthTokenFromCookies } from "@/services/userDataService";

// Get base URL from environment variables
const BASE_URL = process.env.BASE_URL;

// Helper function to get user ID and auth token from cookies
async function getUserAuthData() {
  try {
    const cookieStore = await cookies();
    const userId = getUserIdFromCookies(cookieStore);
    const authToken = getAuthTokenFromCookies(cookieStore);

    return {
      userId: userId?.value ? parseInt(userId.value) : null,
      authToken: authToken?.value || null,
    };
  } catch (error) {
    logger.warn("Error getting user auth data from cookies:", error);
    return {
      userId: null,
      authToken: null,
    };
  }
}

export async function POST(req) {
  try {
    const { userId, authToken } = await getUserAuthData();

    // Get request data
    const requestData = await req.json();
    const questionnaireId = requestData.questionnaire_id;
    // Use provided user ID or fallback to the one from cookies
    const userIdToCheck = requestData.user_id || userId;

    if (!questionnaireId) {
      return NextResponse.json(
        { error: true, message: "Questionnaire ID is required" },
        { status: 400 }
      );
    }

    if (!userIdToCheck && !authToken) {
      return NextResponse.json(
        { error: true, message: "User authentication required" },
        { status: 401 }
      );
    }

    // Prepare API request to the backend
    const postData = {
      questionnaire_id: questionnaireId,
      user_id: userIdToCheck,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Set headers with authentication token if available
    const headers = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `${authToken}`;
    }

    try {
      // Use the environment BASE_URL like other API endpoints in the project
      const response = await axios.post(
        `${BASE_URL}/wp-json/custom/v1/check-questionnaire`,
        postData,
        {
          headers,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
          }),
          validateStatus: (status) => status >= 200 && status < 300,
        }
      );

      if (response.data) {
        return NextResponse.json({
          completed: response.data.completed || false,
          completion_date: response.data.completion_date || null,
          message: response.data.message || "Success",
        });
      }

      // Default response if backend doesn't provide sufficient data
      return NextResponse.json({
        completed: false,
        message: "No data returned from backend",
      });
    } catch (apiError) {
      logger.error("Backend API error:", apiError);

      // If the API error indicates the questionnaire doesn't exist or user not found,
      // we'll return a completed=false response rather than an error
      return NextResponse.json({
        completed: false,
        error: true,
        message:
          apiError.response?.data?.message ||
          "Failed to check questionnaire completion",
      });
    }
  } catch (error) {
    logger.error("API route error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
