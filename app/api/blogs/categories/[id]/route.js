import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";

const API_BASE_URL = process.env.ROCKY_BE_BASE_URL;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    logger.log("Fetching blog category with ID:", id);

    const response = await axios.get(`${API_BASE_URL}/api/v1/blogs/categories/${id}`, {
      headers: {
        accept: "application/json",
        "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
        "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      },
    });

    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error("Error fetching blog category:", error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: "Blog category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch blog category",
        message: error.response?.data?.message || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}

