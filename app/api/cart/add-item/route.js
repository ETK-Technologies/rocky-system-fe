import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://guardian-patient-portal-production.up.railway.app",
  "https://rocky-system-fe.vercel.app",
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.SITE_URL,
].filter(Boolean); // Remove any undefined values

/**
 * Get CORS headers based on the request origin
 */
function getCorsHeaders(req) {
  const origin = req.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };

  // If origin is in allowed list, add it to Access-Control-Allow-Origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (origin) {
    // For development, allow any localhost origin
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
  }

  return headers;
}

/**
 * Handle OPTIONS preflight request
 */
export async function OPTIONS(req) {
  const corsHeaders = getCorsHeaders(req);
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/cart/add-item
 * Add item to cart using the new API endpoint
 *
 * AUTHENTICATED USER:
 * - Request Header: Authorization: Bearer <token>
 * - Request Body: { productId, variantId, quantity }
 * - sessionId is NOT included
 *
 * GUEST USER:
 * - Request Header: No Authorization
 * - Request Body: { productId, variantId, quantity, sessionId }
 * - sessionId is REQUIRED
 *
 * @param {string} productId - The main product ID (REQUIRED)
 * @param {string} variantId - The variant/variation ID (OPTIONAL, for variable products)
 * @param {number} quantity - Quantity to add (default: 1)
 * @param {string} sessionId - Session ID for guest users (auto-included by client for guests)
 */
export async function POST(req) {
  try {
    const body = await req.json();

    logger.log("BODY -> ", body);
    // Extract ONLY the fields we need, ignore all extra fields (name, price, image, etc.)
    const {
      productId,
      variationId, // Legacy parameter name (backward compatibility)
      variantId, // New parameter name (preferred)
      quantity = 1,
      sessionId, // From localStorage for guest users
    } = body;

    logger.log("Received payload from client:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Ensure quantity is a valid integer
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return NextResponse.json(
        { error: "Invalid quantity parameter. Must be a positive integer." },
        { status: 400 }
      );
    }

    // Check if Authorization header was sent from client (if authToken is not httpOnly)
    const clientAuthHeader = req.headers.get("authorization");

    // If client didn't send Authorization, try to read from httpOnly cookie (server-side)
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get("authToken");

    // Use client-sent token if available, otherwise use cookie
    const authToken = clientAuthHeader || authTokenCookie?.value;

    logger.log("=== 🔐 AUTHENTICATION CHECK ===");
    if (clientAuthHeader) {
      logger.log("✅ Authorization header from CLIENT (not httpOnly)");
      logger.log("   Token length:", clientAuthHeader.length, "characters");
      logger.log("   Token prefix:", clientAuthHeader.substring(0, 30) + "...");
    } else if (authTokenCookie) {
      logger.log("✅ Authorization from SERVER COOKIE (httpOnly)");
      logger.log(
        "   Token length:",
        authTokenCookie.value.length,
        "characters"
      );
      logger.log(
        "   Token prefix:",
        authTokenCookie.value.substring(0, 30) + "..."
      );
    } else {
      logger.log("❌ No authorization found (guest user)");
    }

    // Build clean request body - ONLY send what the backend API expects
    const requestBody = {
      productId,
      quantity: parsedQuantity,
    };

    // Add variantId if provided (for variable products like different sizes/colors)
    // IMPORTANT: variantId is DIFFERENT from productId!
    // - productId: The base product (e.g., "Sildenafil")
    // - variantId: The specific variant (e.g., "50mg" vs "100mg")
    // If they're the same, it means there's NO variant (simple product)
    const finalVariantId = variantId || variationId; // Support both parameter names

    if (finalVariantId && finalVariantId !== productId) {
      // Only add variantId if it's DIFFERENT from productId
      requestBody.variantId = finalVariantId;
      logger.log(
        `Product has variant: productId=${productId}, variantId=${finalVariantId}`
      );
    } else if (finalVariantId === productId) {
      // If variantId equals productId, it's a simple product with no variants
      logger.log(`Simple product (no variant): productId=${productId}`);
      // Do NOT add variantId to the request body
    } else {
      logger.log(
        `Simple product (no variantId provided): productId=${productId}`
      );
    }

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
      "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
      Origin: origin,
    };

    // AUTHENTICATION LOGIC - This determines the final payload structure
    // IMPORTANT: Authenticated users should NOT use sessionId
    // If authToken exists, we ignore sessionId and use authentication only
    if (authToken) {
      // ✅ AUTHENTICATED USER PATH
      // Add FULL Authorization header with complete Bearer token
      // Token already contains "Bearer " prefix + full JWT token
      headers.Authorization = authToken;

      // Explicitly remove sessionId from request body if it was sent
      // Authenticated users should NOT use sessionId
      if (sessionId) {
        logger.log(
          "⚠️ Warning: sessionId provided but user is authenticated. Ignoring sessionId and using authentication."
        );
      }
      // Do NOT include sessionId in requestBody for authenticated users
    } else {
      // ✅ GUEST USER PATH
      // No Authorization header
      // sessionId MUST be included in request body

      if (sessionId) {
        requestBody.sessionId = sessionId; // From localStorage

        // Final payload: { productId, variantId?, quantity, sessionId }

        logger.log("Adding item to cart for guest user with sessionId");
        logger.log("Request will NOT include Authorization header");
      } else {
        return NextResponse.json(
          {
            error: "Either authentication token or sessionId is required",
            code: "AUTH_OR_SESSION_REQUIRED",
          },
          { status: 400 }
        );
      }
    }

    // Log the FINAL clean payload being sent to backend
    logger.log("=== FINAL REQUEST TO BACKEND ===");
    logger.log("URL:", `${BASE_URL}/api/v1/cart/items`);
    logger.log("Method: POST");
    logger.log("Payload:", JSON.stringify(requestBody, null));

    if (authToken) {
      logger.log("✅ Authorization: Full Bearer token is being sent");
      logger.log("   Token length:", authToken.length, "chars");
      logger.log("   Token preview:", authToken.substring(0, 40) + "...");
      logger.log(
        "   Source:",
        clientAuthHeader ? "Client-side header" : "Server-side cookie"
      );
    } else {
      logger.log("❌ Authorization: None (guest user)");
    }

    logger.log("Headers being sent:", {
      "Content-Type": headers["Content-Type"],
      Authorization: headers.Authorization
        ? `Present (${headers.Authorization.length} chars)`
        : "None",
      accept: headers.accept,
    });

    // Verify headers before sending
    logger.log("🔍 VERIFICATION - Headers object before axios call:");
    logger.log("   Full headers object:", JSON.stringify(headers, null, 2));
    logger.log("   - Content-Type:", headers["Content-Type"]);
    logger.log("   - accept:", headers.accept);
    logger.log("   - Authorization exists:", !!headers.Authorization);
    if (headers.Authorization) {
      logger.log("   - Authorization length:", headers.Authorization.length);
      logger.log(
        "   - Authorization starts with 'Bearer':",
        headers.Authorization.startsWith("Bearer")
      );
      logger.log(
        "   - First 50 chars:",
        headers.Authorization.substring(0, 50)
      );
    }

    // Prepare axios config
    const axiosConfig = {
      headers: headers,
    };

    logger.log(
      "🔍 Axios config:",
      JSON.stringify(
        {
          url: `${BASE_URL}/api/v1/cart/items`,
          method: "POST",
          headers: {
            ...headers,
            Authorization: headers.Authorization
              ? headers.Authorization
              : undefined,
          },
          data: requestBody,
        },
        null,
        2
      )
    );

    // Add item to cart using new API
    const response = await axios.post(
      `${BASE_URL}/api/v1/cart/items`,
      requestBody,
      axiosConfig
    );

    logger.log("✅ Item added to cart successfully:", response.data);

    // Add CORS headers to the response
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(response.data, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    logger.error("❌ ERROR adding item to cart:");
    logger.error("   Status:", error.response?.status);
    logger.error("   Status Text:", error.response?.statusText);
    logger.error("   Response Data:", error.response?.data);
    logger.error("   Error Message:", error.message);

    // Log request details for debugging
    if (error.config) {
      logger.error("   Request URL:", error.config.url);
      logger.error("   Request Method:", error.config.method);
      logger.error("   Request Headers:", error.config.headers);
    }

    // Handle specific error cases
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Failed to add item to cart";

    // Add CORS headers to error response as well
    const corsHeaders = getCorsHeaders(req);
    return NextResponse.json(
      {
        error: errorMessage,
        statusCode: statusCode,
        details: error.response?.data || error.message,
      },
      {
        status: statusCode,
        headers: corsHeaders,
      }
    );
  }
}
