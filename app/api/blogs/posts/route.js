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
    });

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
