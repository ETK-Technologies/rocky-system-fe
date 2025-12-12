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
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    logger.log("Fetching blog category with ID:", id);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/blogs/categories/${id}`,
      {
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
      }
    );

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
      "Error fetching blog category:",
      error.response?.data || error.message
    );

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
