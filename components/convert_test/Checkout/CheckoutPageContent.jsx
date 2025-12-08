"use client";

import Loader from "@/components/Loader";
import { logger } from "@/utils/devLogger";
import CheckoutSkeleton from "@/components/ui/skeletons/CheckoutSkeleton";
import { useEffect, useState } from "react";
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
import QuestionnaireNavbar from "@/components/EdQuestionnaire/QuestionnaireNavbar";
import { getRequiredConsultations } from "@/utils/requiredConsultation";
import {
  checkQuebecZonnicRestriction,
  getQuebecRestrictionMessage,
} from "@/utils/zonnicQuebecValidation";
import useCheckoutValidation from "@/lib/hooks/useCheckoutValidation";
import { checkAgeRestriction } from "@/utils/ageValidation";
import QuebecRestrictionPopup from "@/components/Popups/QuebecRestrictionPopup";
import AgeRestrictionPopup from "@/components/Popups/AgeRestrictionPopup";
import { getAwinFromUrlOrStorage } from "@/utils/awin";
import Payment from "./Payment";
import Trustpilot from "@/components/Navbar/Trustpilot";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getCurrencyLowerCase } from "@/lib/constants/currency";

// Load Stripe outside component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

// Wrapper component to provide Stripe context
const CheckoutPageWrapper = () => {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: 1000,
        currency: getCurrencyLowerCase(),
        appearance: {
          theme: "stripe",
        },
        paymentMethodCreation: "manual", // Required for createPaymentMethod with PaymentElement
        // Configure payment methods at the Elements level
        paymentMethodTypes: ["card", "link"], // Allow card and link payments
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
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isLoadingSavedCards, setIsLoadingSavedCards] = useState(false);

  // Stripe Elements state (for embedded payment form)
  const [stripeElements, setStripeElements] = useState(null);

  // Initialize checkout validation hook
  const {
    validationErrors,
    isValidating,
    validateForm,
    clearErrors,
    hasErrors,
    getFieldError,
  } = useCheckoutValidation();
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

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardType, setCardType] = useState("");

  // Payment validation state
  const [isPaymentValid, setIsPaymentValid] = useState(false);
  const [paymentValidationMessage, setPaymentValidationMessage] = useState("");

  // Retry mechanism state for saved card payments
  const [shouldUseDirectPayment, setShouldUseDirectPayment] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState("");
  const [savedOrderKey, setSavedOrderKey] = useState("");

  // Validate payment method whenever payment state changes
  useEffect(() => {
    // For NEW CARD payments with Stripe Elements, always consider valid
    // (Stripe Elements handles validation internally on submit)
    if (!selectedCard) {
      setIsPaymentValid(true);
      setPaymentValidationMessage("");
      return;
    }

    // For SAVED CARD payments, validate normally
    const paymentState = {
      selectedCard,
      cardNumber,
      expiry,
      cvc,
    };

    const isValid = isPaymentMethodValid(paymentState);
    const message = getPaymentValidationMessage(paymentState);

    setIsPaymentValid(isValid);
    setPaymentValidationMessage(message);
  }, [selectedCard, cardNumber, expiry, cvc]);
  const [showQuebecPopup, setShowQuebecPopup] = useState(false);
  const [showAgePopup, setShowAgePopup] = useState(false);
  const [ageValidationFailed, setAgeValidationFailed] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);

  // Handle province change for real-time Quebec validation and shipping updates
  const handleProvinceChange = async (
    newProvince,
    addressType = "billing",
    shouldClearFields = true
  ) => {
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

        // If no form data, fall back to profile API
        if (!dateOfBirthToCheck) {
          try {
            const response = await fetch("/api/profile");
            if (response.ok) {
              const profileData = await response.json();
              logger.log(
                "Profile data for age validation (province change):",
                profileData
              );
              if (profileData.success && profileData.date_of_birth) {
                dateOfBirthToCheck = profileData.date_of_birth;
              }
            }
          } catch (error) {
            logger.log(
              "Could not fetch user profile for age validation (province change):",
              error
            );
          }
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

    // Update shipping rates when province changes
    try {
      setIsUpdatingShipping(true);

      // Prepare address data based on whether we should clear fields
      let addressData;

      if (shouldClearFields) {
        // Create a basic address with province and country to trigger shipping calculation
        addressData = {
          first_name:
            formData.shipping_address.first_name ||
            formData.billing_address.first_name ||
            "",
          last_name:
            formData.shipping_address.last_name ||
            formData.billing_address.last_name ||
            "",
          company: "",
          address_1: "",
          address_2: "",
          city: "",
          state: newProvince,
          postcode: "",
          country: "US",
        };
      } else {
        // Keep existing address data when province changes due to address selection
        addressData = {
          first_name:
            formData.shipping_address.first_name ||
            formData.billing_address.first_name ||
            "",
          last_name:
            formData.shipping_address.last_name ||
            formData.billing_address.last_name ||
            "",
          company: formData.shipping_address.company || "",
          address_1: formData.shipping_address.address_1 || "",
          address_2: formData.shipping_address.address_2 || "",
          city: formData.shipping_address.city || "",
          state: newProvince,
          postcode: formData.shipping_address.postcode || "",
          country: "US",
        };
      }

      // Prepare customer data for API call
      const customerData = {
        billing_address: {
          first_name: formData.billing_address.first_name || "",
          last_name: formData.billing_address.last_name || "",
          company: formData.billing_address.company || "",
          address_1:
            addressType === "billing" && shouldClearFields
              ? ""
              : formData.billing_address.address_1 || "",
          address_2:
            addressType === "billing" && shouldClearFields
              ? ""
              : formData.billing_address.address_2 || "",
          city:
            addressType === "billing" && shouldClearFields
              ? ""
              : formData.billing_address.city || "",
          state:
            addressType === "billing"
              ? newProvince
              : formData.billing_address.state || newProvince,
          postcode:
            addressType === "billing" && shouldClearFields
              ? ""
              : formData.billing_address.postcode || "",
          country: "US",
          email: formData.billing_address.email || "",
          phone: formData.billing_address.phone || "",
        },
        shipping_address: addressData,
      };

      // Also update form data to sync UI only if we should clear fields
      if (shouldClearFields) {
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
                country: "US",
              }
              : {}),
            state:
              addressType === "billing"
                ? newProvince
                : prev.billing_address.state || newProvince,
          },
          shipping_address: addressData,
        }));
      }

      // Get the country and postal code from the appropriate address
      const country = addressType === "billing" 
        ? formData.billing_address.country || "CA"
        : formData.shipping_address.country || "CA";
      
      const postalCode = addressType === "billing"
        ? formData.billing_address.postcode
        : formData.shipping_address.postcode;

      logger.log("Calculating shipping for province change:", {
        country,
        state: newProvince,
        postalCode,
        addressType,
      });

      // Call the shipping calculation API
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
        // Transform shipping options to cart format
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
      } else {
        logger.error("Error calculating shipping rates:", result.error);
        toast.error("Failed to calculate shipping rates. Please try again.");
      }
    } catch (error) {
      logger.error("Error updating shipping rates:", error);
      toast.error("Failed to update shipping rates. Please try again.");
    } finally {
      setIsUpdatingShipping(false);
    }
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
              const newUrl = `${window.location.pathname
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
        logger.log("=== SETTING FORM DATA FROM CART ===", {
          billing_address_1: data.billing_address?.address_1,
          billing_city: data.billing_address?.city,
          billing_state: data.billing_address?.state,
        });
        setFormData((prev) => {
          return {
            ...prev,
            billing_address: data.billing_address || prev.billing_address,
            shipping_address: data.shipping_address || prev.shipping_address,
          };
        });
      } else {
        logger.log("=== SKIPPING FORM DATA UPDATE FROM CART ===");
      }

      return data;
    } catch (error) {
      logger.error("Error fetching cart items:", error);
      return null;
    }
  };

  // Function to fetch saved payment cards
  const fetchSavedCards = async () => {
    try {
      setIsLoadingSavedCards(true);
      logger.log("Fetching saved cards from API...");

      // Explicitly wait for the fetch to complete
      const res = await fetch("/api/payment-methods", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) {
        logger.error("API returned error status:", res.status);
        throw new Error(`API error: ${res.status}`);
      }

      // Log the raw response
      logger.log("API response status:", res.status);

      // Parse the response
      const data = await res.json();

      logger.log("Saved cards API full response:", data);

      if (
        data.success &&
        data.cards &&
        Array.isArray(data.cards) &&
        data.cards.length > 0
      ) {
        logger.log("Setting saved cards in state:", data.cards);
        setSavedCards(data.cards);

        // Set the default card as selected if available
        const defaultCard = data.cards.find((card) => card.is_default);
        if (defaultCard) {
          logger.log("Setting default card as selected:", defaultCard);
          // Store the card object to have access to both id and token
          setSelectedCard(defaultCard);
        }
      } else {
        logger.log("No saved cards found in API response or invalid format");
        setSavedCards([]);
      }
    } catch (error) {
      logger.error("Error fetching saved cards:", error);
      setSavedCards([]);
    } finally {
      setIsLoadingSavedCards(false);
    }
  };

  // Function to fetch user profile data
  const fetchUserProfile = async () => {
    try {
      // Always fetch fresh data from API for checkout to ensure latest billing info
      // Get user name from cookies if available
      const cookies = document.cookie.split(";").reduce((cookies, cookie) => {
        const [name, value] = cookie.trim().split("=");
        cookies[name] = value;
        return cookies;
      }, {});

      // Decode cookie values to prevent URL encoding issues
      const storedFirstName = decodeURIComponent(cookies.displayName || "");
      const storedUserName = decodeURIComponent(cookies.userName || "");

      // Fetch fresh profile data without caching - add timestamp to prevent any caching
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
        billing_address_1: data.billing_address_1,
        billing_city: data.billing_city,
        billing_state: data.billing_state,
        billing_postcode: data.billing_postcode,
      });

      if (data.success) {
        logger.log("User profile data fetched successfully from API:", data);

        const profileData = data;

        // Update form data with user profile information
        // BUT: Only override cart data if profile has data and cart doesn't (priority to cart)
        logger.log("=== SETTING FORM DATA FROM PROFILE ===");
        setFormData((prev) => {
          // Create updated billing address with user data
          // IMPORTANT: Use prev data (from cart) if it exists, profile as fallback
          const updatedBillingAddress = {
            ...prev.billing_address,
            // Prioritize existing form data (from cart), then cookies, then profile
            first_name:
              prev.billing_address.first_name ||
              storedFirstName ||
              profileData.first_name ||
              "",
            last_name:
              prev.billing_address.last_name ||
              (storedUserName
                ? decodeURIComponent(storedUserName)
                  .replace(storedFirstName, "")
                  .trim()
                : profileData.last_name || ""),
            email: prev.billing_address.email || profileData.email || "",
            phone: prev.billing_address.phone || profileData.phone || "",
            address_1:
              prev.billing_address.address_1 ||
              profileData.billing_address_1 ||
              "",
            address_2:
              prev.billing_address.address_2 ||
              profileData.billing_address_2 ||
              "",
            city: prev.billing_address.city || profileData.billing_city || "",
            state:
              prev.billing_address.state ||
              profileData.billing_state ||
              profileData.province ||
              "",
            postcode:
              prev.billing_address.postcode ||
              profileData.billing_postcode ||
              "",
            country:
              prev.billing_address.country ||
              profileData.billing_country ||
              "CA",
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
              "CA",
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
          logger.log(
            "Previous billing address (from cart):",
            prev.billing_address
          );
          logger.log("Profile billing address:", {
            address_1: profileData.billing_address_1,
            city: profileData.billing_city,
            state: profileData.billing_state,
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
      } else {
        logger.log("No user profile data available or user not logged in");
      }
    } catch (error) {
      logger.error("Error fetching user profile:", error);
    }
  };

  // Initial loading of cart and processing URL parameters
  useEffect(() => {
    // Reset retry mechanism state on page load/refresh
    setShouldUseDirectPayment(false);
    setSavedOrderId("");
    setSavedOrderKey("");

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
              // Refresh cart after adding products
              // Don't update form data to avoid overwriting profile data
              const updatedCart = await fetchCartItems(false); // false = don't update form
              setCartItems(updatedCart);
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
        logger.log("=== LOADING PROFILE DATA ===");
        await fetchUserProfile();
        logger.log("=== PROFILE DATA LOADED ===");

        // STEP 3: Load saved cards (doesn't affect form data)
        await fetchSavedCards();
      } catch (error) {
        logger.error("Error loading checkout data:", error);
        toast.error(
          "There was an issue loading your checkout data. Please refresh the page."
        );
      }
    };

    loadCheckoutData();
  }, []);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate form data before processing
      // For NEW CARD payments with Stripe Elements, skip card validation
      // (Stripe Elements handles card validation internally)
      const validationResult = validateForm({
        billing_address: formData.billing_address,
        shipping_address: formData.shipping_address,
        cardNumber: selectedCard ? cardNumber : "dummy", // Skip validation for Stripe Elements
        cardExpMonth: selectedCard ? expiry?.split("/")[0] : "12", // Skip validation for Stripe Elements
        cardExpYear: selectedCard ? expiry?.split("/")[1] : "30", // Skip validation for Stripe Elements
        cardCVD: selectedCard ? cvc : "123", // Skip validation for Stripe Elements
        useSavedCard: !!selectedCard,
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

      // Check Quebec restriction for Zonnic products
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
          // First check form data (user might have changed date of birth)
          let dateOfBirthToCheck = formData.billing_address.date_of_birth;

          // If no form data, fall back to profile API
          if (!dateOfBirthToCheck) {
            try {
              const response = await fetch("/api/profile");
              if (response.ok) {
                const profileData = await response.json();
                logger.log("Profile data for age validation:", profileData);
                if (profileData.success && profileData.date_of_birth) {
                  dateOfBirthToCheck = profileData.date_of_birth;
                }
              }
            } catch (error) {
              logger.log(
                "Could not fetch user profile for age validation:",
                error
              );
            }
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
            logger.log("No date of birth found in form or profile data");
          }
        }
      }

      // Update customer data on server before checkout to ensure latest info is saved
      try {
        logger.log("Updating customer data before checkout...");
        const useShippingAddress =
          formData.shipping_address.ship_to_different_address;

        const customerUpdateData = {
          billing_address: {
            first_name: formData.billing_address.first_name || "",
            last_name: formData.billing_address.last_name || "",
            company: formData.billing_address.company || "",
            address_1: formData.billing_address.address_1 || "",
            address_2: formData.billing_address.address_2 || "",
            city: formData.billing_address.city || "",
            state: formData.billing_address.state || "",
            postcode: formData.billing_address.postcode || "",
            country: formData.billing_address.country || "US",
            email: formData.billing_address.email || "",
            phone: formData.billing_address.phone || "",
          },
          shipping_address: useShippingAddress
            ? {
              first_name: formData.shipping_address.first_name || "",
              last_name: formData.shipping_address.last_name || "",
              company: formData.shipping_address.company || "",
              address_1: formData.shipping_address.address_1 || "",
              address_2: formData.shipping_address.address_2 || "",
              city: formData.shipping_address.city || "",
              state: formData.shipping_address.state || "",
              postcode: formData.shipping_address.postcode || "",
              country: formData.shipping_address.country || "US",
              phone: formData.shipping_address.phone || "",
            }
            : {
              first_name: formData.billing_address.first_name || "",
              last_name: formData.billing_address.last_name || "",
              company: formData.billing_address.company || "",
              address_1: formData.billing_address.address_1 || "",
              address_2: formData.billing_address.address_2 || "",
              city: formData.billing_address.city || "",
              state: formData.billing_address.state || "",
              postcode: formData.billing_address.postcode || "",
              country: formData.billing_address.country || "US",
              phone: formData.billing_address.phone || "",
            },
        };

        // Include date_of_birth in the profile update
        const profileData = {
          ...customerUpdateData,
          date_of_birth:
            formData.billing_address.date_of_birth ||
            formData.date_of_birth ||
            "",
        };

        logger.log("Profile data with DOB:", {
          date_of_birth: profileData.date_of_birth,
          phone: profileData.billing_address?.phone,
        });

        const profileUpdateResponse = await fetch(
          "/api/update-customer-profile",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(profileData),
          }
        );

        const profileUpdateResult = await profileUpdateResponse.json();

        logger.log("=== PROFILE UPDATE API RESPONSE ===", {
          status: profileUpdateResponse.status,
          ok: profileUpdateResponse.ok,
          response: profileUpdateResult,
        });

        if (profileUpdateResponse.ok && profileUpdateResult.success) {
          logger.log("Customer profile updated permanently ✓");
          logger.log("Updated customer data:", profileUpdateResult.data);

          // Check metadata update status
          if (profileUpdateResult.metadata_update) {
            logger.log(
              "=== METADATA UPDATE STATUS ===",
              profileUpdateResult.metadata_update
            );

            if (profileUpdateResult.metadata_update.attempted) {
              if (profileUpdateResult.metadata_update.success) {
                logger.log(
                  "✓ User metadata (DOB, phone) updated successfully"
                );
              } else {
                logger.error(
                  "✗ User metadata update FAILED:",
                  profileUpdateResult.metadata_update.error
                );
              }
            } else {
              logger.warn(
                "⚠ Metadata update was not attempted (no DOB or phone provided)"
              );
            }
          }
        } else {
          logger.warn(
            "Failed to update customer profile:",
            profileUpdateResult.error
          );
        }
      } catch (error) {
        logger.error("Error updating customer data before checkout:", error);
        // Continue with checkout even if update fails
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

        // Payment Details
        cardNumber: selectedCard ? "" : cardNumber,
        cardType: selectedCard
          ? ""
          : formData.payment_data.find(
            (d) => d.key === "wc-bambora-credit-card-card-type"
          )?.value,
        cardExpMonth: selectedCard ? "" : expiry.slice(0, 2),
        cardExpYear: selectedCard ? "" : expiry.slice(3),
        cardCVD: selectedCard ? "" : cvc,

        // If using a saved card, include the token and id
        savedCardToken: selectedCard ? selectedCard.token : null,
        savedCardId: selectedCard ? selectedCard.id : null,
        useSavedCard: !!selectedCard,

        // NEW: Use Stripe for new card payments
        useStripe: !selectedCard, // Use Stripe only when NOT using a saved card

        // Add total amount for saved card payments
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
      };

      // ========================================
      // NOTE: Stripe tokenization happens on BACKEND
      // Frontend Stripe.js doesn't allow raw card data even with API setting enabled
      // Backend Stripe SDK respects the "Raw card data APIs" setting
      // ========================================

      // Enhanced client-side logging
      logger.log("Client-side checkout data:", {
        ...dataToSend,
        cardNumber: dataToSend.cardNumber ? "[REDACTED]" : "",
        cardCVD: dataToSend.cardCVD ? "[REDACTED]" : "",
        cartTotals: cartItems.totals,
        selectedCardId: selectedCard,
        totalAmount: dataToSend.totalAmount,
      });

      // For saved cards, we'll use a two-step approach but check for duplicate payments
      if (selectedCard && cartItems.totals) {
        try {
          logger.log(`Processing checkout with saved card: ${selectedCard.id}`);

          let orderId = savedOrderId;
          let orderKey = savedOrderKey;

          // Check if we should use direct payment (retry scenario)
          if (shouldUseDirectPayment && savedOrderId) {
            logger.log(
              `Using direct payment for existing order: ${savedOrderId}`
            );
          } else {
            // Step 1: Create order without payment processing
            const checkoutResponse = await fetch("/api/create-pending-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(dataToSend),
            });

            const checkoutResult = await checkoutResponse.json();
            logger.log("Order creation result:", checkoutResult);

            // Check if order was created successfully
            if (checkoutResult.success && checkoutResult.data?.id) {
              orderId = checkoutResult.data.id;
              orderKey = checkoutResult.data.order_key || "";
              logger.log(
                `Order created successfully with ID: ${orderId}, now processing payment`
              );

              // Before processing payment, check the order status to avoid duplicate payments
              try {
                const orderCheckResponse = await fetch(
                  `/api/order/status?id=${orderId}`
                );
                const orderStatus = await orderCheckResponse.json();

                if (
                  isSuccessfulOrderStatus(orderStatus.status) ||
                  orderStatus.success === false
                ) {
                  logger.log(
                    "Order is already paid or being processed, skipping payment"
                  );
                  toast.success("Order is already being processed!");

                  // Redirect to order received page
                  router.push(
                    `/checkout/order-received/${orderId}?key=${orderKey}${buildFlowQueryString()}`
                  );
                  return;
                } else if (orderStatus.status === "failed") {
                  logger.log("Order payment failed, allowing retry");
                  // Continue with payment to retry
                }
              } catch (orderCheckError) {
                logger.log("Error checking order status:", orderCheckError);
                // Continue with payment if we can't check the status
              }
            } else if (checkoutResult.error) {
              // Something else went wrong
              toast.error(checkoutResult.error || "Failed to create order");
              setSubmitting(false);
              return;
            }
          }

          // Step 2: Process the payment with the saved card
          const paymentResponse = await fetch(
            "/api/pay-order-with-saved-card",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                order_id: orderId,
                savedCardToken: selectedCard.token,
                cardId: selectedCard.id,
                cvv: "",
                // Include billing address for address verification
                billing_address: {
                  first_name: formData.billing_address.first_name,
                  last_name: formData.billing_address.last_name,
                  address_1: formData.billing_address.address_1,
                  address_2: formData.billing_address.address_2 || "",
                  city: formData.billing_address.city,
                  state: formData.billing_address.state,
                  postcode: formData.billing_address.postcode,
                  country: formData.billing_address.country || "US",
                  email: formData.billing_address.email,
                  phone: formData.billing_address.phone,
                },
              }),
            }
          );

          // Use centralized payment response handler
          const paymentResult = await handlePaymentResponse(
            paymentResponse,
            orderId,
            orderKey
          );
          logger.log("Payment result:", paymentResult);

          if (!paymentResult.success) {
            // Store order details for retry mechanism
            setSavedOrderId(orderId);
            setSavedOrderKey(orderKey);
            setShouldUseDirectPayment(true);

            // Transform the error message if it's a WordPress critical error
            const errorMessage =
              paymentResult.message ||
              "Payment failed. Please try another payment method.";

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
              : errorString;

            toast.error(userFriendlyMessage);
            setSubmitting(false);
            return;
          }

          // Successfully created order and processed payment
          // Reset retry mechanism state on success
          setShouldUseDirectPayment(false);
          setSavedOrderId("");
          setSavedOrderKey("");

          toast.success("Order created and payment processed successfully!");

          // Get the order ID and key from the payment result
          const paymentOrderId = paymentResult.order_id;
          const paymentOrderKey = paymentResult.order_key || "";

          // Empty the cart after successful checkout
          try {
            logger.log("Emptying cart after successful checkout...");
            const { emptyCart } = await import("@/lib/cart/cartService");
            await emptyCart();
            logger.log("Cart emptied successfully after checkout");
          } catch (emptyError) {
            logger.error("Error emptying cart after checkout:", emptyError);
            // Don't block the redirect if cart emptying fails
          }

          // Debugging logs
          logger.log(
            `Redirecting to order received page: /checkout/order-received/${paymentOrderId}?key=${paymentOrderKey}`
          );

          // Redirect to order received page with the correct order details
          router.push(
            `/checkout/order-received/${paymentOrderId}?key=${paymentOrderKey}${buildFlowQueryString()}`
          );
          return;
        } catch (error) {
          logger.error("Error processing order with saved card:", error);
          // Transform the error message if it's a WordPress critical error
          const errorMessage =
            error.message ||
            "Unable to process payment with saved card. Please try another payment method.";

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
            : errorString;

          toast.error(userFriendlyMessage);
          setSubmitting(false);
          return;
        }
      }

      // ========================================
      // NEW: 3-Step payment flow for new cards with Stripe
      // ========================================
      if (!selectedCard && dataToSend.useStripe && cardNumber) {
        logger.log("=== STARTING 3-STEP STRIPE PAYMENT FLOW ===");

        try {
          // STEP 1: Create pending order
          logger.log("STEP 1: Creating pending order...");
          const orderResponse = await fetch("/api/create-pending-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dataToSend),
          });

          const orderResult = await orderResponse.json();
          logger.log("Order creation result:", orderResult);

          if (!orderResult.success || !orderResult.data?.id) {
            throw new Error(orderResult.error || "Failed to create order");
          }

          const orderId = orderResult.data.id;
          const orderKey = orderResult.data.order_key || "";
          logger.log(`✓ Order created successfully: ${orderId}`);

          // STEP 2: Process Stripe payment (backend creates Source from card data)
          logger.log("STEP 2: Processing Stripe payment...");
          const paymentResponse = await fetch("/api/process-stripe-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              // Send card data to backend (will create Source server-side)
              cardNumber: cardNumber.replace(/\s/g, ""),
              cardExpMonth: expiry.slice(0, 2),
              cardExpYear: "20" + expiry.slice(3),
              cardCvc: cvc,
              amount: Math.round(parseFloat(dataToSend.totalAmount) * 100), // Convert to cents
              currency: getCurrencyLowerCase(),
              description: `Order #${orderId}`,
              customerEmail: dataToSend.email,
              customerName: `${dataToSend.firstName} ${dataToSend.lastName}`,
              billingDetails: {
                name: `${dataToSend.firstName} ${dataToSend.lastName}`,
                email: dataToSend.email,
                phone: dataToSend.phone,
                address: {
                  line1: dataToSend.addressOne,
                  line2: dataToSend.addressTwo || "",
                  city: dataToSend.city,
                  state: dataToSend.state,
                  postal_code: dataToSend.postcode,
                  country: dataToSend.country,
                },
              },
              metadata: {
                order_key: orderKey,
                customer_id: formData?.customer_id || "guest",
              },
            }),
          });

          const paymentResult = await paymentResponse.json();
          logger.log("Payment processing result:", paymentResult);

          if (!paymentResult.success) {
            // Payment failed - update order to failed status
            logger.error("Payment failed, updating order status...");

            await fetch("/api/update-order-status", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId: orderId,
                status: "failed",
                errorMessage:
                  paymentResult.error || "Payment authorization failed",
              }),
            });

            throw new Error(paymentResult.error || "Payment failed");
          }

          logger.log(`✓ Payment authorized: ${paymentResult.chargeId}`);

          // STEP 3: Update order status to on-hold (awaiting manual capture)
          logger.log("STEP 3: Updating order status...");
          const statusResponse = await fetch("/api/update-order-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              status: "on-hold", // Authorization only, awaiting manual capture
              paymentIntentId: paymentResult.chargeId, // Use charge ID
              chargeId: paymentResult.chargeId,
              transactionId: paymentResult.chargeId,
              paymentMethod: "stripe",
              cardBrand: paymentResult.cardBrand || dataToSend.stripeCardBrand,
              cardLast4: paymentResult.cardLast4 || dataToSend.stripeCardLast4,
            }),
          });

          const statusResult = await statusResponse.json();
          logger.log("Order status update result:", statusResult);

          if (!statusResult.success) {
            logger.warn("Failed to update order status, but payment succeeded");
            // Don't throw error - payment succeeded, just log the warning
          }

          logger.log("✓ Order status updated successfully");
          logger.log("=== 3-STEP PAYMENT FLOW COMPLETED ===");

          // Empty the cart after successful checkout
          try {
            logger.log("Emptying cart after successful checkout...");
            const { emptyCart } = await import("@/lib/cart/cartService");
            await emptyCart();
            logger.log("Cart emptied successfully after checkout");
          } catch (emptyError) {
            logger.error("Error emptying cart after checkout:", emptyError);
            // Don't block the redirect if cart emptying fails
          }

          // Success! Redirect to order received page
          toast.success("Order placed successfully!");
          router.push(
            `/checkout/order-received/${orderId}?key=${orderKey}${buildFlowQueryString() ? buildFlowQueryString() : ""
            }`
          );
          return;
        } catch (error) {
          logger.error("3-step payment flow error:", error);
          toast.error(error.message || "Payment failed. Please try again.");
          setSubmitting(false);
          return;
        }
      }

      // ========================================
      // FALLBACK: Old single-step checkout for Bambora or other payment methods
      // ========================================
      logger.log("Using single-step checkout (Bambora/other)...");
      const res = await fetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify(dataToSend),
      });

      // Use centralized payment response handler for regular checkout
      // Note: For regular checkout, we don't have an orderId yet, so pass null
      const data = await handlePaymentResponse(res, null);

      if (data.error) {
        // Extract meaningful error message from complex objects
        let errorString;
        if (typeof data.error === "string") {
          errorString = data.error;
        } else if (data.error && typeof data.error === "object") {
          // Try to extract meaningful message from object
          errorString =
            data.error.message ||
            data.error.error?.message ||
            data.error.toString();
        } else {
          errorString = String(data.error || "Unknown error occurred");
        }

        // Transform the error message if it's a WordPress critical error
        const userFriendlyMessage = isWordPressCriticalError(errorString)
          ? transformPaymentError(errorString)
          : errorString;

        toast.error(userFriendlyMessage);
        // Reload the page after showing error for new card payments
        // setTimeout(() => {
        //   window.location.reload();
        // }, 2000); // Wait 2 seconds to show the error message
        return;
      }

      if (data.success) {
        toast.success("Order created successfully!");
        const order_id = data.data.id || data.data.order_id;
        const order_key = data.data.order_key || "";

        // Empty the cart after successful checkout
        try {
          logger.log("Emptying cart after successful checkout...");
          const { emptyCart } = await import("@/lib/cart/cartService");
          await emptyCart();
          logger.log("Cart emptied successfully after checkout");
        } catch (emptyError) {
          logger.error("Error emptying cart after checkout:", emptyError);
          // Don't block the redirect if cart emptying fails
        }

        router.push(
          `/checkout/order-received/${order_id}?key=${order_key}${buildFlowQueryString() ? buildFlowQueryString() : ""
          }`
        );
      }
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
          CartAndPayment={
            <Payment
              isUpdatingShipping={isUpdatingShipping}
              ageValidationFailed={ageValidationFailed}
              isPaymentValid={isPaymentValid}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              cardNumber={cardNumber}
              setCardNumber={setCardNumber}
              expiry={expiry}
              setExpiry={setExpiry}
              cvc={cvc}
              setCvc={setCvc}
              cardType={cardType}
              setCardType={setCardType}
              savedCards={savedCards}
              setSavedCards={setSavedCards}
              selectedCard={selectedCard}
              setSelectedCard={setSelectedCard}
              isLoadingSavedCards={isLoadingSavedCards}
              cartItems={
                <CartAndPayment
                  items={cartItems.items}
                  cartItems={cartItems}
                  setCartItems={setCartItems}
                  setFormData={setFormData}
                  formData={formData}
                  handleSubmit={handleSubmit}
                  cardNumber={cardNumber}
                  isUpdatingShipping={isUpdatingShipping}
                  setCardNumber={setCardNumber}
                  expiry={expiry}
                  setExpiry={setExpiry}
                  cvc={cvc}
                  setCvc={setCvc}
                  cardType={cardType}
                  setCardType={setCardType}
                  isEdFlow={isEdFlow}
                  savedCards={savedCards}
                  setSavedCards={setSavedCards}
                  selectedCard={selectedCard}
                  setSelectedCard={setSelectedCard}
                  isLoadingSavedCards={isLoadingSavedCards}
                  ageValidationFailed={ageValidationFailed}
                  isPaymentValid={isPaymentValid}
                  paymentValidationMessage={paymentValidationMessage}
                  onStripeReady={setStripeElements}
                />
              }
            />
          }
        />
        <div className="md:block hidden">
          <CartAndPayment
            items={cartItems.items}
            cartItems={cartItems}
            setCartItems={setCartItems}
            setFormData={setFormData}
            formData={formData}
            handleSubmit={handleSubmit}
            cardNumber={cardNumber}
            isUpdatingShipping={isUpdatingShipping}
            setCardNumber={setCardNumber}
            expiry={expiry}
            setExpiry={setExpiry}
            cvc={cvc}
            setCvc={setCvc}
            cardType={cardType}
            setCardType={setCardType}
            isEdFlow={isEdFlow}
            savedCards={savedCards}
            setSavedCards={setSavedCards}
            selectedCard={selectedCard}
            setSelectedCard={setSelectedCard}
            isLoadingSavedCards={isLoadingSavedCards}
            ageValidationFailed={ageValidationFailed}
            isPaymentValid={isPaymentValid}
            paymentValidationMessage={paymentValidationMessage}
            onStripeReady={setStripeElements}
          />
        </div>
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
