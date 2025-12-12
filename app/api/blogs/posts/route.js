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
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const tagId = searchParams.get("tagId");
    const authorId = searchParams.get("authorId");
    const isFeatured = searchParams.get("isFeatured");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    // Build query parameters - only add if value exists
    const params = {
      status: status || "PUBLISHED",
      sortBy: sortBy || "publishedAt",
      sortOrder: sortOrder || "desc",
      page,
      limit,
    };

    // Only add optional parameters if they exist
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (tagId) params.tagId = tagId;
    if (authorId) params.authorId = authorId;
    if (isFeatured !== null && isFeatured !== undefined && isFeatured !== "") {
      params.isFeatured = isFeatured === "true";
    }

    logger.log("Fetching blog posts with params:", params);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    const response = await axios.get(`${API_BASE_URL}/api/v1/blogs/posts`, {
      params,
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        "Origin": origin,
      },
      // Explicitly validate status - only accept 2xx responses, reject 103 and others
      validateStatus: function (status) {
        // Only accept 2xx status codes, explicitly reject 103 Early Hints
        const isValid = status >= 200 && status < 300 && status !== 103;
        if (!isValid && process.env.NODE_ENV === "development") {
          console.warn(`[Blog API] Received unexpected status code: ${status}`);
        }
        return isValid;
      },
      // Set timeout to prevent hanging
      timeout: 30000,
      // Disable automatic redirects that might cause issues
      maxRedirects: 5,
      // Ensure we get the actual response, not early hints
      transitional: {
        silentJSONParsing: false,
        forcedJSONParsing: true,
        clarifyTimeoutError: true,
      },
    });

    // Double-check we got a valid response with 2xx status
    if (!response || response.status < 200 || response.status >= 300 || response.status === 103) {
      throw new Error(`Invalid response status: ${response?.status || 'unknown'}`);
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching blog posts:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        error: "Failed to fetch blog posts",
        message: error.response?.data?.message || error.message,
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
