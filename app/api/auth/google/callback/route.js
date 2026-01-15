import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import { getCookieName } from "@/utils/storagePrefix";

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback from backend
 * Backend redirects here with tokens in URL parameters or sets cookies
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const cookieStore = await cookies();

        logger.log("=== Google OAuth Callback ===");
        logger.log("URL:", req.url);
        logger.log("Search params:", Object.fromEntries(searchParams.entries()));

        // Check for error in URL parameters
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // If there's an error, redirect to login with error message
        if (error) {
            logger.error("Google OAuth error:", error, errorDescription);
            return NextResponse.redirect(
                new URL(
                    `/login-register?viewshow=login&error=${encodeURIComponent(
                        errorDescription || error
                    )}`,
                    req.nextUrl.origin
                )
            );
        }

        // Check for OAuth code - if present, we need to process it
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        // Check if tokens are already in cookies (backend might have set them via Set-Cookie header)
        // Only read prefixed cookies - no fallback to unprefixed to ensure project isolation
        let authTokenCookie = cookieStore.get(getCookieName("authToken"));
        const refreshTokenCookie = cookieStore.get(getCookieName("refreshToken"));
        const userIdCookie = cookieStore.get(getCookieName("userId"));

        // If we have a code but no tokens, backend should process it
        // Redirect to login page which will poll for tokens
        if (code && !authTokenCookie) {
            logger.log("Received OAuth code - backend should process it. Redirecting to login to wait for tokens...");

            const loginUrl = new URL("/login-register", req.nextUrl.origin);
            loginUrl.searchParams.set("viewshow", "login");
            loginUrl.searchParams.set("google_oauth", "processing");

            // Preserve redirect_to if present
            const redirectTo = searchParams.get("redirect_to");
            if (redirectTo) {
                loginUrl.searchParams.set("redirect_to", redirectTo);
            }

            // Preserve flow parameters
            const flowParams = ["ed-flow", "wl-flow", "hair-flow", "mh-flow", "skincare-flow"];
            flowParams.forEach(param => {
                const value = searchParams.get(param);
                if (value) {
                    loginUrl.searchParams.set(param, value);
                }
            });

            logger.log("Redirecting to login page to wait for backend processing:", loginUrl.toString());
            return NextResponse.redirect(loginUrl);
        }

        // Check for tokens in URL parameters (if backend passes them)
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");

        // If we have tokens in URL, set them as cookies (using project-specific prefixed names)
        if (accessToken) {
            cookieStore.set(getCookieName("authToken"), `Bearer ${accessToken}`, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 24 * 60 * 60, // 24 hours
            });
            logger.log("Access token set from URL parameter");
            // Update the cookie reference
            authTokenCookie = cookieStore.get(getCookieName("authToken"));
        }

        if (refreshToken) {
            cookieStore.set(getCookieName("refreshToken"), refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60, // 7 days
            });
            logger.log("Refresh token set from URL parameter");
        }

        // Check if we have authentication (either from URL or cookies)
        const finalAuthToken = authTokenCookie?.value || (accessToken ? `Bearer ${accessToken}` : null);

        if (finalAuthToken) {
            logger.log("Google OAuth callback successful, user authenticated");

            // Check for user info in URL parameters (backend might pass them)
            const userId = searchParams.get("user_id") || searchParams.get("userId");
            const userEmail = searchParams.get("email");
            const firstName = searchParams.get("firstName") || searchParams.get("first_name");
            const lastName = searchParams.get("lastName") || searchParams.get("last_name");

            // Set user information cookies if provided in URL (using project-specific prefixed names)
            if (userId) {
                cookieStore.set(getCookieName("userId"), userId);
            }
            if (userEmail) {
                cookieStore.set(getCookieName("userEmail"), userEmail);
            }
            if (firstName) {
                cookieStore.set(getCookieName("displayName"), firstName);
                cookieStore.set(getCookieName("userFirstName"), firstName);
            }
            if (lastName) {
                cookieStore.set(getCookieName("lastName"), lastName);
                cookieStore.set(getCookieName("userLastName"), lastName);
            }
            if (firstName && lastName) {
                cookieStore.set(getCookieName("userName"), `${firstName} ${lastName}`);
            }

            // Get redirect URL from query params
            const redirectTo = searchParams.get("redirect_to");

            // If we have a redirect_to, use it; otherwise go to home page
            // We'll let the login page handle cross-sell products via the success flag
            const finalRedirectUrl = new URL(redirectTo || "/", req.nextUrl.origin);

            // Add google_auth_success flag so login page can handle cross-sell if needed
            // But we'll redirect directly to the target page
            finalRedirectUrl.searchParams.set("google_auth_success", "true");

            // Preserve flow parameters for cross-sell handling
            const flowParams = ["ed-flow", "wl-flow", "hair-flow", "mh-flow", "skincare-flow"];
            flowParams.forEach(param => {
                const value = searchParams.get(param);
                if (value) {
                    finalRedirectUrl.searchParams.set(param, value);
                }
            });

            logger.log("Redirecting directly to:", finalRedirectUrl.toString());
            return NextResponse.redirect(finalRedirectUrl);
        } else {
            // No tokens found, redirect to login with error
            logger.warn("Google OAuth callback: No tokens found");
            return NextResponse.redirect(
                new URL(
                    "/login-register?viewshow=login&error=authentication_failed",
                    req.nextUrl.origin
                )
            );
        }
    } catch (error) {
        logger.error("Error in Google OAuth callback:", error);
        logger.error("Error stack:", error.stack);

        // Redirect to login page with error
        return NextResponse.redirect(
            new URL(
                "/login-register?viewshow=login&error=callback_error",
                req.nextUrl.origin
            )
        );
    }
}

