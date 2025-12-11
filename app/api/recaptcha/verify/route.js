import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";

/**
 * POST /api/recaptcha/verify
 * Verifies reCAPTCHA token with Google
 */
export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "reCAPTCHA token is required",
        },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not set");
      return NextResponse.json(
        {
          success: false,
          error: "reCAPTCHA configuration error",
        },
        { status: 500 }
      );
    }

    // Verify token with Google
    const verificationURL = "https://www.google.com/recaptcha/api/siteverify";
    const response = await axios.post(verificationURL, null, {
      params: {
        secret: secretKey,
        response: token,
      },
    });

    const {
      success,
      score,
      challenge_ts,
      hostname,
      "error-codes": errorCodes,
    } = response.data;

    if (success) {
      // For v3, score is between 0.0 (bot) and 1.0 (human)
      // Typically, scores above 0.5 are considered legitimate
      // You can adjust this threshold based on your needs (0.5 is a common default)
      const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || "0.5");

      if (score < minScore) {
        logger.warn(`reCAPTCHA v3 score too low: ${score} (minimum: ${minScore})`);
        return NextResponse.json(
          {
            success: false,
            error: "reCAPTCHA verification failed: low score",
            score,
            minScore,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        score, // Score between 0.0 and 1.0
        challenge_ts,
        hostname,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "reCAPTCHA verification failed",
          errorCodes,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify reCAPTCHA",
      },
      { status: 500 }
    );
  }
}

