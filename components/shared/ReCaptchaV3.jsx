"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { logger } from "@/utils/devLogger";

// Load reCAPTCHA v3 script
const loadRecaptchaScript = (siteKey) => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.grecaptcha && window.grecaptcha.ready) {
      resolve();
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector(
      `script[src*="recaptcha/api.js"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", reject);
      return;
    }

    // Create and load script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const ReCaptchaV3 = forwardRef(({ siteKey, onVerify, onError }, ref) => {
  const isReadyRef = useRef(false);
  const siteKeyRef = useRef(siteKey);

  useEffect(() => {
    siteKeyRef.current = siteKey;
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) {
      logger.warn("reCAPTCHA v3 site key not provided");
      return;
    }

    // Load the reCAPTCHA v3 script
    loadRecaptchaScript(siteKey)
      .then(() => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            isReadyRef.current = true;
            logger.log("reCAPTCHA v3 script loaded and ready");
          });
        }
      })
      .catch((error) => {
        logger.error("Failed to load reCAPTCHA v3 script:", error);
        if (onError) {
          onError("Failed to load reCAPTCHA. Please refresh the page.");
        }
      });
  }, [siteKey, onError]);

  // Expose execute method via ref
  useImperativeHandle(ref, () => ({
    execute: async (action = "submit") => {
      if (!siteKeyRef.current) {
        const error = "reCAPTCHA site key not provided";
        logger.error(error);
        if (onError) {
          onError(error);
        }
        return null;
      }

      if (!isReadyRef.current || !window.grecaptcha) {
        // Wait for grecaptcha to be ready
        try {
          await loadRecaptchaScript(siteKeyRef.current);
          await new Promise((resolve) => {
            if (window.grecaptcha && window.grecaptcha.ready) {
              window.grecaptcha.ready(() => {
                isReadyRef.current = true;
                resolve();
              });
            } else {
              resolve();
            }
          });
        } catch (error) {
          logger.error("reCAPTCHA v3 not ready:", error);
          if (onError) {
            onError("reCAPTCHA is not ready. Please try again.");
          }
          return null;
        }
      }

      try {
        const token = await window.grecaptcha.execute(
          siteKeyRef.current,
          { action }
        );
        logger.log("reCAPTCHA v3 token generated for action:", action);
        if (onVerify) {
          onVerify(token);
        }
        return token;
      } catch (error) {
        logger.error("reCAPTCHA v3 execution error:", error);
        if (onError) {
          onError("reCAPTCHA verification failed. Please try again.");
        }
        return null;
      }
    },
    reset: () => {
      // v3 doesn't need reset, but we can clear any stored token
      logger.log("reCAPTCHA v3 reset called (no-op for v3)");
    },
    getValue: () => {
      // For v3, we always need to execute to get a new token
      return null;
    },
  }));

  // v3 is invisible, so we don't render anything
  return null;
});

ReCaptchaV3.displayName = "ReCaptchaV3";

export default ReCaptchaV3;

