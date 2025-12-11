import axios from "axios";
import { logger } from "@/utils/devLogger";

/**
 * Verify reCAPTCHA v3 token with Google
 * @param {string} token - The reCAPTCHA token to verify
 * @returns {Promise<{success: boolean, score?: number, error?: string, errorCodes?: string[]}>}
 */
export async function verifyRecaptchaToken(token) {
  if (!token) {
    return {
      success: false,
      error: "reCAPTCHA token is required",
    };
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    logger.error("RECAPTCHA_SECRET_KEY is not set");
    return {
      success: false,
      error: "reCAPTCHA configuration error",
    };
  }

  try {
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
      const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || "0.5");

      if (score < minScore) {
        logger.warn(`reCAPTCHA v3 score too low: ${score} (minimum: ${minScore})`);
        return {
          success: false,
          error: "reCAPTCHA verification failed: low score",
          score,
          minScore,
          errorCodes: [`score_too_low_${score}`],
        };
      }

      return {
        success: true,
        score, // Score between 0.0 and 1.0
        challenge_ts,
        hostname,
      };
    } else {
      return {
        success: false,
        error: "reCAPTCHA verification failed",
        errorCodes,
      };
    }
  } catch (error) {
    logger.error("Error verifying reCAPTCHA:", error);
    return {
      success: false,
      error: "Failed to verify reCAPTCHA",
      errorCodes: ["verification_error"],
    };
  }
}

