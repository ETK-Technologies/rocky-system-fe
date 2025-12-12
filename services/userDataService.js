/**
 * Unified User Data Service
 * Centralized service for managing all user authentication and profile data
 * Uses cookies as primary storage (server-side accessible)
 */

import { logger } from "@/utils/devLogger";

// Cookie names (standardized, consistent naming)
const COOKIE_NAMES = {
  // Auth
  AUTH_TOKEN: "authToken",
  REFRESH_TOKEN: "refreshToken",
  
  // User (from login/register response)
  USER_ID: "userId",
  USER_EMAIL: "userEmail",
  USER_FIRST_NAME: "userFirstName",
  USER_LAST_NAME: "userLastName",
  USER_AVATAR: "userAvatar",
  USER_ROLE: "userRole",
  
  // Profile (from profile API)
  USER_PHONE: "userPhone",
  USER_PROVINCE: "userProvince",
  USER_DATE_OF_BIRTH: "userDateOfBirth",
  USER_GENDER: "userGender",
  
  // Legacy/backward compatibility (for gradual migration)
  DISPLAY_NAME: "displayName", // Maps to userFirstName
  LAST_NAME: "lastName", // Maps to userLastName
  USER_NAME: "userName", // Full name
};

/**
 * User Data Structure
 */
export const UserDataShape = {
  auth: {
    accessToken: null,
    refreshToken: null,
  },
  user: {
    id: null,
    email: null,
    firstName: null,
    lastName: null,
    avatar: null,
    role: null,
  },
  profile: {
    phone: null,
    province: null,
    dateOfBirth: null,
    gender: null,
    billingAddress: {},
    shippingAddress: {},
  },
};

/**
 * Get cookie value (client-side)
 */
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
};

/**
 * Set cookie (client-side)
 */
const setCookie = (name, value, options = {}) => {
  if (typeof document === "undefined") return;
  
  const {
    maxAge = 7 * 24 * 60 * 60, // 7 days default
    httpOnly = false,
    secure = process.env.NODE_ENV === "production",
    sameSite = "lax",
    path = "/",
  } = options;
  
  let cookieString = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;
  
  if (maxAge) {
    cookieString += `; max-age=${maxAge}`;
  }
  
  if (secure) {
    cookieString += `; Secure`;
  }
  
  // Note: httpOnly can only be set server-side
  document.cookie = cookieString;
};

/**
 * Delete cookie (client-side)
 */
const deleteCookie = (name, path = "/") => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
};

/**
 * SERVER-SIDE: Get user data from cookies
 * @param {Object} cookieStore - Next.js cookie store from cookies()
 * @returns {Object} User data object
 */
export const getUserDataFromCookies = (cookieStore) => {
  if (!cookieStore) {
    logger.warn("getUserDataFromCookies: cookieStore not provided");
    return null;
  }
  
  try {
    const authToken = cookieStore.get(COOKIE_NAMES.AUTH_TOKEN)?.value;
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
    const userId = cookieStore.get(COOKIE_NAMES.USER_ID)?.value;
    
    if (!authToken || !userId) {
      return null; // Not authenticated
    }
    
    return {
      auth: {
        accessToken: authToken,
        refreshToken: refreshToken || null,
      },
      user: {
        id: userId || null,
        email: cookieStore.get(COOKIE_NAMES.USER_EMAIL)?.value || null,
        firstName: cookieStore.get(COOKIE_NAMES.USER_FIRST_NAME)?.value || 
                   cookieStore.get(COOKIE_NAMES.DISPLAY_NAME)?.value || null,
        lastName: cookieStore.get(COOKIE_NAMES.USER_LAST_NAME)?.value || 
                  cookieStore.get(COOKIE_NAMES.LAST_NAME)?.value || null,
        avatar: cookieStore.get(COOKIE_NAMES.USER_AVATAR)?.value || null,
        role: cookieStore.get(COOKIE_NAMES.USER_ROLE)?.value || null,
      },
      profile: {
        phone: cookieStore.get(COOKIE_NAMES.USER_PHONE)?.value || 
               cookieStore.get("phone")?.value || null, // Legacy support
        province: cookieStore.get(COOKIE_NAMES.USER_PROVINCE)?.value || 
                  cookieStore.get("province")?.value || null, // Legacy support
        dateOfBirth: cookieStore.get(COOKIE_NAMES.USER_DATE_OF_BIRTH)?.value || 
                     cookieStore.get("DOB")?.value || 
                     cookieStore.get("dob")?.value || null, // Legacy support
        gender: cookieStore.get(COOKIE_NAMES.USER_GENDER)?.value || null,
      },
    };
  } catch (error) {
    logger.error("Error getting user data from cookies:", error);
    return null;
  }
};

