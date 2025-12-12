import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const API_BASE_URL = process.env.BASE_URL;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters - only include if they have values
    const search = searchParams.get("search");
    const parentId = searchParams.get("parentId");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 25;

    // Build query parameters - only add if value exists
    const params = {
      page,
      limit,
    };

    // Only add optional parameters if they exist
    if (search) params.search = search;
    if (parentId) params.parentId = parentId;
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      params.isActive = isActive === "true";
    }

    logger.log("Fetching blog categories with params:", params);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Make the request - axios will automatically wait for final response after 103 Early Hints
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/blogs/categories`,
      {
        params,
        headers: {
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "Origin": origin,
        },
        // Accept all status codes initially - we'll validate the final response ourselves
        // This ensures axios waits for the final response after 103 Early Hints
        validateStatus: function (status) {
          // Accept 2xx as success, reject everything else to let error handling take over
          // This ensures axios waits for final 200 response even if 103 Early Hints is sent first
          return status >= 200 && status < 300;
        },
        timeout: 30000,
        maxRedirects: 5,
        // Ensure we get the complete response data
        responseType: 'json',
      }
    );

    // Validate final response status - should be 2xx after axios handles 103 Early Hints
    const finalStatus = response?.status;
    if (!response || !finalStatus || finalStatus < 200 || finalStatus >= 300) {
      logger.error(`Invalid final response status: ${finalStatus}`);
      throw new Error(`Invalid response status: ${finalStatus || 'unknown'}`);
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching blog categories:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        error: "Failed to fetch blog categories",
        message: error.response?.data?.message || error.message,
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
