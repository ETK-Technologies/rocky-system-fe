"use client";

import Loader from "@/components/Loader";
import { logger } from "@/utils/devLogger";
import CheckoutSkeleton from "@/components/ui/skeletons/CheckoutSkeleton";
import { useEffect, useState, useRef } from "react";
import BillingAndShipping from "./BillingAndShipping";
import CartAndPayment from "./CartAndPayment";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import {
  processUrlCartParameters,
  cleanupCartUrlParameters,
} from "@/utils/urlCartHandler";
import {
  transformPaymentError,
  isWordPressCriticalError,
  handlePaymentResponse,
  isSuccessfulOrderStatus,
} from "@/utils/paymentErrorHandler";
import {
  isPaymentMethodValid,
  getPaymentValidationMessage,
} from "@/utils/cardValidation";
import QuestionnaireNavbar from "../EdQuestionnaire/QuestionnaireNavbar";
import { getRequiredConsultations } from "@/utils/requiredConsultation";
import {
  checkQuebecZonnicRestriction,
  getQuebecRestrictionMessage,
} from "@/utils/zonnicQuebecValidation";
import useCheckoutValidation from "@/lib/hooks/useCheckoutValidation";
import { checkAgeRestriction } from "@/utils/ageValidation";
import QuebecRestrictionPopup from "../Popups/QuebecRestrictionPopup";
import AgeRestrictionPopup from "../Popups/AgeRestrictionPopup";
import { getAwinFromUrlOrStorage } from "@/utils/awin";
import StripeElementsPayment from "./StripeElementsPayment";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAddressManager } from "@/lib/hooks/useAddressManager";
import { debugAddressData } from "@/utils/addressDebugger";
import { getCurrencyLowerCase } from "@/lib/constants/currency";

// Load Stripe outside component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

// Wrapper component to provide Stripe context
// Using deferred mode - Elements shows immediately with placeholder amount
// The actual amount will come from the PaymentIntent when confirming payment
// Note: Backend creates PaymentIntent with manual capture, so we need to handle this
const CheckoutPageWrapper = () => {
  const [customerEmail, setCustomerEmail] = useState(null);

  // Get current user's email for Stripe Link wallet to show correct user's payment methods
  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const { getUserData } = await import("@/services/userDataService");
        const userData = getUserData();
        if (userData?.user?.email) {
          setCustomerEmail(userData.user.email);
        }
      } catch (error) {
        logger.warn("Failed to load user email for Stripe:", error);
      }
    };
    loadUserEmail();
  }, []);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment", // Payment mode for Payment Element
        amount: 100, // Placeholder amount (1.00 in smallest currency unit)
        // This is required by Stripe but will be overridden by the actual
        // PaymentIntent amount when we confirm payment
        currency: getCurrencyLowerCase(),
        appearance: {
          theme: "stripe",
        },
        paymentMethodCreation: "manual", // Required for createPaymentMethod with PaymentElement
        // Configure payment methods at the Elements level
        // Only "card" - Link will appear as a wallet option (configured in PaymentElement options)
        paymentMethodTypes: ["card"],
        // Set customer email for Stripe Link wallet to show correct user's payment methods
        // Link wallet will use this email to display the appropriate saved payment methods
        ...(customerEmail && {
          customerEmail: customerEmail,
        }),
        // Note: capture_method is set on the PaymentIntent, not Elements
        // We'll need to ensure the PaymentIntent matches Elements expectations
      }}
    >
      <CheckoutPageContent />
    </Elements>
  );
};

