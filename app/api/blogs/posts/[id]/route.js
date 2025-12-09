import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const API_BASE_URL = process.env.BASE_URL;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    logger.log("Fetching blog post with ID:", id);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/blogs/posts/${id}`,
      {
        headers: {
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "Origin": origin,
        },
      }
    );

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching blog post:",
      error.response?.data || error.message
    );

    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch blog post",
        message: error.response?.data?.message || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
