import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";

const API_BASE_URL = "https://rocky-be-production.up.railway.app";

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

    const response = await axios.get(`${API_BASE_URL}/api/v1/blogs/categories`, {
      params,
      headers: {
        accept: "application/json",
        "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
        "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
      },
    });

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error("Error fetching blog categories:", error.response?.data || error.message);
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