const CheckoutPageContent = () => {
  const stripe = useStripe(); // Get the Stripe instance from context
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdFlow = searchParams.get("ed-flow") === "1";
  const isSmokingFlow = searchParams.get("smoking-flow") === "1";
  const onboardingAddToCart = searchParams.get("onboarding-add-to-cart");

  // Keep track of various flow parameters to preserve them after checkout
  const flowParams = {
    "ed-flow": searchParams.get("ed-flow"),
    "wl-flow": searchParams.get("wl-flow"),
    "hair-flow": searchParams.get("hair-flow"),
    "mh-flow": searchParams.get("mh-flow"),
    "smoking-flow": searchParams.get("smoking-flow"),
    "skincare-flow": searchParams.get("skincare-flow"),
  };

  // Build flow query string to append to redirects
  const buildFlowQueryString = () => {
    const params = [];
    Object.entries(flowParams).forEach(([key, value]) => {
      if (value) {
        params.push(`${key}=${value}`);
      }
    });
    return params.length > 0 ? `&${params.join("&")}` : "";
  };

  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState();
  const [isProcessingUrlParams, setIsProcessingUrlParams] = useState(false);

  // Stripe Elements state (for embedded payment form)
  const [stripeElements, setStripeElements] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);

  // Initialize checkout validation hook
  const {
    validationErrors,
    isValidating,
    validateForm,
    clearErrors,
    hasErrors,
    getFieldError,
  } = useCheckoutValidation();

  // Initialize address manager hook
  const {
    isLoadingAddresses,
    populateAddressData,
    saveAddressData,
    clearStoredAddresses,
    fetchProfileData,
  } = useAddressManager();
  const [formData, setFormData] = useState({
    additional_fields: [],
    shipping_address: {},
    billing_address: {},
    extensions: {
      "checkout-fields-for-blocks": {
        _meta_discreet: true,
        _meta_mail_box: true,
      },
    },
    payment_method: "bambora_credit_card",
    payment_data: [
      {
        key: "wc-bambora-credit-card-js-token",
        value: "",
      },
      {
        key: "wc-bambora-credit-card-account-number",
        value: "",
      },
      {
        key: "wc-bambora-credit-card-card-type",
        value: "",
      },
      {
        key: "wc-bambora-credit-card-exp-month",
        value: "",
      },
      {
        key: "wc-bambora-credit-card-exp-year",
        value: "",
      },
    ],
  });

  // Payment validation state
  const [isPaymentValid, setIsPaymentValid] = useState(false);
  const [paymentValidationMessage, setPaymentValidationMessage] = useState("");

  // Validate payment method - Stripe Elements handles validation internally
  useEffect(() => {
    // For Stripe Elements payments, always consider valid
    // (Stripe Elements handles validation internally on submit)
    setIsPaymentValid(true);
    setPaymentValidationMessage("");
  }, []);

  const [showQuebecPopup, setShowQuebecPopup] = useState(false);
  const [showAgePopup, setShowAgePopup] = useState(false);
  const [ageValidationFailed, setAgeValidationFailed] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);

  // Cache profile data to avoid redundant API calls
  const [cachedProfileData, setCachedProfileData] = useState(null);

  // Debounce timer for shipping calculation
  const shippingDebounceTimerRef = useRef(null);

  // Handle province change for real-time Quebec validation and shipping updates
  const handleProvinceChange = async (
    newProvince,
    addressType = "billing",
    shouldClearFields = true
  ) => {
    logger.log("🔄 HANDLE PROVINCE CHANGE CALLED");
    logger.log("newProvince:", newProvince);
    logger.log("addressType:", addressType);
    logger.log("shouldClearFields:", shouldClearFields);
    logger.log(
      "Current formData.billing_address.address_1:",
      formData.billing_address?.address_1
    );
    if (cartItems && cartItems.items) {
      // const restriction = checkQuebecZonnicRestriction(
      //   cartItems.items,
      //   newProvince,
      //   newProvince
      // );

      // if (restriction.blocked) {
      //   setShowQuebecPopup(true);
      //   return;
      // }

      // Check age restriction for Zonnic products
      if (hasZonnicProducts(cartItems.items)) {
        // First check form data (user might have changed date of birth)
        let dateOfBirthToCheck = formData.billing_address.date_of_birth;

        // If no form data, use cached profile data (avoid redundant API call)
        if (!dateOfBirthToCheck && cachedProfileData) {
          dateOfBirthToCheck =
            cachedProfileData.date_of_birth ||
            cachedProfileData.raw_profile_data?.custom_meta?.date_of_birth;
          logger.log(
            "Using cached profile data for age validation (province change):",
            { dateOfBirth: dateOfBirthToCheck }
          );
        }

        // Now validate the date of birth
        if (dateOfBirthToCheck) {
          logger.log(
            "Checking age validation for date (province change):",
            dateOfBirthToCheck
          );
          const ageCheck = checkAgeRestriction(dateOfBirthToCheck, 19);
          logger.log("Age validation result (province change):", ageCheck);
          if (ageCheck.blocked) {
            logger.log(
              "User is too young, showing age popup (province change)"
            );
            setAgeValidationFailed(true);
            setShowAgePopup(true);
            return;
          } else {
            logger.log(
              "User meets age requirement (province change):",
              ageCheck.age
            );
            setAgeValidationFailed(false);
          }
        } else {
          logger.log(
            "No date of birth found in form or profile data (province change)"
          );
        }
      }
    }

    // Update shipping rates when province changes using the new backend API
    // Debounce shipping calculation to avoid excessive API calls
    if (shippingDebounceTimerRef.current) {
      clearTimeout(shippingDebounceTimerRef.current);
    }

    const debouncedShippingCalculation = async () => {
      try {
        setIsUpdatingShipping(true);

        // Get the country and postal code from the appropriate address
        const country =
          addressType === "billing"
            ? formData.billing_address.country || "CA"
            : formData.shipping_address.country || "CA";

        const postalCode =
          addressType === "billing"
            ? formData.billing_address.postcode
            : formData.shipping_address.postcode;

        logger.log("Calculating shipping for province change (debounced):", {
          country,
          state: newProvince,
          postalCode,
          addressType,
        });

        // Call the new shipping calculation API
        const response = await fetch("/api/shipping/calculate-by-cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country,
            state: newProvince,
            postalCode: postalCode || "",
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          logger.log("Shipping options calculated:", result.shippingOptions);

          // Update cart state with new shipping options
          // The backend returns shipping options in the format:
          // [{ methodId, methodType, title, description, cost }]

          // Transform to cart format if needed
          const shippingRates = result.shippingOptions.map((option) => ({
            package_id: 0,
            name: "Shipping",
            destination: {
              address_1: "",
              address_2: "",
              city: "",
              state: newProvince,
              postcode: postalCode || "",
              country: country,
            },
            items: cartItems.items,
            shipping_rates: [
              {
                rate_id: option.methodId,
                name: option.title,
                description: option.description || "",
                delivery_time: "",
                price: (option.cost * 100).toString(), // Convert to cents
                taxes: "0",
                instance_id: 0,
                method_id: option.methodType || "flat_rate",
                meta_data: [],
                selected: true, // Select first option by default
              },
            ],
          }));

          setCartItems((prev) => ({
            ...prev,
            shipping_rates: shippingRates,
          }));

          logger.log("Cart updated with new shipping rates");
        } else {
          logger.error("Error calculating shipping:", result.error);
          toast.error(
            result.error || "Failed to calculate shipping. Please try again."
          );
        }

        // Also update form data to sync UI only if we should clear fields
        if (shouldClearFields) {
          logger.log("Clearing address fields due to province change");

          // IMPORTANT: Only clear fields if we're not in the middle of an address autocomplete selection
          // Check if the current address looks like it was just populated (has meaningful data)
          const hasRecentAddressData =
            formData.billing_address?.address_1 &&
            formData.billing_address?.city &&
            formData.billing_address?.postcode;

          if (hasRecentAddressData) {
            logger.log(
              "🛡️ PREVENTING FIELD CLEARING - Recent address data detected!"
            );
            logger.log("🛡️ Keeping existing address data intact");
            return; // Don't clear fields if we have recent address data
          }

          setFormData((prev) => ({
            ...prev,
            billing_address: {
              ...prev.billing_address,
              ...(addressType === "billing"
                ? {
                    address_1: "",
                    address_2: "",
                    city: "",
                    postcode: "",
                  }
                : {}),
              state:
                addressType === "billing"
                  ? newProvince
                  : prev.billing_address.state || newProvince,
              country: country,
            },
            shipping_address: {
              ...prev.shipping_address,
              ...(addressType === "shipping"
                ? {
                    address_1: "",
                    address_2: "",
                    city: "",
                    postcode: "",
                  }
                : {}),
              state:
                addressType === "shipping"
                  ? newProvince
                  : prev.shipping_address.state || newProvince,
              country: country,
            },
          }));
        }
      } catch (error) {
        logger.error("Error calculating shipping:", error);
        toast.error("Failed to calculate shipping. Please try again.");
      } finally {
        setIsUpdatingShipping(false);
      }
    };

    // Set debounce timer (400ms delay)
    shippingDebounceTimerRef.current = setTimeout(
      debouncedShippingCalculation,
      400
    );
  };

  // Function to check if cart contains Zonnic products
  const hasZonnicProducts = (cartItems) => {
    if (!cartItems || !cartItems.items || !Array.isArray(cartItems.items)) {
      return false;
    }

    return cartItems.items.some((item) => {
      // Check if the product name contains "zonnic" (case insensitive)
      return (
        item &&
        item.name &&
        typeof item.name === "string" &&
        item.name.toString().toLowerCase().includes("zonnic")
      );
    });
  };

  // Function to update URL with smoking-flow parameter
  const updateUrlWithSmokingFlow = () => {
    // Only update if smoking-flow parameter is not already present
    if (!isSmokingFlow) {
      // Create a new URLSearchParams instance from the current search params
      const newParams = new URLSearchParams(window.location.search);
      newParams.set("smoking-flow", "1");

      // Update the URL without triggering a page reload
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({ path: newUrl }, "", newUrl);

      // Update the flowParams object
      flowParams["smoking-flow"] = "1";
    }
  };

  // Function to fetch cart items
  // updateFormData: whether to update billing/shipping addresses in form (default: true)
  const fetchCartItems = async (updateFormData = true) => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();

      // Log cart items to debug what products are actually being added
      logger.log("Cart items received from API:", data.items);

      // If we're coming from ED flow with specific products, verify the products are correct
      if (onboardingAddToCart) {
        const expectedProducts = onboardingAddToCart
          .split("%2C")
          .map((id) => id.trim());
        logger.log("Expected product IDs from URL:", expectedProducts);

        // Check if products match what we expect
        if (data.items && data.items.length > 0) {
          logger.log("First product in cart:", {
            id: data.items[0].id,
            name: data.items[0].name,
            product_id: data.items[0].product_id,
          });
        }
      }

      // Update cart items
      setCartItems(data);

      // --- FLOW CHECKING LOGIC BASED ON LOCALSTORAGE ---
      if (typeof window !== "undefined") {
        const requiredConsultation = getRequiredConsultations();
        if (
          Array.isArray(requiredConsultation) &&
          requiredConsultation.length > 0 &&
          data.items &&
          Array.isArray(data.items)
        ) {
          logger.log("required consultation", requiredConsultation);
          // For each cart item, check if it matches a required consultation
          for (const item of data.items) {
            logger.log("item", item);
            const match = requiredConsultation.find(
              (rc) =>
                String(rc.productId) === String(item.id) ||
                String(rc.productId) === String(item.product_id)
            );
            if (match && match.flowType && !searchParams.get(match.flowType)) {
              // Add the flowType=1 to the URL if not present
              const newParams = new URLSearchParams(window.location.search);
              newParams.set(match.flowType, "1");
              const newUrl = `${
                window.location.pathname
              }?${newParams.toString()}`;
              window.history.replaceState({ path: newUrl }, "", newUrl);
              // Only add the first found flow, break
              break;
            }
          }
        }
      }
      // --- END FLOW CHECKING LOGIC ---

      // Update form data with shipping and billing addresses from cart only if requested
      // This serves as a fallback for guest checkout on initial load
      // For logged-in users, fetchUserProfile will override this with fresh data
      // When refreshing cart (e.g., after adding products), we don't want to overwrite profile data
      if (updateFormData) {
        // Check if user is authenticated - if so, don't let cart override profile data
        const { getUserId } = await import("@/services/userDataService");
        const userId = getUserId();

        logger.log("=== SETTING FORM DATA FROM CART ===", {
          billing_address_1: data.billing_address?.address_1,
          billing_city: data.billing_address?.city,
          billing_state: data.billing_address?.state,
          userAuthenticated: !!userId,
        });

        // For authenticated users, only merge cart data that doesn't conflict with profile
        // For guest users, use cart data fully
        if (!userId) {
          setFormData((prev) => {
            return {
              ...prev,
              billing_address: data.billing_address || prev.billing_address,
              shipping_address: data.shipping_address || prev.shipping_address,
            };
          });
        } else {
          // User is authenticated - merge cart data carefully to not override profile fields
          // Only use cart data for fields that don't exist in profile
          logger.log(
            "User authenticated - carefully merging cart data with profile data"
          );
          setFormData((prev) => {
            // Only merge if prev.billing_address doesn't already have profile data
            const hasProfilePhone =
              prev.billing_address?.phone && prev.billing_address.phone.trim();
            const hasProfileState =
              prev.billing_address?.state && prev.billing_address.state.trim();

            return {
              ...prev,
              billing_address: {
                ...(data.billing_address || {}),
                // Don't override phone/state if profile already has them
                ...(hasProfilePhone
                  ? { phone: prev.billing_address.phone }
                  : {}),
                ...(hasProfileState
                  ? { state: prev.billing_address.state }
                  : {}),
                // But keep any other fields from prev (like from profile)
                ...prev.billing_address,
              },
              shipping_address: data.shipping_address || prev.shipping_address,
            };
          });
        }
      } else {
        logger.log("=== SKIPPING FORM DATA UPDATE FROM CART ===");
      }

      return data;
    } catch (error) {
      logger.error("Error fetching cart items:", error);
      return null;
    }
  };

  // Effect to save address data when formData changes
  useEffect(() => {
    if (formData.billing_address || formData.shipping_address) {
      saveAddressData(formData.billing_address, formData.shipping_address);
    }
  }, [formData.billing_address, formData.shipping_address, saveAddressData]);

  // Track if we've already populated address data to prevent redundant calls
  const [hasPopulatedAddresses, setHasPopulatedAddresses] = useState(false);

  // Effect to populate address data after initial load
  // Only run once after cart and profile are loaded
  useEffect(() => {
    // Only run this after the initial cart and profile data have been loaded
    // AND only if we haven't already populated addresses
    if (
      cartItems &&
      !isProcessingUrlParams &&
      !isLoadingAddresses &&
      !hasPopulatedAddresses
    ) {
      const timer = setTimeout(async () => {
        logger.log("=== POPULATING ADDRESS DATA WITH HOOK ===");
        logger.log("Current formData before population:", {
          billing_address_1: formData.billing_address?.address_1,
          billing_city: formData.billing_address?.city,
          billing_postcode: formData.billing_address?.postcode,
          billing_date_of_birth: formData.billing_address?.date_of_birth,
        });

        const updatedFormData = await populateAddressData(formData);

        // Use deep comparison to check if data actually changed
        const hasChanges =
          JSON.stringify(updatedFormData) !== JSON.stringify(formData);

        if (hasChanges) {
          logger.log("✅ FormData will be updated with address data:", {
            billing_address_1: updatedFormData.billing_address?.address_1,
            billing_city: updatedFormData.billing_address?.city,
            billing_postcode: updatedFormData.billing_address?.postcode,
            billing_date_of_birth:
              updatedFormData.billing_address?.date_of_birth,
          });
          setFormData(updatedFormData);

          // Debug localStorage after update
          setTimeout(() => {
            debugAddressData();
          }, 500);
        } else {
          logger.log("ℹ️ No address data changes detected");
          // Still debug to see what's in localStorage
          debugAddressData();
        }

        // Mark as populated to prevent redundant calls
        setHasPopulatedAddresses(true);
      }, 1000); // Small delay to ensure other data loading is complete

      return () => clearTimeout(timer);
    }
  }, [
    cartItems,
    isProcessingUrlParams,
    isLoadingAddresses,
    hasPopulatedAddresses,
    populateAddressData,
  ]);

  // Saved cards functionality has been removed - all payments now use Stripe Elements

  // Function to fetch user profile data
  // Only fetch once and cache the result to avoid redundant API calls
  const fetchUserProfile = async (forceRefresh = false) => {
    // IMPORTANT: Always verify user is authenticated before using cache
    // This prevents showing previous user's data after logout/login
    const { getUserId } = await import("@/services/userDataService");
    const currentUserId = getUserId();

    // If we have cached data, verify user is still authenticated (authToken is httpOnly, check userId)
    if (cachedProfileData && !forceRefresh) {
      // Check if user is still authenticated
      if (!currentUserId) {
        logger.log("User not authenticated - clearing cached profile data");
        setCachedProfileData(null);
      } else {
        logger.log(
          "Using cached profile data from CheckoutPageContent (user authenticated)"
        );
        return cachedProfileData;
      }
    }

    // If cached but no auth, clear it
    if (cachedProfileData && !currentUserId) {
      logger.log("Clearing cached profile data - user not authenticated");
      setCachedProfileData(null);
    }

    // If not authenticated, don't fetch profile
    if (!currentUserId) {
      logger.log("User not authenticated - skipping profile fetch");
      return null;
    }

    try {
      // Get user name from cookies if available
      const cookies = document.cookie.split(";").reduce((cookies, cookie) => {
        const [name, value] = cookie.trim().split("=");
        cookies[name] = value;
        return cookies;
      }, {});

      // Decode cookie values to prevent URL encoding issues
      const storedFirstName = decodeURIComponent(cookies.displayName || "");
      const storedUserName = decodeURIComponent(cookies.userName || "");

      // Fetch fresh profile data - add timestamp to prevent any caching
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/profile?t=${timestamp}`, {
        // Prevent browser caching
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      const data = await res.json();

      logger.log("=== PROFILE DATA FETCHED ===", {
        timestamp: new Date().toISOString(),
        phone: data.phone,
        province: data.province,
        billing_address_1: data.billing_address_1,
        billing_city: data.billing_city,
        billing_state: data.billing_state,
        billing_postcode: data.billing_postcode,
      });

      if (data.success) {
        logger.log("User profile data fetched successfully from API:", data);

        const profileData = data;

        // Helper function to check if a value is valid (non-empty after trim)
        const isValidValue = (value) => {
          return value && typeof value === "string" && value.trim().length > 0;
        };

        // Update form data with user profile information
        // BUT: Only override cart data if profile has data and cart doesn't (priority to cart)
        logger.log("=== SETTING FORM DATA FROM PROFILE ===");
        logger.log("Profile data phone:", profileData.phone);
        logger.log("Profile data province:", profileData.province);
        setFormData((prev) => {
          // Create updated billing address with user data
          // IMPORTANT: Use prev data (from cart) if it exists and is valid, profile as fallback
          const updatedBillingAddress = {
            ...prev.billing_address,
            // Prioritize existing form data (from cart), then cookies, then profile
            first_name:
              isValidValue(prev.billing_address.first_name) ||
              isValidValue(storedFirstName) ||
              isValidValue(profileData.first_name)
                ? isValidValue(prev.billing_address.first_name)
                  ? prev.billing_address.first_name.trim()
                  : isValidValue(storedFirstName)
                  ? storedFirstName.trim()
                  : profileData.first_name.trim()
                : "",
            last_name:
              isValidValue(prev.billing_address.last_name) ||
              (storedUserName && storedUserName.trim())
                ? isValidValue(prev.billing_address.last_name)
                  ? prev.billing_address.last_name.trim()
                  : decodeURIComponent(storedUserName)
                      .replace(storedFirstName, "")
                      .trim()
                : isValidValue(profileData.last_name)
                ? profileData.last_name.trim()
                : "",
            email: isValidValue(prev.billing_address.email)
              ? prev.billing_address.email.trim()
              : isValidValue(profileData.email)
              ? profileData.email.trim()
              : "",
            // Use profile phone if form phone is empty or invalid
            phone: isValidValue(prev.billing_address.phone)
              ? prev.billing_address.phone.trim()
              : isValidValue(profileData.phone)
              ? profileData.phone.trim()
              : "",
            address_1: isValidValue(prev.billing_address.address_1)
              ? prev.billing_address.address_1.trim()
              : isValidValue(profileData.billing_address_1)
              ? profileData.billing_address_1.trim()
              : "",
            address_2: isValidValue(prev.billing_address.address_2)
              ? prev.billing_address.address_2.trim()
              : isValidValue(profileData.billing_address_2)
              ? profileData.billing_address_2.trim()
              : "",
            city: isValidValue(prev.billing_address.city)
              ? prev.billing_address.city.trim()
              : isValidValue(profileData.billing_city)
              ? profileData.billing_city.trim()
              : "",
            // Prioritize: existing state > profile billing_state > profile province
            state: isValidValue(prev.billing_address.state)
              ? prev.billing_address.state.trim()
              : isValidValue(profileData.billing_state)
              ? profileData.billing_state.trim()
              : isValidValue(profileData.province)
              ? profileData.province.trim()
              : "",
            postcode:
              prev.billing_address.postcode ||
              profileData.billing_postcode ||
              "",
            country:
              prev.billing_address.country ||
              profileData.billing_country ||
              "US",
            // Add the date of birth field to billing address
            date_of_birth:
              profileData.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };

          // Create updated shipping address with user data
          // IMPORTANT: Prioritize existing form data (from cart), then profile
          const updatedShippingAddress = {
            ...prev.shipping_address,
            // Prioritize existing form data (from cart), then cookies, then profile
            first_name:
              prev.shipping_address.first_name ||
              storedFirstName ||
              profileData.first_name ||
              "",
            last_name:
              prev.shipping_address.last_name ||
              (storedUserName
                ? decodeURIComponent(storedUserName)
                    .replace(storedFirstName, "")
                    .trim()
                : profileData.last_name || ""),
            phone: prev.shipping_address.phone || profileData.phone || "",
            address_1:
              prev.shipping_address.address_1 ||
              profileData.shipping_address_1 ||
              profileData.billing_address_1 ||
              "",
            address_2:
              prev.shipping_address.address_2 ||
              profileData.shipping_address_2 ||
              profileData.billing_address_2 ||
              "",
            city:
              prev.shipping_address.city ||
              profileData.shipping_city ||
              profileData.billing_city ||
              "",
            state:
              prev.shipping_address.state ||
              profileData.shipping_state ||
              profileData.billing_state ||
              profileData.province ||
              "",
            postcode:
              prev.shipping_address.postcode ||
              profileData.shipping_postcode ||
              profileData.billing_postcode ||
              "",
            country:
              prev.shipping_address.country ||
              profileData.shipping_country ||
              "US",
            // Add the date of birth field to shipping address
            date_of_birth:
              profileData.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };

          logger.log(
            "Updated billing address (prioritizing cart data):",
            updatedBillingAddress
          );
          logger.log("Phone in updated address:", updatedBillingAddress.phone);
          logger.log("State in updated address:", updatedBillingAddress.state);
          logger.log(
            "Previous billing address (from cart):",
            prev.billing_address
          );
          logger.log("Profile data used:", {
            phone: profileData.phone,
            province: profileData.province,
            billing_state: profileData.billing_state,
            address_1: profileData.billing_address_1,
            city: profileData.billing_city,
          });

          return {
            ...prev,
            billing_address: updatedBillingAddress,
            shipping_address: updatedShippingAddress,
            // Also add date_of_birth at the form data root level for accessibility
            date_of_birth:
              profileData.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };
        });

        // Cache profile data to avoid redundant API calls
        setCachedProfileData(profileData);
        logger.log("Profile data cached for reuse");
      } else {
        logger.log("No user profile data available or user not logged in");
      }
    } catch (error) {
      logger.error("Error fetching user profile:", error);
    }
  };

  // Initial loading of cart and processing URL parameters
  useEffect(() => {
    // Initialize loading
    const loadCheckoutData = async () => {
      try {
        logger.log("=== STARTING CHECKOUT DATA LOAD ===");

        // STEP 1: Load cart first and WAIT for it to complete
        const cartData = await fetchCartItems(true); // true = update form data with cart data
        setCartItems(cartData);
        logger.log("=== CART LOADED ===");

        // Process URL parameters if needed
        if (onboardingAddToCart) {
          setIsProcessingUrlParams(true);

          try {
            const result = await processUrlCartParameters(searchParams);

            if (result.status === "success") {
              // Refresh cart after adding products - reuse existing cart data structure
              // Don't fetch cart again, just update items from the result if available
              // This avoids redundant API call
              if (cartData) {
                // Update cart items from the processUrlCartParameters result
                // The cart should already be updated by the backend, so we can refresh
                // But we'll do it once after all URL processing is done
                const updatedCart = await fetchCartItems(false); // false = don't update form
                setCartItems(updatedCart);
              }
              toast.success("Products added to your cart!");

              // Clean up URL parameters - use the detected flow type from result
              cleanupCartUrlParameters(
                result.flowType ||
                  (isEdFlow
                    ? "ed"
                    : flowParams["hair-flow"]
                    ? "hair"
                    : flowParams["wl-flow"]
                    ? "wl"
                    : flowParams["mh-flow"]
                    ? "mh"
                    : flowParams["skincare-flow"]
                    ? "skincare"
                    : "general")
              );
            } else if (result.status === "error") {
              toast.error(result.message || "Failed to add products to cart.");
            }
          } finally {
            setIsProcessingUrlParams(false);
          }
        }

        // STEP 2: Load profile data AFTER cart completes to override cart data
        // This ensures logged-in users always see their latest profile data
        // IMPORTANT: Always fetch fresh profile data to avoid showing previous user's data
        // Check if user is authenticated
        const { getUserId } = await import("@/services/userDataService");
        const userId = getUserId();

        if (userId) {
          // User is authenticated - fetch fresh profile data
          // Always fetch fresh to ensure we have current user's data (not cached from previous user)
          logger.log("=== LOADING FRESH PROFILE DATA (user authenticated) ===");
          await fetchUserProfile(true); // Force refresh to prevent showing previous user's data
          logger.log("=== PROFILE DATA LOADED ===");
        } else {
          // User not authenticated - clear any cached profile data
          if (cachedProfileData) {
            logger.log(
              "=== CLEARING CACHED PROFILE DATA (user not authenticated) ==="
            );
            setCachedProfileData(null);
          }
        }

        // STEP 3: Ensure address data is populated from all available sources
        logger.log("=== ENSURING ADDRESS DATA POPULATED ===");
        const updatedFormDataWithAddresses = await populateAddressData(
          formData
        );
        if (updatedFormDataWithAddresses !== formData) {
          setFormData(updatedFormDataWithAddresses);
        }
        logger.log("=== ADDRESS DATA CHECK COMPLETED ===");

        // STEP 4: Saved cards functionality has been removed - all payments use Stripe Elements
      } catch (error) {
        logger.error("Error loading checkout data:", error);
        toast.error(
          "There was an issue loading your checkout data. Please refresh the page."
        );
      }
    };

    loadCheckoutData();

    // Cleanup debounce timer on unmount
    return () => {
      if (shippingDebounceTimerRef.current) {
        clearTimeout(shippingDebounceTimerRef.current);
      }
    };
  }, []);

  // Listen for logout events and authentication changes to clear cached profile data
  useEffect(() => {
    const handleUserLogout = () => {
      logger.log(
        "User logged out event detected - clearing cached profile data"
      );
      setCachedProfileData(null);
      // Also clear form data to prevent showing previous user's info
      setFormData((prev) => ({
        ...prev,
        billing_address: {},
        shipping_address: {},
        date_of_birth: "",
      }));
    };

    // Listen for logout events
    window.addEventListener("user-logged-out", handleUserLogout);

    return () => {
      window.removeEventListener("user-logged-out", handleUserLogout);
    };
  }, []);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate form data before processing
      // Stripe Elements handles card validation internally
      const validationResult = validateForm({
        billing_address: formData.billing_address,
        shipping_address: formData.shipping_address,
        cardNumber: "dummy", // Skip validation for Stripe Elements
        cardExpMonth: "12", // Skip validation for Stripe Elements
        cardExpYear: "30", // Skip validation for Stripe Elements
        cardCVD: "123", // Skip validation for Stripe Elements
        useSavedCard: false,
      });

      if (!validationResult.isValid) {
        logger.log("Form validation failed:", validationResult.errors);
        toast.error(
          validationResult.formattedMessage ||
            "Please check your form data and try again."
        );
        setSubmitting(false);
        return;
      }

      logger.log("Form validation passed, proceeding with checkout");

      // Check if age validation has previously failed and prevent order
      if (ageValidationFailed) {
        logger.log("Age validation previously failed, preventing order");
        setSubmitting(false);
        return;
      }

      // Quebec restriction removed - now allowing Quebec users to purchase Zonnic products
      // Age restrictions remain intact below
      if (cartItems && cartItems.items) {
        // const shippingProvince = formData.shipping_address.state;
        // const billingProvince = formData.billing_address.state;

        // const restriction = checkQuebecZonnicRestriction(
        //   cartItems.items,
        //   shippingProvince,
        //   billingProvince
        // );

        // if (restriction.blocked) {
        //   setShowQuebecPopup(true);
        //   setSubmitting(false);
        //   return;
        // }

        // Check age restriction for Zonnic products
        if (hasZonnicProducts(cartItems.items)) {
          // Check form data for date of birth (user might have changed it)
          let dateOfBirthToCheck = formData.billing_address.date_of_birth;

          // If no form data, use cached profile data (avoid redundant API call)
          if (!dateOfBirthToCheck && cachedProfileData) {
            dateOfBirthToCheck =
              cachedProfileData.date_of_birth ||
              cachedProfileData.raw_profile_data?.custom_meta?.date_of_birth;
            logger.log(
              "Using cached profile data for age validation (before checkout):",
              { dateOfBirth: dateOfBirthToCheck }
            );
          }

          // Now validate the date of birth
          if (dateOfBirthToCheck) {
            logger.log("Checking age validation for date:", dateOfBirthToCheck);
            const ageCheck = checkAgeRestriction(dateOfBirthToCheck, 19);
            logger.log("Age validation result:", ageCheck);
            if (ageCheck.blocked) {
              logger.log("User is too young, showing age popup");
              setAgeValidationFailed(true);
              setShowAgePopup(true);
              setSubmitting(false);
              return;
            } else {
              logger.log("User meets age requirement:", ageCheck.age);
              setAgeValidationFailed(false);
            }
          } else {
            logger.log("No date of birth found in form data");
            // If no DOB in form, we can't validate - let backend handle it
          }
        }
      }

      // Check if shipping address fields are empty, if so, use billing address
      const useShippingAddress =
        formData.shipping_address.ship_to_different_address;

      // Create the data object to send
      const { awc: awinAwc, channel: awinChannel } = getAwinFromUrlOrStorage();

      const dataToSend = {
        // Billing Details
        firstName: formData.billing_address.first_name,
        lastName: formData.billing_address.last_name,
        addressOne: formData.billing_address.address_1,
        addressTwo: formData.billing_address.address_2,
        city: formData.billing_address.city,
        state: formData.billing_address.state,
        postcode: formData.billing_address.postcode,
        country: formData.billing_address.country,
        phone: formData.billing_address.phone,
        email: formData.billing_address.email,

        // Shipping Details - use billing address if shipping address is not explicitly specified
        shipToAnotherAddress: useShippingAddress || false,
        shippingFirstName: useShippingAddress
          ? formData.shipping_address.first_name
          : formData.billing_address.first_name,
        shippingLastName: useShippingAddress
          ? formData.shipping_address.last_name
          : formData.billing_address.last_name,
        shippingAddressOne: useShippingAddress
          ? formData.shipping_address.address_1
          : formData.billing_address.address_1,
        shippingAddressTwo: useShippingAddress
          ? formData.shipping_address.address_2
          : formData.billing_address.address_2,
        shippingCity: useShippingAddress
          ? formData.shipping_address.city
          : formData.billing_address.city,
        shippingState: useShippingAddress
          ? formData.shipping_address.state
          : formData.billing_address.state,
        shippingPostCode: useShippingAddress
          ? formData.shipping_address.postcode
          : formData.billing_address.postcode,
        shippingCountry: useShippingAddress
          ? formData.shipping_address.country
          : formData.billing_address.country || "CA",
        shippingPhone: useShippingAddress
          ? formData.shipping_address.phone
          : formData.billing_address.phone,

        // Delivery Details
        discreet:
          formData.extensions["checkout-fields-for-blocks"]._meta_discreet,
        toMailBox:
          formData.extensions["checkout-fields-for-blocks"]._meta_mail_box,
        customerNotes: formData.customer_note,

        // Payment Details - Stripe Elements handles card input
        cardNumber: "",
        cardType:
          formData.payment_data.find(
            (d) => d.key === "wc-bambora-credit-card-card-type"
          )?.value || "",
        cardExpMonth: "",
        cardExpYear: "",
        cardCVD: "",

        // Use Stripe for all payments
        useStripe: true,

        // Add total amount
        totalAmount:
          cartItems.totals && cartItems.totals.total_price
            ? parseFloat(cartItems.totals.total_price) / 100
            : cartItems.totals && cartItems.totals.total
            ? parseFloat(cartItems.totals.total.replace(/[^0-9.]/g, ""))
            : 0,

        // ED Flow parameter
        isEdFlow: isEdFlow,

        // AWIN affiliate metadata (frontend-sourced)
        awin_awc: awinAwc || "",
        awin_channel: awinChannel || "other",

        // Cart ID (if available from cart fetch on checkout page)
        cartId: cartItems?.id || null,
      };

      // ========================================
      // NOTE: Stripe tokenization happens on BACKEND
      // Frontend Stripe.js doesn't allow raw card data even with API setting enabled
      // Backend Stripe SDK respects the "Raw card data APIs" setting
      // ========================================

      // Enhanced client-side logging
      logger.log("=== PAYMENT METHOD DEBUG ===");
      logger.log("useStripe: true");
      logger.log("===========================");

      logger.log("Client-side checkout data:", {
        ...dataToSend,
        cardNumber: "[REDACTED]",
        cardCVD: "[REDACTED]",
        cartTotals: cartItems.totals,
        totalAmount: dataToSend.totalAmount,
      });

      // Process payment with Stripe Elements (deferred mode)
      if (dataToSend.useStripe) {
        try {
          logger.log("Processing Stripe Elements payment in deferred mode...");

          // Validate Stripe Elements is ready
          if (!stripeElements) {
            throw new Error("Stripe payment form not ready. Please try again.");
          }

          // Validate Stripe instance is available
          if (!stripe) {
            throw new Error(
              "Stripe is not loaded. Please refresh and try again."
            );
          }

          // Step 1: Submit Payment Element to collect payment method
          // This happens BEFORE creating the order (deferred mode)
          logger.log("Collecting payment method from Payment Element...");
          const { error: submitError } = await stripeElements.submit();

          if (submitError) {
            throw new Error(submitError.message);
          }

          // Step 2: Extract payment method from PaymentElement
          // We need the payment method ID to use with confirmCardPayment
          logger.log("Retrieving payment method from PaymentElement...");
          const paymentElement = stripeElements.getElement("payment");

          if (!paymentElement) {
            throw new Error("PaymentElement not found");
          }

          // Create payment method from the PaymentElement
          const { error: pmError, paymentMethod } =
            await stripe.createPaymentMethod({
              elements: stripeElements,
              params: {
                billing_details: {
                  name: `${dataToSend.firstName} ${dataToSend.lastName}`,
                  email: dataToSend.email,
                  phone: dataToSend.phone,
                  address: {
                    line1: dataToSend.addressOne,
                    line2: dataToSend.addressTwo || "",
                    city: dataToSend.city,
                    state: dataToSend.state,
                    postal_code: dataToSend.postcode,
                    country: (dataToSend.country || "CA").toUpperCase(),
                  },
                },
              },
            });

          if (pmError || !paymentMethod) {
            throw new Error(
              pmError?.message || "Failed to create payment method"
            );
          }

          logger.log("Payment method created:", paymentMethod.id);

          // Step 3: Create order and get PaymentIntent from new backend API
          logger.log("Creating order via new checkout API...");
          
          // Add timeout to prevent hanging (100 seconds to match backend timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 100000);
          
          let checkoutResponse;
          try {
            checkoutResponse = await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(dataToSend),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === "AbortError") {
              throw new Error(
                "Request timeout - The order may have been created but the server took too long to respond. Please check your order history or contact support."
              );
            }
            throw fetchError;
          }

          // Check if response is OK before parsing JSON
          if (!checkoutResponse.ok) {
            let errorMessage = "Failed to create order";
            try {
              const errorData = await checkoutResponse.json();
              errorMessage = errorData.error || errorMessage;
              
              // Handle timeout specifically
              if (checkoutResponse.status === 408 || errorData.timeout) {
                errorMessage =
                  "Request timeout - The order may have been created but the server took too long to respond. Please check your order history or contact support.";
              }
            } catch (parseError) {
              // If JSON parsing fails, use status text
              errorMessage = `Request failed with status ${checkoutResponse.status}: ${checkoutResponse.statusText}`;
            }
            throw new Error(errorMessage);
          }

          const checkoutResult = await checkoutResponse.json();

          if (!checkoutResult.success) {
            throw new Error(checkoutResult.error || "Failed to create order");
          }

          const { order, payment } = checkoutResult;
          const orderId = order.id;
          const orderNumber = order.orderNumber;
          logger.log("✅ Order created:", { orderId, orderNumber });

          // Handle FREE orders (100% discount, total is $0)
          if (
            !payment ||
            order.totalAmount === 0 ||
            order.totalAmount === "0.00"
          ) {
            logger.log("✅ FREE ORDER detected (100% discount applied)");

            logger.log("✅ Free order completed successfully");
            toast.success("Order placed successfully!");

            // Empty cart
            try {
              const { emptyCart } = await import("@/lib/cart/cartService");
              await emptyCart();
              logger.log("Cart emptied successfully");
            } catch (error) {
              logger.error("Error emptying cart:", error);
            }

            // Redirect to success page (use orderNumber as key for new API)
            router.push(
              `/checkout/order-received/${orderId}?key=${orderNumber}${buildFlowQueryString()}`
            );
            return;
          }

          // Step 4: Confirm payment using confirmCardPayment with payment method and clientSecret
          // This works with manual capture PaymentIntents (unlike confirmPayment with Elements)
          logger.log(
            "Confirming payment with Stripe using confirmCardPayment..."
          );

          const { error: confirmError, paymentIntent } =
            await stripe.confirmCardPayment(payment.clientSecret, {
              payment_method: paymentMethod.id,
            });

          if (confirmError) {
            throw new Error(confirmError.message);
          }

          if (!paymentIntent) {
            throw new Error("Failed to confirm payment");
          }

          logger.log("✅ Payment confirmed:", {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
          });

          // Check payment status
          // For manual capture, the expected status is 'requires_capture' (payment authorized but not captured yet)
          if (paymentIntent.status === "requires_capture") {
            // Payment authorized but not captured yet (this is expected for manual capture)
            // The payment will be captured later when order status changes to PROCESSING
            logger.log(
              "Payment authorized successfully (awaiting manual capture)"
            );
            toast.success("Payment authorized successfully!");

            // Empty cart
            try {
              const { emptyCart } = await import("@/lib/cart/cartService");
              await emptyCart();
              logger.log("Cart emptied successfully");
            } catch (error) {
              logger.error("Error emptying cart:", error);
            }

            // Redirect to success page
            router.push(
              `/checkout/order-received/${orderId}?key=${orderNumber}${buildFlowQueryString()}`
            );
            return;
          } else if (paymentIntent.status === "succeeded") {
            // Payment succeeded (if automatic capture was used)
            logger.log("Payment succeeded");
            toast.success("Payment successful!");

            // Empty cart
            try {
              const { emptyCart } = await import("@/lib/cart/cartService");
              await emptyCart();
              logger.log("Cart emptied successfully");
            } catch (error) {
              logger.error("Error emptying cart:", error);
            }

            // Redirect to success page
            router.push(
              `/checkout/order-received/${orderId}?key=${orderNumber}${buildFlowQueryString()}`
            );
            return;
          } else if (paymentIntent.status === "processing") {
            // Payment is being processed
            logger.log("Payment is being processed");
            toast.success("Payment is being processed!");

            // Empty cart
            try {
              const { emptyCart } = await import("@/lib/cart/cartService");
              await emptyCart();
              logger.log("Cart emptied successfully");
            } catch (error) {
              logger.error("Error emptying cart:", error);
            }

            // Redirect to success page
            router.push(
              `/checkout/order-received/${orderId}?key=${orderNumber}${buildFlowQueryString()}`
            );
            return;
          } else if (paymentIntent.status === "requires_action") {
            // 3D Secure required - Stripe will handle redirect
            logger.log("3D Secure authentication required");
            return;
          } else {
            throw new Error(
              `Unexpected payment status: ${paymentIntent.status}`
            );
          }
        } catch (error) {
          logger.error("❌ Stripe payment error:", error);
          toast.error(error.message || "Payment failed. Please try again.");
          setSubmitting(false);
          return;
        }
      }

      // All payment methods should be handled above
      // If we reach here, it means no payment method was selected or processed
      logger.error("No payment method processed");
      toast.error("Please select a payment method and try again.");
    } catch (error) {
      logger.error("Checkout Error:", error);

      // Transform the error message if it's a WordPress critical error
      const errorMessage =
        error.message ||
        "There was an error processing your order. Please try again.";

      // Extract meaningful error message from complex objects
      let errorString;
      if (typeof errorMessage === "string") {
        errorString = errorMessage;
      } else if (errorMessage && typeof errorMessage === "object") {
        // Try to extract meaningful message from object
        errorString =
          errorMessage.message ||
          errorMessage.error?.message ||
          errorMessage.toString();
      } else {
        errorString = String(errorMessage || "Unknown error occurred");
      }

      const userFriendlyMessage = isWordPressCriticalError(errorString)
        ? transformPaymentError(errorString)
        : errorString; // Use the actual error message, not the generic fallback

      toast.error(userFriendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading indicator if cart is not yet loaded or URL parameters are being processed
  if (!cartItems || isProcessingUrlParams) {
    return <CheckoutSkeleton />;
  }

  return (
    <>
      <QuestionnaireNavbar />
      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-100px)] border-t overflow-hidden max-w-full">
        {submitting && <Loader />}
        <BillingAndShipping
          setFormData={setFormData}
          formData={formData}
          onProvinceChange={handleProvinceChange}
          cartItems={cartItems}
          isUpdatingShipping={isUpdatingShipping}
          onAgeValidation={() => {
            setShowAgePopup(true);
            setAgeValidationFailed(true);
          }}
          onAgeValidationReset={() => setAgeValidationFailed(false)}
        />
        <CartAndPayment
          items={cartItems.items}
          cartItems={cartItems}
          setCartItems={setCartItems}
          setFormData={setFormData}
          formData={formData}
          handleSubmit={handleSubmit}
          isUpdatingShipping={isUpdatingShipping}
          isEdFlow={isEdFlow}
          ageValidationFailed={ageValidationFailed}
          isPaymentValid={isPaymentValid}
          paymentValidationMessage={paymentValidationMessage}
          onStripeReady={setStripeElements}
        />
      </div>

      {/* Quebec Restriction Popup */}
      <QuebecRestrictionPopup
        isOpen={showQuebecPopup}
        onClose={() => setShowQuebecPopup(false)}
        message={getQuebecRestrictionMessage()}
      />

      {/* Age Restriction Popup */}
      <AgeRestrictionPopup
        isOpen={showAgePopup}
        onClose={() => {
          setShowAgePopup(false);
          // Don't reset ageValidationFailed here - it should only reset when user enters valid age
        }}
        message="Sorry, you must be at least 19 years old to purchase this product."
      />
    </>
  );
};

export default CheckoutPageWrapper;
