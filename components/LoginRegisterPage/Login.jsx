"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { logger } from "@/utils/devLogger";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loader from "@/components/Loader";
import { MdOutlineRemoveRedEye, MdOutlineVisibilityOff } from "react-icons/md";
import {
  getSavedProducts,
  clearSavedProducts,
} from "../../utils/crossSellCheckout";
import { processSavedFlowProducts } from "../../utils/flowCartHandler";
import Link from "next/link";
import { mergeGuestCart } from "@/lib/api/cartMerge";
import GoogleSignInButton from "./GoogleSignInButton";
import CartMigrationOverlay from "@/components/CartMigrationOverlay";
import { getSessionId } from "@/services/sessionService";
import ReCaptcha from "@/components/shared/ReCaptcha";

const LoginContent = ({ setActiveTab, loginRef }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMigratingCart, setIsMigratingCart] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptchaRef = useRef(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberme: false,
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const redirectTo = searchParams.get("redirect_to");
  const isEdFlow = searchParams.get("ed-flow") === "1";

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear validation error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle adding saved cross-sell products to cart after login
  const handleCrossSellProducts = async () => {
    try {
      // Use direct cart approach for flow products
      const flowProductsResult = await processSavedFlowProducts();
      if (flowProductsResult.success) {
        logger.log(
          "Processed saved flow products after login:",
          flowProductsResult
        );
        return flowProductsResult.redirectUrl;
      }

      // Check for legacy saved products and convert them to direct cart approach
      const savedProducts = getSavedProducts();

      if (savedProducts) {
        logger.log(
          "Converting legacy saved products to direct cart approach:",
          savedProducts
        );

        // Determine the flow type from URL parameters or saved products
        const flowType =
          searchParams.get("ed-flow") === "1"
            ? "ed"
            : searchParams.get("wl-flow") === "1"
              ? "wl"
              : searchParams.get("hair-flow") === "1"
                ? "hair"
                : searchParams.get("mh-flow") === "1"
                  ? "mh"
                  : searchParams.get("skincare-flow") === "1"
                    ? "skincare"
                    : savedProducts.flowType || "ed"; // Use saved flow type or default to "ed"

        logger.log(
          "Using flow type for direct cart addition after login:",
          flowType
        );

        // Import the appropriate flow function dynamically
        const { addToCartDirectly } = await import(
          "../../utils/flowCartHandler"
        );

        // Convert legacy saved products to direct cart addition
        const result = await addToCartDirectly(
          savedProducts.mainProduct,
          savedProducts.addons || [],
          flowType,
          { requireConsultation: true }
        );

        // Clear saved products
        clearSavedProducts();

        if (result.success) {
          logger.log("Legacy products converted and added to cart:", result);
          return result.redirectUrl;
        } else {
          logger.error("Failed to convert legacy products:", result.error);
        }
      }
    } catch (error) {
      logger.error("Error handling cross-sell products:", error);
    }

    return null;
  };

  // Validate individual field
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "email":
        if (!value.trim()) {
          error = "Email address is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "password":
        if (!value) {
          error = "Password is required";
        }
        break;
      default:
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    return !error;
  };

  // Handle blur event for field validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  // Validate form before submission
  const validateForm = () => {
    let valid = true;
    const newErrors = { email: "", password: "" };

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      valid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Handle Google OAuth callback (when user returns from OAuth flow)
  useEffect(() => {
    const checkGoogleCallback = async () => {
      const error = searchParams.get("error");
      const googleOAuthProcessing = searchParams.get("google_oauth") === "processing";
      const googleAuthSuccess = searchParams.get("google_auth_success") === "true";

      if (error) {
        logger.error("Google OAuth error:", error);
        toast.error(
          error === "oauth_failed"
            ? "Google sign-in failed. Please try again."
            : error === "authentication_failed"
              ? "Authentication failed. Please try again."
              : decodeURIComponent(error)
        );
        // Remove error from URL
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("error");
        router.replace(`/login-register?${newParams.toString()}`);
        return;
      }

      // If we have the success flag, handle post-login tasks and stay on current page
      // The callback route already redirected us to the target page (home or redirect_to)
      if (googleAuthSuccess) {
        logger.log("Google auth success flag detected, handling post-login tasks");

        // Remove the flag from URL
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("google_auth_success");
        const cleanUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
        router.replace(cleanUrl);

        // Handle post-login tasks in background
        (async () => {
          // Fetch user profile
          try {
            const profileResponse = await fetch("/api/profile");
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success) {
                logger.log("User profile fetched after Google login");
              }
            }
          } catch (profileError) {
            logger.error("Error fetching profile:", profileError);
          }

          // Show success message
          toast.success("You logged in successfully with Google");

          // Merge guest cart if sessionId exists
          try {
            const sessionId = getSessionId();
            if (sessionId) {
              logger.log("Merging guest cart after Google login...");
              setIsMigratingCart(true);

              const mergeResult = await mergeGuestCart(sessionId);

              if (mergeResult.success && mergeResult.merged) {
                logger.log("Guest cart merged successfully:", mergeResult);
                document.getElementById("cart-refresher")?.click();
                const cartUpdatedEvent = new CustomEvent("cart-updated");
                document.dispatchEvent(cartUpdatedEvent);
              } else {
                logger.warn("Cart merge failed or not needed:", mergeResult);
              }
            } else {
              logger.log("No sessionId found, skipping cart merge");
            }
          } catch (mergeError) {
            logger.error("Error merging cart:", mergeError);
          } finally {
            setIsMigratingCart(false);
          }

          // Handle cross-sell products - if there are any, redirect to checkout
          const redirectPath = await handleCrossSellProducts();
          if (redirectPath) {
            logger.log("Cross-sell products found, redirecting to:", redirectPath);
            setTimeout(() => {
              router.push(redirectPath);
              setTimeout(() => router.refresh(), 300);
            }, 1500);
          }
        })();

        return;
      }

      // Check if we're waiting for Google OAuth processing
      if (googleOAuthProcessing) {
        logger.log("Google OAuth processing - checking for tokens...");

        // Poll for authToken cookie and verify authentication
        let attempts = 0;
        const maxAttempts = 20; // Increased to 20 attempts (10 seconds total)
        const checkInterval = setInterval(async () => {
          attempts++;

          // Check for authToken cookie
          const hasAuthToken = document.cookie.includes("authToken=");

          // Also verify by calling the profile API
          let isAuthenticated = false;
          if (hasAuthToken) {
            try {
              const profileResponse = await fetch("/api/profile");
              isAuthenticated = profileResponse.ok;
            } catch (e) {
              // API call failed, but cookie exists - might still be valid
              isAuthenticated = hasAuthToken;
            }
          }

          if (isAuthenticated || attempts >= maxAttempts) {
            clearInterval(checkInterval);

            if (isAuthenticated) {
              logger.log("Authentication verified, proceeding with login flow");
              // Remove the processing parameter
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.delete("google_oauth");
              router.replace(`/login-register?${newParams.toString()}`);

              // Now trigger the Google login success flow directly
              // This will handle cart migration, cross-sell, and redirect
              setTimeout(async () => {
                // Fetch user profile
                try {
                  const profileResponse = await fetch("/api/profile");
                  if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    if (profileData.success) {
                      logger.log("User profile fetched after Google login");
                    }
                  }
                } catch (profileError) {
                  logger.error("Error fetching profile:", profileError);
                }

                // Show success message
                toast.success("You logged in successfully with Google");

                // Merge guest cart if sessionId exists
                try {
                  const sessionId = getSessionId();
                  if (sessionId) {
                    logger.log("Merging guest cart after Google login...");
                    setIsMigratingCart(true);

                    const mergeResult = await mergeGuestCart(sessionId);

                    if (mergeResult.success && mergeResult.merged) {
                      logger.log("Guest cart merged successfully:", mergeResult);
                      document.getElementById("cart-refresher")?.click();
                      const cartUpdatedEvent = new CustomEvent("cart-updated");
                      document.dispatchEvent(cartUpdatedEvent);
                    } else {
                      logger.warn("Cart merge failed or not needed:", mergeResult);
                    }
                  } else {
                    logger.log("No sessionId found, skipping cart merge");
                  }
                } catch (mergeError) {
                  logger.error("Error merging cart:", mergeError);
                } finally {
                  setIsMigratingCart(false);
                }

                // Handle cross-sell and redirect
                const redirectPath = await handleCrossSellProducts();
                let finalRedirectPath = redirectPath;
                if (!finalRedirectPath) {
                  if (redirectTo) {
                    try {
                      finalRedirectPath = decodeURIComponent(redirectTo);
                    } catch (e) {
                      finalRedirectPath = redirectTo;
                    }
                  } else {
                    finalRedirectPath = "/";
                  }
                }

                logger.log("Final redirect path:", finalRedirectPath);
                setTimeout(() => {
                  router.push(finalRedirectPath);
                  setTimeout(() => router.refresh(), 300);
                }, 1000);
              }, 100);
            } else {
              logger.error("Authentication not verified after waiting");
              toast.error("Authentication failed. Please try logging in again.");
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.delete("google_oauth");
              router.replace(`/login-register?${newParams.toString()}`);
            }
          }
        }, 500); // Check every 500ms

        return;
      }

      // Check if we just returned from Google OAuth (has authToken cookie)
      // Only check this if we don't have the success flag (to avoid duplicate processing)
      if (!googleAuthSuccess && !googleOAuthProcessing) {
        const hasAuthToken = document.cookie.includes("authToken=");

        if (hasAuthToken) {
          logger.log("Google OAuth callback detected, user authenticated");

          // Fetch user info from backend to ensure all cookies are set
          try {
            const profileResponse = await fetch("/api/profile");
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success) {
                logger.log("User profile fetched after Google login");
              }
            }
          } catch (profileError) {
            logger.error("Error fetching profile after Google login:", profileError);
            // Continue anyway - cookies might already be set
          }

          // Show success message
          toast.success("You logged in successfully with Google");

          // Merge guest cart if sessionId exists
          try {
            const sessionId = getSessionId();
            if (sessionId) {
              logger.log("Merging guest cart after Google login...");
              setIsMigratingCart(true);

              const mergeResult = await mergeGuestCart(sessionId);

              if (mergeResult.success && mergeResult.merged) {
                logger.log("Guest cart merged successfully:", mergeResult);
                document.getElementById("cart-refresher")?.click();
                const cartUpdatedEvent = new CustomEvent("cart-updated");
                document.dispatchEvent(cartUpdatedEvent);
              } else {
                logger.warn("Cart merge failed or not needed:", mergeResult);
              }
            } else {
              logger.log("No sessionId found, skipping cart merge");
            }
          } catch (mergeError) {
            logger.error("Error merging cart:", mergeError);
          } finally {
            setIsMigratingCart(false);
          }

          // Handle cross-sell products
          const redirectPath = await handleCrossSellProducts();

          // Determine final redirect - default to home page
          let finalRedirectPath = redirectPath;
          if (!finalRedirectPath) {
            if (redirectTo) {
              try {
                finalRedirectPath = decodeURIComponent(redirectTo);
              } catch (e) {
                logger.error("Error decoding redirectTo URL:", e);
                finalRedirectPath = redirectTo;
              }
            } else {
              // Always default to home page
              finalRedirectPath = "/";
            }
          }

          logger.log("Final redirect path after Google login:", finalRedirectPath);

          // Small delay to show toast, then navigate smoothly to home page
          setTimeout(() => {
            router.push(finalRedirectPath || "/");
            setTimeout(() => {
              router.refresh();
            }, 300);
          }, 1000);
        }
      }
    };

    checkGoogleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleGoogleError = () => {
    toast.error("Google sign-in was unsuccessful. Please try again.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    // Execute reCAPTCHA v3 (invisible, gets token automatically)
    let token = null;
    try {
      token = await recaptchaRef.current?.execute("login");
      if (!token) {
        toast.error("reCAPTCHA verification failed. Please try again.");
        return;
      }
    } catch (error) {
      logger.error("reCAPTCHA execution error:", error);
      toast.error("reCAPTCHA verification failed. Please try again.");
      return;
    }

    setSubmitting(true);

    try {
      // Get sessionId from localStorage or URL params for guest cart merging
      let sessionId = getSessionId();
      
      // Fallback: Check URL params for sessionId (in case it was passed from redirect)
      if (!sessionId && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSessionId = urlParams.get("sessionId");
        if (urlSessionId) {
          sessionId = urlSessionId;
          // Store it in localStorage for future use
          const { setSessionId } = await import("@/services/sessionService");
          setSessionId(sessionId);
        }
      }

      // Prepare request body
      const requestBody = {
        email: formData.email,
        password: formData.password,
        recaptchaToken: token,
      };

      // Include sessionId if available
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        },
        body: JSON.stringify(requestBody),
      });

      // Parse the response data
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        logger.error("Error parsing response:", parseError);
        toast.error("Unable to connect to the server. Please try again later.");
        setSubmitting(false);
        return;
      }

      // Log the response for debugging (without causing errors if data is null)
      logger.log("Login response:", {
        status: res.status,
        data: data || "No data",
      });

      if (res.ok && data.success) {
        logger.log("Login successful:", data.data);

        // Show success message
        const userName = data.data?.user?.firstName || "";
        if (userName) {
          toast.success(`You logged in successfully, ${userName}`);
        } else {
          toast.success("You logged in successfully");
        }

        // Handle cart merging
        // The API may merge automatically when sessionId is provided, but we'll explicitly merge as well
        let cartMerged = data.data?.cart?.merged || false;

        // If cart wasn't merged automatically and we have a sessionId, merge it explicitly
        if (!cartMerged && sessionId) {
          try {
            logger.log("Cart not merged automatically, merging explicitly...");
            setIsMigratingCart(true);

            const mergeResult = await mergeGuestCart(sessionId);

            if (mergeResult.success && mergeResult.merged) {
              logger.log("Guest cart merged successfully:", mergeResult);
              cartMerged = true;
            } else {
              logger.warn("Cart merge failed or not needed:", mergeResult);
            }
          } catch (mergeError) {
            logger.error("Error merging cart:", mergeError);
            // Don't block login flow if merge fails
          } finally {
            setIsMigratingCart(false);
          }
        } else if (cartMerged) {
          logger.log("Guest cart was automatically merged into user cart");
        }

        // Refresh the cart display after merge
        if (cartMerged) {
          document.getElementById("cart-refresher")?.click();
          const cartUpdatedEvent = new CustomEvent("cart-updated");
          document.dispatchEvent(cartUpdatedEvent);
        }

        // Clear sessionId after successful login and cart merge
        // SessionId is no longer needed since user is authenticated
        if (sessionId) {
          try {
            const { clearSessionId } = await import("@/services/sessionService");
            clearSessionId();
            logger.log("SessionId cleared after successful login");
          } catch (error) {
            logger.warn("Could not clear sessionId after login:", error);
          }
        }

        // Small delay to ensure cart operations have time to complete
        if (redirectTo && redirectTo.includes("/checkout")) {
          logger.log(
            "Waiting for cart operations to complete before checkout redirect..."
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Determine the redirect path after successful login
        let redirectPath;

        // Always check for saved products from cross-sell flows
        redirectPath = await handleCrossSellProducts();

        // If no redirect from cross-sell processing, use the provided redirect_to parameter
        if (!redirectPath) {
          if (redirectTo) {
            try {
              // Decode the redirectTo URL if it's encoded
              redirectPath = decodeURIComponent(redirectTo);
              logger.log("Decoded redirectTo:", redirectPath);
            } catch (e) {
              logger.error("Error decoding redirectTo URL:", e);
              redirectPath = redirectTo; // Use as-is if decoding fails
            }
          } else {
            // If no redirect_to parameter, check for flow-specific parameters
            const isFlow =
              searchParams.get("ed-flow") === "1" ||
              searchParams.get("wl-flow") === "1" ||
              searchParams.get("hair-flow") === "1" ||
              searchParams.get("mh-flow") === "1" ||
              searchParams.get("skincare-flow") === "1";

            if (isFlow) {
              // For flow-specific logins without a redirect_to parameter,
              // preserve all URL parameters when redirecting to checkout
              const params = new URLSearchParams(searchParams.toString());

              // Get all the cart-related parameters
              const cartParams = Array.from(params.entries()).filter(
                ([key]) =>
                  key.includes("onboarding-add-to-cart") ||
                  key.includes("convert_to_sub") ||
                  key.includes("dose_") ||
                  key.includes("quantity") ||
                  key.includes("add-product-subscription") ||
                  key.includes("variation_") ||
                  key.includes("ed-flow") ||
                  key.includes("wl-flow") ||
                  key.includes("hair-flow") ||
                  key.includes("mh-flow") ||
                  key.includes("skincare-flow")
              );

              // Create a new URLSearchParams for checkout
              const checkoutParams = new URLSearchParams();
              cartParams.forEach(([key, value]) => {
                checkoutParams.append(key, value);
              });

              redirectPath = `/checkout?${checkoutParams.toString()}`;
              logger.log(
                "Created checkout URL with flow parameters:",
                redirectPath
              );
            } else {
              // Default redirect to home
              redirectPath = "/";
            }
          }
        }

        logger.log("Final redirect path:", redirectPath);

        // Add a small delay to ensure the success toast is visible before navigation
        setTimeout(() => {
          // Use Next.js navigation for consistent behavior across all environments
          router.push(redirectPath);

          setTimeout(() => {
            router.refresh();
          }, 300);
        }, 1500); // 1.5 second delay to show the success toast

        // Reset reCAPTCHA on success
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setRecaptchaToken("");
      } else {
        // Handle error responses
        let errorMessage =
          "Login failed. Please check your email and password and try again.";

        // Extract error message from response
        if (data?.error) {
          errorMessage = data.error;
        } else if (data?.message) {
          errorMessage = data.message;
        }

        // Handle specific error cases and map to field errors
        if (res.status === 401) {
          errorMessage =
            "Invalid email or password. Please check your credentials and try again.";
          // Set field errors
          setErrors((prev) => ({
            ...prev,
            email: "Invalid email or password",
            password: "Invalid email or password",
          }));
        } else {
          // Map API errors to specific fields
          const errorLower = errorMessage.toLowerCase();
          if (errorLower.includes("email")) {
            setErrors((prev) => ({
              ...prev,
              email: errorMessage,
            }));
          } else if (errorLower.includes("password")) {
            setErrors((prev) => ({
              ...prev,
              password: errorMessage,
            }));
          }
        }

        toast.error(errorMessage);
        logger.error("Login error:", data);

        // Clear password field on error
        setFormData((prev) => ({
          ...prev,
          password: "",
        }));

        // Reset reCAPTCHA on error
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setRecaptchaToken("");
      }
    } catch (err) {
      // Handle any unexpected errors during the fetch operation
      logger.error("Login exception:", err);
      toast.error("An error occurred during login. Please try again later.");
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <CartMigrationOverlay show={isMigratingCart} />
      <div className="px-3 mx-auto pt-5 text-center">
        <h2 className="text-[#251f20] text-[32px] headers-font font-[450] leading-[44.80px]">
          Sign in to your account
        </h2>
        <h3 className="text-sm text-center font-normal pt-2 tracking-normal">
          Don't have an account?
          <Link
            href={(() => {
              const currentParams = new URLSearchParams(
                searchParams.toString()
              );
              currentParams.set("viewshow", "register");
              return `/login-register?${currentParams.toString()}`;
            })()}
            className="font-[400] text-[#AE7E56] underline ml-1"
          >
            Sign up
          </Link>
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col flex-wrap items-center justify-center mx-auto py-3 px-8 pt-5 w-[100%] max-w-[400px] space-y-4">
          <div className="w-full flex flex-col items-start justify-center gap-2">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.email ? "border-red-500" : "border-gray-500"
                }`}
              tabIndex="1"
              autoComplete="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              style={{ outlineColor: "black" }}
            />
            {errors.email && (
              <span className="text-red-500 text-sm">{errors.email}</span>
            )}
          </div>
          <div className="w-full flex flex-col items-start justify-center gap-2 password-field">
            <div className="flex flex-row justify-between items-center w-full">
              <label htmlFor="password">Password</label>
              {/* <Link
                href="/forgot-password"
                className="text-xs text-[#AE7E56] font-normal underline"
              >
                Forgot Password?
              </Link> */}
            </div>
            <div className="w-full relative items-center">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                name="password"
                className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.password ? "border-red-500" : "border-gray-500"
                  }`}
                tabIndex="2"
                autoComplete="off"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ outlineColor: "black" }}
              />
              {showPassword ? (
                <MdOutlineVisibilityOff
                  size={16}
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={togglePasswordVisibility}
                  aria-label="Hide password"
                />
              ) : (
                <MdOutlineRemoveRedEye
                  size={16}
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={togglePasswordVisibility}
                  aria-label="Show password"
                />
              )}
            </div>
            {errors.password && (
              <span className="text-red-500 text-sm">{errors.password}</span>
            )}
          </div>
          <div className="quiz-option flex w-full py-2 items-center justify-between">
            <div className="basis-1/2">
              <label
                htmlFor="rememberme"
                className=" text-left text-sm text-[#212121] flex items-center"
              >
                <input
                  type="checkbox"
                  id="rememberme"
                  className="rounded border-gray-500 relative"
                  name="rememberme"
                  value="1"
                  tabIndex="3"
                  onChange={handleChange}
                />
                &nbsp;Remember me
              </label>
            </div>
            <div className="basis-1/2">
              <Link
                href={`/forgot-password${redirectTo ? "?redirect_to=" + redirectTo : ""
                  }${isEdFlow ? (redirectTo ? "&" : "?") + "ed-flow=1" : ""}`}
                className="text-[#AE7E56] text-sm font-normal block text-right underline"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <ReCaptcha
            ref={recaptchaRef}
            siteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
            onVerify={(token) => {
              setRecaptchaToken(token);
            }}
            onError={(error) => {
              logger.error("reCAPTCHA error:", error);
              toast.error("reCAPTCHA verification failed. Please try again.");
            }}
          />

          <div className="w-full flex justify-center items-center my-5">
            <button
              type="submit"
              className="bg-black text-white py-[12.5px] w-full rounded-full"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center justify-center gap-4 my-4">
            <div className="h-[1px] bg-gray-300 flex-1"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="h-[1px] bg-gray-300 flex-1"></div>
          </div>

          {/* Google Sign-In Button */}
          <div className="w-full flex justify-center items-center">
            <GoogleSignInButton
              onError={handleGoogleError}
              disabled={submitting}
              isLoading={submitting}
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default function Login({ setActiveTab, loginRef }) {
  return (
    <div suppressHydrationWarning>
      <Suspense fallback={<Loader />}>
        <LoginContent setActiveTab={setActiveTab} loginRef={loginRef} />
      </Suspense>
    </div>
  );
}
