import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { logger } from "@/utils/devLogger";
import { getOrigin } from "@/lib/utils/getOrigin";

export async function GET(req) {
  try {
    logger.log("API: Starting portal URL fetch process");

    // Check if user is logged in
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken")?.value;
    const userId = cookieStore.get("userId")?.value;

    if (!authToken || !userId) {
      logger.log(
        "API: User not logged in, no auth token or userId found in cookies"
      );
      return NextResponse.json(
        { success: false, error: "User not logged in" },
        { status: 401 }
      );
    }

    logger.log("API: User is logged in with ID:", userId);

    // Backend API and Patient Portal URLs from environment variables
    const backendUrl = process.env.BASE_URL;
    const patientPortalUrl = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL;

    // Debug: Print environment variables
    logger.log("API: Environment variables check:", {
      backendUrl: backendUrl ? "✓ Set" : "✗ Missing",
      patientPortalUrl: patientPortalUrl ? "✓ Set" : "✗ Missing",
    });

    // If environment variables are not set, return an error
    if (!backendUrl || !patientPortalUrl) {
      const missingVars = [];
      if (!backendUrl) missingVars.push("BASE_URL");
      if (!patientPortalUrl) missingVars.push("NEXT_PUBLIC_PATIENT_PORTAL_URL");

      const errorMsg = `Missing required environment variables: ${missingVars.join(
        ", "
      )}`;
      logger.error("API:", errorMsg);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 500 }
      );
    }

    // Extract query parameters
    const url = new URL(req.url);
    const redirectPage = url.searchParams.get("redirectPage") || "dashboard";
    logger.log("API: Redirect page set to:", redirectPage);

    // Extract the actual JWT token (remove "Bearer " prefix if present)
    let jwtToken = authToken;
    if (authToken.startsWith("Bearer ")) {
      jwtToken = authToken.substring(7);
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex");
    logger.log("API: Generated state parameter for CSRF protection:", state);

    // Build the redirect URI for the patient portal callback
    const redirectUri = `${patientPortalUrl}/auth/callback`;

    // Build the authorization URL
    const authorizeUrl =
      `${backendUrl}/api/v1/auth/authorize?` +
      `app=patient-portal&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(state)}`;

    logger.log("API: Built authorization URL:", authorizeUrl);

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // Make a server-side request to the backend authorization endpoint
    // The backend will validate the JWT and redirect to the portal with a code
    // We use redirect: 'manual' to capture the redirect location
    let authResponse;
    try {
      logger.log("API: Requesting authorization from backend");
      authResponse = await fetch(authorizeUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${jwtToken}`,
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          Origin: origin,
        },
        redirect: "manual", // Don't follow redirects automatically
      });

      logger.log("API: Backend auth response status:", authResponse.status);

      // Check if we got a redirect (302/301) or an error
      if (authResponse.status === 302 || authResponse.status === 301) {
        // Get the redirect location from the Location header
        const redirectLocation = authResponse.headers.get("Location");

        if (redirectLocation) {
          logger.log(
            "API: Successfully obtained redirect location from backend"
          );
          logger.log("API: Redirect URL:", redirectLocation);

          // Return the redirect URL to the frontend
          return NextResponse.json({
            success: true,
            url: redirectLocation,
          });
        } else {
          logger.error("API: Redirect response but no Location header");
          return NextResponse.json(
            {
              success: false,
              error: "Backend returned redirect but no location header",
            },
            { status: 500 }
          );
        }
      } else if (!authResponse.ok) {
        // Handle error responses
        const errorText = await authResponse.text();
        logger.error("API: Backend authorization failed:", errorText);

        let errorMessage = `Failed to authorize: ${authResponse.status} ${authResponse.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If parsing fails, use the text as is
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: errorText,
          },
          { status: authResponse.status }
        );
      } else {
        // Unexpected response (not a redirect and not an error)
        logger.error(
          "API: Unexpected response from backend:",
          authResponse.status
        );
        return NextResponse.json(
          {
            success: false,
            error: "Unexpected response from authorization endpoint",
          },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      logger.error("API: Backend fetch error:", fetchError.message);
      return NextResponse.json(
        {
          success: false,
          error: `Error connecting to backend: ${fetchError.message}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("API: Error in portal login API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
