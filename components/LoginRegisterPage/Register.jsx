"use client";

import { useState, Suspense, useEffect } from "react";
import { logger } from "@/utils/devLogger";
import Link from "next/link";
import {
  MdOutlineRemoveRedEye,
  MdOutlineVisibilityOff,
  MdArrowForward,
  MdArrowBack,
} from "react-icons/md";
import { toast } from "react-toastify";
import { useSearchParams, useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import {
  getSavedProducts,
  clearSavedProducts,
} from "../../utils/crossSellCheckout";
import { processSavedFlowProducts } from "../../utils/flowCartHandler";
import DOBInput from "@/components/shared/DOBInput";
import { getSessionId, clearSessionId } from "@/services/sessionService";
import PhoneInput from "@/components/shared/PhoneInput";
import ReCaptcha from "@/components/shared/ReCaptcha";
import { useRef } from "react";

const RegisterContent = ({ setActiveTab, registerRef }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    province: "",
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    province: "",
  });
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [provincesError, setProvincesError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptchaRef = useRef(null);
  const redirectTo = searchParams.get("redirect_to");
  const isEdFlow = searchParams.get("ed-flow") === "1";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Fetch provinces when component mounts or when step 2 is reached
  useEffect(() => {
    if (currentStep === 2 && provinces.length === 0 && !loadingProvinces) {
      fetchProvinces();
    }
  }, [currentStep]);

  const fetchProvinces = async () => {
    setLoadingProvinces(true);
    setProvincesError("");
    try {
      const response = await fetch("/api/provinces");
      const data = await response.json();

      if (data.success && data.data) {
        setProvinces(data.data);
      } else {
        setProvincesError("Failed to load provinces. Please try again.");
        toast.error("Failed to load provinces");
      }
    } catch (error) {
      logger.error("Error fetching provinces:", error);
      setProvincesError("Failed to load provinces. Please try again.");
      toast.error("Failed to load provinces");
    } finally {
      setLoadingProvinces(false);
    }
  };

  const handlePhoneChange = (e) => {
    // PhoneInput returns value in E.164 format (e.g., +1234567890)
    const phoneValue = e.target.value || "";
    setFormData((prev) => ({
      ...prev,
      phone: phoneValue,
    }));

    // Clear validation error when user types
    if (errors.phone) {
      setErrors((prev) => ({
        ...prev,
        phone: "",
      }));
    }

    // Validate phone number on change
    if (phoneValue) {
      validateField("phone", phoneValue);
    }
  };

  // Validate individual field
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "firstName":
        if (!value.trim()) {
          error = "First name is required";
        }
        break;
      case "lastName":
        if (!value.trim()) {
          error = "Last name is required";
        }
        break;
      case "email":
        if (!value.trim()) {
          error = "Email address is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "phone":
        if (!value.trim()) {
          error = "Phone number is required";
        } else {
          // PhoneInput returns E.164 format (e.g., +1234567890)
          // Validate that it's a valid international phone number
          const phoneDigits = value.replace(/[^\d]/g, "");
          // E.164 format: country code (1-3 digits) + national number (varies by country)
          // Minimum would be country code + at least 7 digits for most countries
          if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            error = "Please enter a valid phone number";
          }
        }
        break;
      case "password":
        if (!value) {
          error = "Password is required";
        } else if (value.length < 6) {
          error = "Password must be at least 6 characters";
        }
        break;
      case "confirmPassword":
        if (!value) {
          error = "Please confirm your password";
        } else if (formData.password !== value) {
          error = "Passwords do not match";
        }
        break;
      case "dateOfBirth":
        if (!value || !value.trim()) {
          error = "Date of birth is required";
        } else {
          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            error = "Please enter a valid date";
          } else {
            // Check if user is at least 18 years old
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (
              monthDiff < 0 ||
              (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ) {
              age--;
            }
            if (age < 18) {
              error = "You must be at least 18 years old";
            }
          }
        }
        break;
      case "gender":
        if (!value || !value.trim()) {
          error = "Gender is required";
        }
        break;
      case "province":
        if (!value || !value.trim()) {
          error = "Province is required";
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

    // Special handling for confirm password - also validate if password changed
    if (name === "confirmPassword") {
      validateField(name, value);
      // Also re-validate password if confirm password has an error
      if (formData.password && formData.password !== value) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      }
    } else {
      validateField(name, value);

      // If password field is blurred and confirm password has value, re-validate confirm password
      if (name === "password" && formData.confirmPassword) {
        validateField("confirmPassword", formData.confirmPassword);
      }
    }
  };

  const validateStep = (step) => {
    let valid = true;
    const newErrors = { ...errors };

    if (step === 1) {
      // Validate step 1 fields
      if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
        valid = false;
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
        valid = false;
      }

      if (!formData.email.trim()) {
        newErrors.email = "Email address is required";
        valid = false;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
        valid = false;
      }

      if (!formData.password) {
        newErrors.password = "Password is required";
        valid = false;
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
        valid = false;
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
        valid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        valid = false;
      }
    } else if (step === 2) {
      // Validate step 2 fields
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
        valid = false;
      } else {
        // PhoneInput returns E.164 format (e.g., +1234567890)
        const phoneDigits = formData.phone.replace(/[^\d]/g, "");
        // E.164 format validation: country code (1-3 digits) + national number
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
          newErrors.phone = "Please enter a valid phone number";
          valid = false;
        }
      }

      if (!formData.dateOfBirth || !formData.dateOfBirth.trim()) {
        newErrors.dateOfBirth = "Date of birth is required";
        valid = false;
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formData.dateOfBirth)) {
          newErrors.dateOfBirth = "Please enter a valid date";
          valid = false;
        } else {
          const birthDate = new Date(formData.dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
          if (age < 18) {
            newErrors.dateOfBirth = "You must be at least 18 years old";
            valid = false;
          }
        }
      }

      if (!formData.gender || !formData.gender.trim()) {
        newErrors.gender = "Gender is required";
        valid = false;
      }

      if (!formData.province || !formData.province.trim()) {
        newErrors.province = "Province is required";
        valid = false;
      }
    }

    setErrors(newErrors);

    // Show toast for first error if validation fails
    if (!valid) {
      const firstError = Object.values(newErrors).find((error) => error);
      if (firstError) {
        toast.error(firstError);
      }
    }

    return valid;
  };

  const checkEmailAvailability = async (email) => {
    try {
      setCheckingEmail(true);
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      return data;
    } catch (error) {
      logger.error("Error checking email availability:", error);
      // If the check fails, we'll allow them to continue
      // The final registration will catch duplicate emails
      return { success: true, exists: false };
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleContinue = async () => {
    if (!validateStep(1)) {
      return;
    }

    // Check if email already exists before proceeding
    const emailCheck = await checkEmailAvailability(formData.email);

    if (emailCheck.exists) {
      const errorMessage =
        "This email is already registered. Please login instead.";
      setErrors((prev) => ({
        ...prev,
        email: errorMessage,
      }));
      toast.error(errorMessage);
      return;
    }

    // Email is available, proceed to step 2
    setCurrentStep(2);
    // Fetch provinces if not already loaded
    if (provinces.length === 0 && !loadingProvinces) {
      fetchProvinces();
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleCrossSellProducts = async (isFromCrossSell = false) => {
    try {
      logger.log(
        `Processing flow products after registration. From cross-sell: ${isFromCrossSell}`
      );

      // First, check for new flow products (direct cart approach)
      const flowProductsResult = await processSavedFlowProducts();
      if (flowProductsResult.success) {
        logger.log(
          "Processed saved flow products after registration:",
          flowProductsResult
        );
        return flowProductsResult.redirectUrl;
      }

      // Only process old cross-sell products if NOT from a cross-sell popup
      if (!isFromCrossSell) {
        const savedProducts = getSavedProducts();

        if (savedProducts) {
          const products = [
            {
              id: savedProducts.mainProduct.id,
              quantity: 1,
            },
            ...savedProducts.addons.map((addon) => ({
              id: addon.id,
              quantity: 1,
            })),
          ];

          const response = await fetch("/api/cart/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ products }),
          });

          if (!response.ok) {
            logger.error("Failed to add cross-sell products to cart");
          }

          clearSavedProducts();

          return "/checkout?ed-flow=1";
        }
      }
    } catch (error) {
      logger.error("Error handling cross-sell products:", error);
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If on step 1, validate and move to step 2
    if (currentStep === 1) {
      handleContinue();
      return;
    }

    // If on step 2, validate and submit
    if (!validateStep(2)) {
      return;
    }

    // Execute reCAPTCHA v3 (invisible, gets token automatically)
    let token = null;
    try {
      token = await recaptchaRef.current?.execute("register");
      if (!token) {
        toast.error("reCAPTCHA verification failed. Please try again.");
        return;
      }
    } catch (error) {
      logger.error("reCAPTCHA execution error:", error);
      toast.error("reCAPTCHA verification failed. Please try again.");
      return;
    }

    setLoading(true);

    try {
      // Get sessionId for guest cart migration - backend will merge guest cart into authenticated user's cart
      const sessionId = getSessionId(); // This will auto-generate if it doesn't exist (but should exist if user added items)

      // Prepare request body
      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone, // PhoneInput already provides E.164 format (e.g., +1234567890)
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        province: formData.province,
        recaptchaToken: token,
      };

      // Include sessionId if available - backend will use it to migrate guest cart
      if (sessionId) {
        requestBody.sessionId = sessionId;
        logger.log(
          "Including sessionId in register request for cart migration:",
          sessionId
        );
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        logger.log("Registration successful:", data.data);
        document.getElementById("cart-refresher")?.click();
        toast.success(data.message || "You registered successfully!");

        // Clear sessionId after successful registration - authenticated users don't need it
        // Cart services will now use authentication instead of sessionId
        try {
          clearSessionId();
          logger.log(
            "SessionId cleared after successful registration - now using authentication for cart"
          );
        } catch (error) {
          logger.warn("Could not clear sessionId after registration:", error);
        }

        // Check if we came from a cross-sell popup
        const isFromCrossSell =
          searchParams.get("ed-flow") === "1" ||
          searchParams.get("wl-flow") === "1" ||
          searchParams.get("hair-flow") === "1" ||
          searchParams.get("mh-flow") === "1";

        // Refresh the cart display
        document.getElementById("cart-refresher")?.click();
        const cartUpdatedEvent = new CustomEvent("cart-updated");
        document.dispatchEvent(cartUpdatedEvent);

        let redirectPath;

        // Always check for saved flow products
        redirectPath = await handleCrossSellProducts(isFromCrossSell);

        if (!redirectPath) {
          redirectPath = redirectTo || "/";
        }

        router.push(redirectPath);
        setTimeout(() => {
          router.refresh();
        }, 300);

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          dateOfBirth: "",
          gender: "",
          province: "",
        });
        setCurrentStep(1);
        // Reset reCAPTCHA on success
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setRecaptchaToken("");
      } else {
        // Reset reCAPTCHA on error
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setRecaptchaToken("");
        logger.log("Register API Error Response:", {
          status: res.status,
          ok: res.ok,
          data: data,
          error: data.error,
        });

        // Extract error message
        let errorMessage =
          data.error || "Registration failed. Please check and try again.";

        // Handle specific error cases and map to field errors
        if (res.status === 409) {
          errorMessage =
            "This email is already registered. Please login instead.";
          setErrors((prev) => ({
            ...prev,
            email: "This email is already registered",
          }));
        } else if (res.status === 400) {
          // Try to extract field-specific errors
          if (data.error) {
            errorMessage = data.error;

            // Map common API errors to specific fields
            const errorLower = data.error.toLowerCase();
            if (errorLower.includes("email")) {
              setErrors((prev) => ({
                ...prev,
                email: data.error,
              }));
            } else if (errorLower.includes("password")) {
              setErrors((prev) => ({
                ...prev,
                password: data.error,
              }));
            } else if (errorLower.includes("phone")) {
              setErrors((prev) => ({
                ...prev,
                phone: data.error,
              }));
            } else if (
              errorLower.includes("first name") ||
              errorLower.includes("firstName")
            ) {
              setErrors((prev) => ({
                ...prev,
                firstName: data.error,
              }));
            } else if (
              errorLower.includes("last name") ||
              errorLower.includes("lastName")
            ) {
              setErrors((prev) => ({
                ...prev,
                lastName: data.error,
              }));
            } else if (
              errorLower.includes("date of birth") ||
              errorLower.includes("dateofbirth") ||
              errorLower.includes("dob")
            ) {
              setErrors((prev) => ({
                ...prev,
                dateOfBirth: data.error,
              }));
            } else if (errorLower.includes("gender")) {
              setErrors((prev) => ({
                ...prev,
                gender: data.error,
              }));
            } else if (errorLower.includes("province")) {
              setErrors((prev) => ({
                ...prev,
                province: data.error,
              }));
            }
          }
        }

        toast.error(errorMessage);
      }
    } catch (err) {
      logger.error("Registration error:", err);
      toast.error(
        "An error occurred during registration. Please try again later."
      );
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 mx-auto pt-5 text-center">
      <h2
        className={`text-[#251f20] ${
          isEdFlow ? "text-[24px]" : "text-[32px]"
        } headers-font font-[450] leading-[140%] max-w-[520px] mx-auto`}
      >
        {isEdFlow ? (
          <>
            Congratulations! <br className="md:hidden" /> You're just moments
            away from making ED a thing of the past.
          </>
        ) : (
          "Welcome to Rocky"
        )}
      </h2>
      <h3 className="text-sm text-center font-normal pt-2 tracking-normal">
        Already have an account?
        <Link
          href={(() => {
            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.set("viewshow", "login");
            return `/login-register?${currentParams.toString()}`;
          })()}
          className="font-[400] text-[#AE7E56] underline ml-1"
        >
          Log in
        </Link>
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col flex-wrap items-center justify-center mx-auto py-3 px-8 pt-5 w-[100%] max-w-[400px] space-y-4">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="w-full space-y-4 transition-all duration-300 ease-in-out">
              <div className="flex flex-col md:flex-row md:gap-2 w-full space-y-4 md:space-y-0">
                <div className="w-full flex flex-col items-start justify-center gap-2">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${
                      errors.firstName ? "border-red-500" : "border-gray-500"
                    }`}
                    tabIndex="1"
                    placeholder="Your first name"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ outlineColor: "black" }}
                    required
                  />
                  {errors.firstName && (
                    <span className="text-red-500 text-sm">
                      {errors.firstName}
                    </span>
                  )}
                </div>
                <div className="w-full flex flex-col items-start justify-center gap-2">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${
                      errors.lastName ? "border-red-500" : "border-gray-500"
                    }`}
                    tabIndex="1"
                    placeholder="Your last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ outlineColor: "black" }}
                    required
                  />
                  {errors.lastName && (
                    <span className="text-red-500 text-sm">
                      {errors.lastName}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${
                    errors.email ? "border-red-500" : "border-gray-500"
                  }`}
                  tabIndex="1"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={{ outlineColor: "black" }}
                  required
                />
                {errors.email && (
                  <span className="text-red-500 text-sm">{errors.email}</span>
                )}
              </div>
              <div className="w-full flex flex-col items-start justify-center gap-2 password-field">
                <label htmlFor="password">Password</label>
                <div className="w-full relative items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Enter your password"
                    name="password"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${
                      errors.password ? "border-red-500" : "border-gray-500"
                    }`}
                    tabIndex="4"
                    autoComplete="off"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ outlineColor: "black" }}
                    required
                    minLength={6}
                  />
                  {showPassword ? (
                    <MdOutlineVisibilityOff
                      size={16}
                      className="absolute right-3 top-3 cursor-pointer"
                      onClick={togglePasswordVisibility}
                    />
                  ) : (
                    <MdOutlineRemoveRedEye
                      size={16}
                      className="absolute right-3 top-3 cursor-pointer"
                      onClick={togglePasswordVisibility}
                    />
                  )}
                </div>
                {errors.password && (
                  <span className="text-red-500 text-sm">
                    {errors.password}
                  </span>
                )}
              </div>
              <div className="w-full flex flex-col items-start justify-center gap-2 password-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="w-full relative items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    name="confirmPassword"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-500"
                    }`}
                    tabIndex="4"
                    autoComplete="off"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ outlineColor: "black" }}
                    required
                  />
                  {showConfirmPassword ? (
                    <MdOutlineVisibilityOff
                      size={16}
                      className="absolute right-3 top-3 cursor-pointer"
                      onClick={toggleConfirmPasswordVisibility}
                    />
                  ) : (
                    <MdOutlineRemoveRedEye
                      size={16}
                      className="absolute right-3 top-3 cursor-pointer"
                      onClick={toggleConfirmPasswordVisibility}
                    />
                  )}
                </div>
                {errors.confirmPassword && (
                  <span className="text-red-500 text-sm">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              <div className="w-full flex justify-center items-center my-5">
                <button
                  type="submit"
                  className="bg-black text-white py-[12.5px] w-full rounded-full flex justify-center items-center transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || checkingEmail}
                >
                  {checkingEmail ? (
                    <>
                      Verifying email...
                      <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </>
                  ) : (
                    <>
                      Continue
                      <MdArrowForward className="ml-2" size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Additional Information */}
          {currentStep === 2 && (
            <div className="w-full space-y-4 transition-all duration-300 ease-in-out">
              <div className="w-full flex items-center mb-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-black transition-colors"
                >
                  <MdArrowBack className="mr-1" size={20} />
                  Back
                </button>
              </div>

              <div className="w-full">
                <PhoneInput
                  title="Phone Number"
                  name="phone"
                  value={formData.phone}
                  required
                  onChange={handlePhoneChange}
                  error={errors.phone}
                  defaultCountry="US"
                />
              </div>

              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <DOBInput
                  value={formData.dateOfBirth}
                  onChange={(value, isFinal) => {
                    setFormData((prev) => ({ ...prev, dateOfBirth: value }));
                    // Validate when final (user finished entering date)
                    if (isFinal) {
                      validateField("dateOfBirth", value);
                    }
                  }}
                  className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${
                    errors.dateOfBirth ? "border-red-500" : "border-gray-500"
                  }`}
                  placeholder="mm/dd/yyyy"
                  minAge={18}
                  required
                  name="dateOfBirth"
                  id="dateOfBirth"
                />
                {errors.dateOfBirth && (
                  <span className="text-red-500 text-sm">
                    {errors.dateOfBirth}
                  </span>
                )}
              </div>

              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="province">State</label>
                <div className="relative w-full">
                  <select
                    id="province"
                    name="province"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent appearance-none bg-white ${
                      errors.province ? "border-red-500" : "border-gray-500"
                    } ${
                      loadingProvinces ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    value={formData.province}
                    onChange={handleChange}
                    onBlur={(e) => validateField("province", e.target.value)}
                    style={{ outlineColor: "black" }}
                    required
                    disabled={loadingProvinces}
                  >
                    <option value="">Select a State</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {loadingProvinces ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                {provincesError && (
                  <span className="text-red-500 text-sm">{provincesError}</span>
                )}
                {errors.province && (
                  <span className="text-red-500 text-sm">
                    {errors.province}
                  </span>
                )}
              </div>

              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="gender">Gender</label>
                <div className="relative w-full">
                  <select
                    id="gender"
                    name="gender"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent appearance-none bg-white ${
                      errors.gender ? "border-red-500" : "border-gray-500"
                    }`}
                    value={formData.gender}
                    onChange={handleChange}
                    onBlur={(e) => validateField("gender", e.target.value)}
                    style={{ outlineColor: "black" }}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {errors.gender && (
                  <span className="text-red-500 text-sm">{errors.gender}</span>
                )}
              </div>

              <ReCaptcha
                ref={recaptchaRef}
                siteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onVerify={(token) => {
                  setRecaptchaToken(token);
                }}
                onError={(error) => {
                  logger.error("reCAPTCHA error:", error);
                  toast.error(
                    "reCAPTCHA verification failed. Please try again."
                  );
                }}
              />

              <div className="w-full flex justify-center items-center my-5">
                <button
                  type="submit"
                  className="bg-black text-white py-[12.5px] w-full rounded-full flex justify-center items-center transition-opacity hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? "Signing up..." : "Complete Sign Up"}
                  {!loading && <MdArrowForward className="ml-2" size={20} />}
                </button>
              </div>
            </div>
          )}

          <div className="w-full text-center text-xs text-gray-600 mb-6 pt-[4rem]">
            <p className="mb-3">
              By continuing, you agree to and have read the{" "}
              <Link href="/terms-of-use" className="text-[#AE7E56] underline">
                Terms and Conditions
              </Link>
              ,{" "}
              <Link href="/terms-of-use" className="text-[#AE7E56] underline">
                Professional Disclosure
              </Link>
              ,{" "}
              <Link href="/privacy-policy" className="text-[#AE7E56] underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms-of-use" className="text-[#AE7E56] underline">
                Telehealth Consent
              </Link>
            </p>
            <p>
              We respect your privacy. All of your information is securely
              stored on our HIPAA Compliant server.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default function Register({ setActiveTab, registerRef }) {
  return (
    <div suppressHydrationWarning>
      <Suspense fallback={<Loader />}>
        <RegisterContent
          setActiveTab={setActiveTab}
          registerRef={registerRef}
        />
      </Suspense>
    </div>
  );
}
