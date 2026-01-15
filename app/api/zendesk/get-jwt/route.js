import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logger } from "@/utils/devLogger";
import {
  getUserIdFromCookies,
  getUserEmailFromCookies,
  getUserNameFromCookies,
} from "@/services/userDataService";

// Zendesk configuration
const ZENDESK_KEY_ID =
  process.env.ZENDESK_KEY_ID || "app_66795dab3c4726ef34b7420b";
const ZENDESK_SECRET =
  process.env.ZENDESK_SECRET_KEY ||
  "LP4cev1ps1m26yLf0LVnEVjcAStlUciWBxp679BHvuBFSrxberms__T3gHlx_7XrOD1hNmzNemGW1WbO0M-TOg";
const JWT_EXPIRATION_SECONDS = 3600; // 1 hour

/**
 * GET endpoint to generate JWT token for Zendesk authentication
 * This endpoint reads user data from cookies and creates a JWT token
 * that Zendesk can use to authenticate the user in the chat widget
 */
export async function GET(request) {
  try {
    // Get user data from cookies
    const cookieStore = await cookies();
    const userId = getUserIdFromCookies(cookieStore);
    const userEmail = getUserEmailFromCookies(cookieStore);
    const userName = getUserNameFromCookies(cookieStore);

    // Check if user is authenticated
    if (!userId || !userEmail) {
      logger.log("Zendesk JWT: User not authenticated");
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          message: "User is not logged in.",
        },
        { status: 200 } // Changed from 401 - this is expected behavior, not an error
      );
    }

    logger.log(`Zendesk JWT: Generating token for user ID: ${userId.value}`);

    // Check if Zendesk is configured
    if (!ZENDESK_SECRET) {
      logger.error("Zendesk JWT: Secret key not configured");
      return NextResponse.json(
        {
          success: false,
          statusCode: 500,
          code: "jwt_auth_bad_config",
          message: "JWT is not configured properly.",
          data: {},
        },
        { status: 500 }
      );
    }

    // Create JWT payload
    const issuedAt = Math.floor(Date.now() / 1000);
    const expirationTime = issuedAt + JWT_EXPIRATION_SECONDS;

    const payload = {
      iss: process.env.NEXT_PUBLIC_SITE_URL || "https://myrocky.com",
      iat: issuedAt,
      exp: expirationTime,
      scope: "user",
      external_id: String(userId.value), // Ensure this is a string
      email: userEmail.value,
      name: userName?.value || userEmail.value.split("@")[0], // Fallback to email username if name not available
    };

    // Generate JWT token with key ID in header
    const token = jwt.sign(payload, ZENDESK_SECRET, {
      algorithm: "HS256",
      keyid: ZENDESK_KEY_ID,
    });

    logger.log("Zendesk JWT: Token generated successfully");

    return NextResponse.json({
      success: true,
      token: token,
    });
  } catch (error) {
    logger.error("Zendesk JWT encode error:", error.message);
    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        code: "jwt_encode_error",
        message: "Failed to encode JWT.",
        data: {},
      },
      { status: 500 }
    );
  }
}
