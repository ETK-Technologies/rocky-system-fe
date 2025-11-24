import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";

const BASE_URL = process.env.ROCKY_BE_BASE_URL || "https://rocky-be-production.up.railway.app";

/**
 * GET /api/auth/google
 * Initiate Google OAuth login
 * 
 * CRITICAL: The backend MUST have this redirect URI configured in Google Cloud Console:
 * {ROCKY_BE_BASE_URL}/api/v1/auth/google/callback
 * (e.g., https://rocky-be-production.up.railway.app/api/v1/auth/google/callback)
 * 
 * The backend must use this EXACT redirect_uri when calling Google OAuth.
 * We pass the frontend callback URL in the state parameter for the backend to use after OAuth completes.
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");
        const redirectTo = searchParams.get("redirect_to");

        // Build frontend callback URL - this is where backend will redirect AFTER Google OAuth
        const frontendCallbackUrl = new URL("/api/auth/google/callback", req.nextUrl.origin);
        if (redirectTo) {
            frontendCallbackUrl.searchParams.set("redirect_to", redirectTo);
        }

        // Build state parameter - backend will extract this after Google OAuth
        // Format: "sessionId:xxx|frontend_callback:https://..."
        const stateParts = [];

        if (sessionId) {
            stateParts.push(`sessionId:${encodeURIComponent(sessionId)}`);
        }

        // Frontend callback URL - backend redirects here after processing Google OAuth
        stateParts.push(`frontend_callback:${encodeURIComponent(frontendCallbackUrl.toString())}`);

        // Build backend OAuth initiation URL
        const backendOAuthUrl = new URL(`${BASE_URL}/api/v1/auth/google`);

        // Add state parameter
        if (stateParts.length > 0) {
            backendOAuthUrl.searchParams.set("state", stateParts.join("|"));
        }

        const finalUrl = backendOAuthUrl.toString();

        logger.log("=== Google OAuth Initiation ===");
        logger.log("Frontend Origin:", req.nextUrl.origin);
        logger.log("Session ID:", sessionId || "none");
        logger.log("Frontend Callback:", frontendCallbackUrl.toString());
        logger.log("State Parameter:", stateParts.join("|"));
        logger.log("Backend OAuth URL:", finalUrl);
        logger.log("===============================");

        // Redirect to backend - backend will handle Google OAuth
        // Backend MUST use redirect_uri: {ROCKY_BE_BASE_URL}/api/v1/auth/google/callback
        return NextResponse.redirect(finalUrl);
    } catch (error) {
        logger.error("Error initiating Google OAuth:", error);
        logger.error("Error stack:", error.stack);

        // Redirect to login page with error
        return NextResponse.redirect(
            new URL("/login-register?viewshow=login&error=oauth_init_failed", req.nextUrl.origin)
        );
    }
}

