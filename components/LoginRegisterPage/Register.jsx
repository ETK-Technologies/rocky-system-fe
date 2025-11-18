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
import { getSessionId } from "@/services/sessionService";
import { mergeGuestCart } from "@/lib/api/cartMerge";
import {
  getSavedProducts,
  clearSavedProducts,
} from "../../utils/crossSellCheckout";
import { processSavedFlowProducts } from "../../utils/flowCartHandler";
import DOBInput from "@/components/shared/DOBInput";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [provincesError, setProvincesError] = useState("");
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

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, "");

    if (phoneNumber.length <= 3) {
      return `(${phoneNumber}`;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
        3,
        6
      )}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formattedPhoneNumber = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({
      ...prev,
      phone: formattedPhoneNumber,
    }));

    // Clear validation error when user types
    if (errors.phone) {
      setErrors((prev) => ({
        ...prev,
        phone: "",
      }));
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
          const phoneDigits = value.replace(/\D/g, "");
          if (phoneDigits.length < 10) {
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
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
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
        const phoneDigits = formData.phone.replace(/\D/g, "");
        if (phoneDigits.length < 10) {
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
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
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

  const handleContinue = () => {
    if (validateStep(1)) {
      setCurrentStep(2);
      // Fetch provinces if not already loaded
      if (provinces.length === 0 && !loadingProvinces) {
        fetchProvinces();
      }
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

    setLoading(true);

    try {
      // Get sessionId from localStorage for guest cart merging
      const sessionId = getSessionId();

      // Prepare request body
      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone.replace(/\D/g, ""), // Remove formatting for API
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        province: formData.province,
      };

      // Include sessionId if available
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
          "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        logger.log("Registration successful:", data.data);
        document.getElementById("cart-refresher")?.click();
        toast.success(data.message || "You registered successfully!");

        // Check if we came from a cross-sell popup
        const isFromCrossSell =
          searchParams.get("ed-flow") === "1" ||
          searchParams.get("wl-flow") === "1" ||
          searchParams.get("hair-flow") === "1" ||
          searchParams.get("mh-flow") === "1";

        // Handle cart merging
        // The API may merge automatically when sessionId is provided, but we'll explicitly merge as well
        let cartMerged = data.data?.cart?.merged || false;

        // If cart wasn't merged automatically and we have a sessionId, merge it explicitly
        if (!cartMerged && sessionId) {
          try {
            logger.log("Cart not merged automatically, merging explicitly...");

            const mergeResult = await mergeGuestCart(sessionId);

            if (mergeResult.success && mergeResult.merged) {
              logger.log("Guest cart merged successfully:", mergeResult);
              cartMerged = true;
            } else {
              logger.warn("Cart merge failed or not needed:", mergeResult);
            }
          } catch (mergeError) {
            logger.error("Error merging cart:", mergeError);
            // Don't block registration flow if merge fails
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

        // Small delay to ensure everything is processed
        if (redirectTo && redirectTo.includes("/checkout")) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

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
      } else {
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
          errorMessage = "This email is already registered. Please login instead.";
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
            } else if (errorLower.includes("first name") || errorLower.includes("firstName")) {
              setErrors((prev) => ({
                ...prev,
                firstName: data.error,
              }));
            } else if (errorLower.includes("last name") || errorLower.includes("lastName")) {
              setErrors((prev) => ({
                ...prev,
                lastName: data.error,
              }));
            } else if (errorLower.includes("date of birth") || errorLower.includes("dateofbirth") || errorLower.includes("dob")) {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 mx-auto pt-5 text-center">
      <h2
        className={`text-[#251f20] ${isEdFlow ? "text-[24px]" : "text-[32px]"
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
            const currentParams = new URLSearchParams(
              searchParams.toString()
            );
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
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.firstName ? "border-red-500" : "border-gray-500"
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
                    <span className="text-red-500 text-sm">{errors.firstName}</span>
                  )}
                </div>
                <div className="w-full flex flex-col items-start justify-center gap-2">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.lastName ? "border-red-500" : "border-gray-500"
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
                    <span className="text-red-500 text-sm">{errors.lastName}</span>
                  )}
                </div>
              </div>
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
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.password ? "border-red-500" : "border-gray-500"
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
                  <span className="text-red-500 text-sm">{errors.password}</span>
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
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.confirmPassword ? "border-red-500" : "border-gray-500"
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
                  className="bg-black text-white py-[12.5px] w-full rounded-full flex justify-center items-center transition-opacity hover:opacity-90"
                  disabled={loading}
                >
                  Continue
                  {!loading && <MdArrowForward className="ml-2" size={20} />}
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

              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.phone ? "border-red-500" : "border-gray-500"
                    }`}
                  placeholder="(___) ___-____"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onBlur={(e) => validateField("phone", e.target.value)}
                  style={{ outlineColor: "black" }}
                  required
                  maxLength={14}
                />
                {errors.phone && (
                  <span className="text-red-500 text-sm">{errors.phone}</span>
                )}
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
                  className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent ${errors.dateOfBirth ? "border-red-500" : "border-gray-500"
                    }`}
                  placeholder="mm/dd/yyyy"
                  minAge={18}
                  required
                  name="dateOfBirth"
                  id="dateOfBirth"
                />
                {errors.dateOfBirth && (
                  <span className="text-red-500 text-sm">{errors.dateOfBirth}</span>
                )}
              </div>

              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="province">State</label>
                <div className="relative w-full">
                  <select
                    id="province"
                    name="province"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent appearance-none bg-white ${errors.province ? "border-red-500" : "border-gray-500"
                      } ${loadingProvinces ? "opacity-50 cursor-not-allowed" : ""}`}
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
                  <span className="text-red-500 text-sm">{errors.province}</span>
                )}
              </div>

              <div className="w-full flex flex-col items-start justify-center gap-2">
                <label htmlFor="gender">Gender</label>
                <div className="relative w-full">
                  <select
                    id="gender"
                    name="gender"
                    className={`block w-[100%] rounded-[8px] h-[40px] text-md m-auto border px-4 focus:outline focus:outline-2 focus:outline-black focus:ring-0 focus:border-transparent appearance-none bg-white ${errors.gender ? "border-red-500" : "border-gray-500"
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