/**
 * SERVER-SIDE: Set user data to cookies
 * @param {Object} cookieStore - Next.js cookie store from cookies()
 * @param {Object} userData - User data object
 */
export const setUserDataToCookies = (cookieStore, userData) => {
  if (!cookieStore || !userData) {
    logger.warn("setUserDataToCookies: cookieStore or userData not provided");
    return;
  }
  
  try {
    // Set auth tokens
    if (userData.auth?.accessToken) {
      cookieStore.set(COOKIE_NAMES.AUTH_TOKEN, userData.auth.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }
    
    if (userData.auth?.refreshToken) {
      cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, userData.auth.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }
    
    // Set user data
    if (userData.user) {
      if (userData.user.id) {
        cookieStore.set(COOKIE_NAMES.USER_ID, userData.user.id);
      }
      if (userData.user.email) {
        cookieStore.set(COOKIE_NAMES.USER_EMAIL, userData.user.email);
      }
      if (userData.user.firstName) {
        cookieStore.set(COOKIE_NAMES.USER_FIRST_NAME, userData.user.firstName);
        // Legacy support
        cookieStore.set(COOKIE_NAMES.DISPLAY_NAME, userData.user.firstName);
      }
      if (userData.user.lastName !== undefined) {
        cookieStore.set(COOKIE_NAMES.USER_LAST_NAME, userData.user.lastName || "");
        // Legacy support
        cookieStore.set(COOKIE_NAMES.LAST_NAME, userData.user.lastName || "");
      }
      if (userData.user.firstName || userData.user.lastName) {
        const fullName = `${userData.user.firstName || ""} ${userData.user.lastName || ""}`.trim();
        cookieStore.set(COOKIE_NAMES.USER_NAME, fullName);
      }
      if (userData.user.avatar) {
        cookieStore.set(COOKIE_NAMES.USER_AVATAR, userData.user.avatar);
      }
      if (userData.user.role) {
        cookieStore.set(COOKIE_NAMES.USER_ROLE, userData.user.role);
      }
    }
    
    // Set profile data
    if (userData.profile) {
      if (userData.profile.phone) {
        cookieStore.set(COOKIE_NAMES.USER_PHONE, userData.profile.phone);
      }
      if (userData.profile.province) {
        cookieStore.set(COOKIE_NAMES.USER_PROVINCE, userData.profile.province);
      }
      if (userData.profile.dateOfBirth) {
        cookieStore.set(COOKIE_NAMES.USER_DATE_OF_BIRTH, userData.profile.dateOfBirth);
      }
      if (userData.profile.gender) {
        cookieStore.set(COOKIE_NAMES.USER_GENDER, userData.profile.gender);
      }
    }
    
    logger.log("User data set to cookies successfully");
  } catch (error) {
    logger.error("Error setting user data to cookies:", error);
  }
};

/**
 * SERVER-SIDE: Clear all user data from cookies
 * @param {Object} cookieStore - Next.js cookie store from cookies()
 */
export const clearUserDataFromCookies = (cookieStore) => {
  if (!cookieStore) {
    logger.warn("clearUserDataFromCookies: cookieStore not provided");
    return;
  }
  
  try {
    // Clear all user-related cookies
    const allCookieNames = [
      ...Object.values(COOKIE_NAMES),
      // Legacy cookie names for cleanup
      "phone",
      "province",
      "DOB",
      "dob",
      "pn",
      "userName",
      "stripeCustomerId", // Related to user but not part of core user data
    ];
    
    allCookieNames.forEach((cookieName) => {
      try {
        cookieStore.delete(cookieName);
      } catch (error) {
        logger.warn(`Failed to delete cookie ${cookieName}:`, error);
      }
    });
    
    logger.log("All user data cleared from cookies");
  } catch (error) {
    logger.error("Error clearing user data from cookies:", error);
  }
};

/**
 * CLIENT-SIDE: Get user data
 * NOTE: authToken and refreshToken are httpOnly, so they won't be accessible client-side
 * This function only returns user data that is available in non-httpOnly cookies
 * @returns {Object|null} User data object or null if not authenticated
 */
export const getUserData = () => {
  if (typeof window === "undefined") {
    logger.warn("getUserData: Cannot access cookies on server-side, use getUserDataFromCookies instead");
    return null;
  }
  
  // Check userId (not httpOnly) to determine if authenticated
  const userId = getCookie(COOKIE_NAMES.USER_ID);
  
  if (!userId) {
    return null; // Not authenticated
  }
  
  return {
    auth: {
      // httpOnly cookies are not accessible client-side
      accessToken: null,
      refreshToken: null,
    },
    user: {
      id: userId,
      email: getCookie(COOKIE_NAMES.USER_EMAIL) || null,
      firstName: getCookie(COOKIE_NAMES.USER_FIRST_NAME) || getCookie(COOKIE_NAMES.DISPLAY_NAME) || null,
      lastName: getCookie(COOKIE_NAMES.USER_LAST_NAME) || getCookie(COOKIE_NAMES.LAST_NAME) || null,
      avatar: getCookie(COOKIE_NAMES.USER_AVATAR) || null,
      role: getCookie(COOKIE_NAMES.USER_ROLE) || null,
    },
    profile: {
      phone: getCookie(COOKIE_NAMES.USER_PHONE) || getCookie("phone") || null,
      province: getCookie(COOKIE_NAMES.USER_PROVINCE) || getCookie("province") || null,
      dateOfBirth: getCookie(COOKIE_NAMES.USER_DATE_OF_BIRTH) || getCookie("DOB") || getCookie("dob") || null,
      gender: getCookie(COOKIE_NAMES.USER_GENDER) || null,
    },
  };
};

/**
 * CLIENT-SIDE: Check if user is authenticated
 * Uses userId cookie (non-httpOnly) to determine authentication status
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  
  const userId = getCookie(COOKIE_NAMES.USER_ID);
  
  return !!userId;
};

/**
 * CLIENT-SIDE: Get user ID
 * @returns {string|null}
 */
export const getUserId = () => {
  if (typeof window === "undefined") return null;
  return getCookie(COOKIE_NAMES.USER_ID) || null;
};

/**
 * CLIENT-SIDE: Get auth token
 * NOTE: authToken is httpOnly, so it's not accessible client-side via document.cookie
 * This function will return null on client-side
 * Use server-side getUserDataFromCookies instead for auth token access
 * @returns {string|null}
 */
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  // httpOnly cookie is not accessible via document.cookie
  return null;
};

