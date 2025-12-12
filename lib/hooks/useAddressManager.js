import { useState, useEffect, useCallback } from "react";
import { logger } from "@/utils/devLogger";
import { getUserData } from "@/services/userDataService";

/**
 * Custom hook for managing address data in checkout
 * Handles fetching, saving, and populating address information from multiple sources
 */
export const useAddressManager = (initialFormData = {}) => {
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  // Cache profile data to avoid redundant API calls
  const [cachedProfileData, setCachedProfileData] = useState(null);
  const [profileFetchAttempted, setProfileFetchAttempted] = useState(false);

  // Function to safely parse JSON from localStorage
  const safeParseJSON = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.log("Error parsing JSON from localStorage:", error);
      return null;
    }
  };

  // Function to safely save to localStorage
  const safeSetLocalStorage = (key, data) => {
    try {
      if (typeof window !== "undefined" && data) {
        localStorage.setItem(key, JSON.stringify(data));
        logger.log(`Saved ${key} to localStorage:`, data);
        return true;
      }
    } catch (error) {
      logger.log(`Error saving ${key} to localStorage:`, error);
    }
    return false;
  };

  // Function to get address data from localStorage
  const getStoredAddressData = useCallback(() => {
    if (typeof window === "undefined") return { billing: null, shipping: null };

    const storedBilling = safeParseJSON(localStorage.getItem("checkout_billing_address"));
    const storedShipping = safeParseJSON(localStorage.getItem("checkout_shipping_address"));

    return {
      billing: storedBilling,
      shipping: storedShipping,
    };
  }, []);

  // Function to save address data to localStorage
  const saveAddressData = useCallback((billingAddress, shippingAddress) => {
    if (typeof window === "undefined") return;

    // Only save if there's meaningful address data (not just empty objects)
    if (billingAddress && (billingAddress.address_1 || billingAddress.city || billingAddress.postcode)) {
      // Create a clean copy without undefined values, but preserve all string values including empty strings
      const cleanBilling = Object.fromEntries(
        Object.entries(billingAddress).filter(([_, value]) => {
          // Keep all non-null, non-undefined values (including empty strings and zeros)
          return value !== undefined && value !== null;
        })
      );
      
      // Ensure address_1 is properly preserved
      if (billingAddress.address_1) {
        cleanBilling.address_1 = String(billingAddress.address_1);
      }
      
      logger.log("Saving billing address to localStorage:", cleanBilling);
      safeSetLocalStorage("checkout_billing_address", cleanBilling);
    }

    if (shippingAddress && (shippingAddress.address_1 || shippingAddress.city || shippingAddress.postcode)) {
      // Create a clean copy without undefined values, but preserve all string values including empty strings
      const cleanShipping = Object.fromEntries(
        Object.entries(shippingAddress).filter(([_, value]) => {
          // Keep all non-null, non-undefined values (including empty strings and zeros)
          return value !== undefined && value !== null;
        })
      );
      
      // Ensure address_1 is properly preserved
      if (shippingAddress.address_1) {
        cleanShipping.address_1 = String(shippingAddress.address_1);
      }
      
      logger.log("Saving shipping address to localStorage:", cleanShipping);
      safeSetLocalStorage("checkout_shipping_address", cleanShipping);
    }
  }, []);

  // Function to get user info from cookies using unified service
  const getCookieUserInfo = useCallback(() => {
    if (typeof window === "undefined") return { firstName: "", lastName: "" };

    try {
      const userData = getUserData();
      if (userData?.user) {
        return {
          firstName: userData.user.firstName || "",
          lastName: userData.user.lastName || "",
        };
      }
      return { firstName: "", lastName: "" };
    } catch (error) {
      logger.log("Error reading user data:", error);
      return { firstName: "", lastName: "" };
    }
  }, []);

  // Function to fetch profile data with caching
  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    // Return cached data if available and not forcing refresh
    if (cachedProfileData && !forceRefresh) {
      logger.log("Using cached profile data (avoiding redundant API call)");
      return cachedProfileData;
    }

    // If we already attempted to fetch and got null, don't try again
    if (profileFetchAttempted && !cachedProfileData && !forceRefresh) {
      logger.log("Profile fetch already attempted, returning null");
      return null;
    }

    try {
      setProfileFetchAttempted(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/profile?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          logger.log("Profile data fetched successfully:", data);
          // Cache the profile data
          setCachedProfileData(data);
          return data;
        }
      }
      // Cache null result to prevent repeated failed attempts
      setCachedProfileData(null);
      return null;
    } catch (error) {
      logger.log("Error fetching profile data:", error);
      // Cache null result to prevent repeated failed attempts
      setCachedProfileData(null);
      return null;
    }
  }, [cachedProfileData, profileFetchAttempted]);

  // Main function to populate address data from all sources
  const populateAddressData = useCallback(async (currentFormData) => {
    // Don't set loading if we're just checking cached data
    const needsFetch = !cachedProfileData && !profileFetchAttempted;
    
    if (needsFetch) {
      setIsLoadingAddresses(true);
    }
    logger.log("=== POPULATING ADDRESS DATA ===");

    try {
      // Check if we already have complete address data
      const hasCompleteAddress = 
        (currentFormData.billing_address?.address_1 && 
         currentFormData.billing_address?.city && 
         currentFormData.billing_address?.postcode) ||
        (currentFormData.shipping_address?.address_1 && 
         currentFormData.shipping_address?.city && 
         currentFormData.shipping_address?.postcode);

      if (hasCompleteAddress) {
        logger.log("Complete address data already available");
        if (needsFetch) {
          setIsLoadingAddresses(false);
        }
        return currentFormData;
      }

      let updatedFormData = { ...currentFormData };

      // Priority 1: Try to fetch from user profile (for logged-in users)
      // Use cached data if available, only fetch if not cached
      const profileData = await fetchProfileData(false);
      // Check if profile has any meaningful data: address, phone, province/state
      const hasProfileData = profileData && (
        profileData.billing_address_1 || 
        profileData.shipping_address_1 ||
        profileData.phone ||
        profileData.province ||
        profileData.billing_state ||
        profileData.shipping_state ||
        profileData.first_name ||
        profileData.email
      );
      
      if (hasProfileData) {
        logger.log("Using profile data for addresses and user info");
        
        // Extract date of birth from profile data
        const dateOfBirth = profileData.date_of_birth || 
                           profileData.raw_profile_data?.custom_meta?.date_of_birth || "";
        
        logger.log("Profile date of birth found:", dateOfBirth);
        
        updatedFormData = {
          ...updatedFormData,
          billing_address: {
            ...updatedFormData.billing_address,
            first_name: updatedFormData.billing_address?.first_name || profileData.first_name || "",
            last_name: updatedFormData.billing_address?.last_name || profileData.last_name || "",
            email: updatedFormData.billing_address?.email || profileData.email || "",
            // Use profile phone if current phone is empty or invalid
            phone: (updatedFormData.billing_address?.phone && updatedFormData.billing_address.phone.trim()) 
              ? updatedFormData.billing_address.phone.trim()
              : (profileData.phone && profileData.phone.trim())
              ? profileData.phone.trim()
              : "",
            address_1: updatedFormData.billing_address?.address_1 || profileData.billing_address_1 || "",
            address_2: updatedFormData.billing_address?.address_2 || profileData.billing_address_2 || "",
            city: updatedFormData.billing_address?.city || profileData.billing_city || "",
            // Prioritize: existing state > profile billing_state > profile province
            state: (updatedFormData.billing_address?.state && updatedFormData.billing_address.state.trim())
              ? updatedFormData.billing_address.state.trim()
              : (profileData.billing_state && profileData.billing_state.trim())
              ? profileData.billing_state.trim()
              : (profileData.province && profileData.province.trim())
              ? profileData.province.trim()
              : "",
            postcode: updatedFormData.billing_address?.postcode || profileData.billing_postcode || "",
            country: updatedFormData.billing_address?.country || profileData.billing_country || "US",
            date_of_birth: updatedFormData.billing_address?.date_of_birth || dateOfBirth,
          },
          shipping_address: {
            ...updatedFormData.shipping_address,
            first_name: updatedFormData.shipping_address?.first_name || profileData.first_name || "",
            last_name: updatedFormData.shipping_address?.last_name || profileData.last_name || "",
            // Use profile phone if current phone is empty or invalid
            phone: (updatedFormData.shipping_address?.phone && updatedFormData.shipping_address.phone.trim())
              ? updatedFormData.shipping_address.phone.trim()
              : (profileData.phone && profileData.phone.trim())
              ? profileData.phone.trim()
              : "",
            address_1: updatedFormData.shipping_address?.address_1 || profileData.shipping_address_1 || profileData.billing_address_1 || "",
            address_2: updatedFormData.shipping_address?.address_2 || profileData.shipping_address_2 || profileData.billing_address_2 || "",
            city: updatedFormData.shipping_address?.city || profileData.shipping_city || profileData.billing_city || "",
            // Prioritize: existing state > profile shipping_state > profile billing_state > profile province
            state: (updatedFormData.shipping_address?.state && updatedFormData.shipping_address.state.trim())
              ? updatedFormData.shipping_address.state.trim()
              : (profileData.shipping_state && profileData.shipping_state.trim())
              ? profileData.shipping_state.trim()
              : (profileData.billing_state && profileData.billing_state.trim())
              ? profileData.billing_state.trim()
              : (profileData.province && profileData.province.trim())
              ? profileData.province.trim()
              : "",
            postcode: updatedFormData.shipping_address?.postcode || profileData.shipping_postcode || profileData.billing_postcode || "",
            country: updatedFormData.shipping_address?.country || profileData.shipping_country || "US",
            date_of_birth: updatedFormData.shipping_address?.date_of_birth || dateOfBirth,
          },
          // Also add date_of_birth at the root level for accessibility
          date_of_birth: updatedFormData.date_of_birth || dateOfBirth,
        };
        
        logger.log("Updated form data with profile:", {
          billing_phone: updatedFormData.billing_address.phone,
          billing_state: updatedFormData.billing_address.state,
          billing_address_1: updatedFormData.billing_address.address_1,
          billing_city: updatedFormData.billing_address.city,
          billing_postcode: updatedFormData.billing_address.postcode,
          billing_date_of_birth: updatedFormData.billing_address.date_of_birth,
        });

        if (needsFetch) {
          setIsLoadingAddresses(false);
        }
        return updatedFormData;
      }

      // Priority 2: Try localStorage
      const storedData = getStoredAddressData();
      if (storedData.billing || storedData.shipping) {
        logger.log("Using localStorage data for addresses");
        
        updatedFormData = {
          ...updatedFormData,
          billing_address: {
            ...updatedFormData.billing_address,
            ...(storedData.billing || {}),
          },
          shipping_address: {
            ...updatedFormData.shipping_address,
            ...(storedData.shipping || {}),
          },
        };

        if (needsFetch) {
          setIsLoadingAddresses(false);
        }
        return updatedFormData;
      }

      // Priority 3: Try cookies for basic info
      const cookieInfo = getCookieUserInfo();
      if (cookieInfo.firstName || cookieInfo.lastName) {
        logger.log("Using cookie data for basic user info");
        
        updatedFormData = {
          ...updatedFormData,
          billing_address: {
            ...updatedFormData.billing_address,
            first_name: updatedFormData.billing_address?.first_name || cookieInfo.firstName,
            last_name: updatedFormData.billing_address?.last_name || cookieInfo.lastName,
          },
          shipping_address: {
            ...updatedFormData.shipping_address,
            first_name: updatedFormData.shipping_address?.first_name || cookieInfo.firstName,
            last_name: updatedFormData.shipping_address?.last_name || cookieInfo.lastName,
          },
        };
      }

      if (needsFetch) {
        setIsLoadingAddresses(false);
      }
      return updatedFormData;

    } catch (error) {
      logger.error("Error populating address data:", error);
      if (needsFetch) {
        setIsLoadingAddresses(false);
      }
      return currentFormData;
    }
  }, [fetchProfileData, getStoredAddressData, getCookieUserInfo, cachedProfileData, profileFetchAttempted]);

  // Function to clear stored address data
  const clearStoredAddresses = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("checkout_billing_address");
        localStorage.removeItem("checkout_shipping_address");
        logger.log("Cleared stored address data");
      } catch (error) {
        logger.log("Error clearing stored addresses:", error);
      }
    }
  }, []);

  // Function to clear cached profile data (useful when user logs in/out)
  const clearCachedProfileData = useCallback(() => {
    setCachedProfileData(null);
    setProfileFetchAttempted(false);
    logger.log("Cleared cached profile data");
  }, []);

  // Listen for logout events to clear cached data
  useEffect(() => {
    const handleUserLogout = () => {
      logger.log("User logged out - clearing address manager cache");
      clearCachedProfileData();
      clearStoredAddresses();
    };

    window.addEventListener("user-logged-out", handleUserLogout);

    return () => {
      window.removeEventListener("user-logged-out", handleUserLogout);
    };
  }, [clearCachedProfileData, clearStoredAddresses]);

  return {
    isLoadingAddresses,
    populateAddressData,
    saveAddressData,
    getStoredAddressData,
    clearStoredAddresses,
    fetchProfileData,
    getCookieUserInfo,
    clearCachedProfileData,
    cachedProfileData,
  };
};

export default useAddressManager;