/**
 * Helper: Transform login/register response to user data structure
 * @param {Object} responseData - Response from login/register API
 * @returns {Object} User data object
 */
export const transformAuthResponse = (responseData) => {
  const { access_token, refresh_token, user } = responseData;
  
  return {
    auth: {
      accessToken: access_token ? `Bearer ${access_token}` : null,
      refreshToken: refresh_token || null,
    },
    user: {
      id: user?.id || null,
      email: user?.email || null,
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      avatar: user?.avatar || null,
      role: user?.role || null,
    },
    profile: {}, // Profile data will be fetched separately
  };
};

/**
 * Helper: Transform profile API response to user data structure
 * @param {Object} profileData - Response from profile API
 * @returns {Object} Profile data object
 */
export const transformProfileResponse = (profileData) => {
  return {
    phone: profileData.phone || null,
    province: profileData.province || null,
    dateOfBirth: profileData.date_of_birth || null,
    gender: profileData.gender || null,
    billingAddress: {
      address1: profileData.billing_address_1 || "",
      address2: profileData.billing_address_2 || "",
      city: profileData.billing_city || "",
      state: profileData.billing_state || "",
      postcode: profileData.billing_postcode || "",
      country: profileData.billing_country || "US",
    },
    shippingAddress: {
      address1: profileData.shipping_address_1 || "",
      address2: profileData.shipping_address_2 || "",
      city: profileData.shipping_city || "",
      state: profileData.shipping_state || "",
      postcode: profileData.shipping_postcode || "",
      country: profileData.shipping_country || "US",
    },
  };
};

/**
 * Helper: Merge profile data into existing user data
 * @param {Object} existingUserData - Current user data
 * @param {Object} profileData - Profile data to merge
 * @returns {Object} Merged user data
 */
export const mergeProfileData = (existingUserData, profileData) => {
  if (!existingUserData) {
    return {
      auth: {},
      user: {},
      profile: profileData || {},
    };
  }
  
  return {
    ...existingUserData,
    profile: {
      ...existingUserData.profile,
      ...profileData,
    },
  };
};

