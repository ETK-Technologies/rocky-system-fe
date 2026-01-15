import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/utils/getOrigin";
import {
  getUserDataFromCookies,
  setUserDataToCookies,
  transformProfileResponse,
  mergeProfileData,
  getAuthTokenFromCookies,
} from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);

    // Check if user is authenticated
    if (!authToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Ensure BASE_URL is set, fallback to production URL if needed
    const apiUrl = BASE_URL || "https://rocky-be-production.up.railway.app";
    const appKey = process.env.NEXT_PUBLIC_APP_KEY;
    const appSecret = process.env.NEXT_PUBLIC_APP_SECRET;

    // Ensure Authorization header has "Bearer " prefix
    const authHeader = authToken.value.startsWith("Bearer ")
      ? authToken.value
      : `Bearer ${authToken.value}`;

    // Fetch user profile data from backend API
    const response = await axios.get(
      `${apiUrl}/api/v1/auth/profile`,
      {
        headers: {
          accept: "*/*",
          "X-App-Key": appKey,
          "X-App-Secret": appSecret,
          Authorization: authHeader,
          "Origin": origin,
        },
      }
    );

    // Extract the profile data from backend API
    const profileData = response.data;

    // Handle error responses
    if (!profileData || profileData.error) {
      return NextResponse.json(
        {
          success: false,
          message: profileData?.message || "Failed to get user profile",
        },
        { status: profileData?.statusCode || 400 }
      );
    }

    // Get existing user data from cookies
    const existingUserData = getUserDataFromCookies(cookieStore);
    
    // Transform profile response to profile data structure
    const profileDataTransformed = transformProfileResponse(profileData);
    
    // Merge profile data into existing user data
    const updatedUserData = existingUserData
      ? mergeProfileData(existingUserData, profileDataTransformed)
      : {
          auth: {},
          user: {},
          profile: profileDataTransformed,
        };
    
    // Update cookies with merged profile data
    if (existingUserData) {
      setUserDataToCookies(cookieStore, updatedUserData);
      logger.log("Profile data updated in cookies");
    }

    // API returns flat structure with all fields directly in the response
    // Map the backend response structure to our frontend format
    // The API response already has the correct field names, just pass them through
    return NextResponse.json({
      success: profileData.success !== false,
      // User data - API returns these fields directly
      first_name: profileData.first_name || "",
      last_name: profileData.last_name || "",
      email: profileData.email || "",
      phone: profileData.phone || "",

      // Custom meta fields
      gender: profileData.gender || "",
      date_of_birth: profileData.date_of_birth || "",
      province: profileData.province || "",

      // Billing address fields - API returns these directly
      billing_address_1: profileData.billing_address_1 || "",
      billing_address_2: profileData.billing_address_2 || "",
      billing_city: profileData.billing_city || "",
      billing_state: profileData.billing_state || "",
      billing_postcode: profileData.billing_postcode || "",
      billing_country: profileData.billing_country || "US",

      // Shipping address fields - API returns these directly
      shipping_address_1: profileData.shipping_address_1 || "",
      shipping_address_2: profileData.shipping_address_2 || "",
      shipping_city: profileData.shipping_city || "",
      shipping_state: profileData.shipping_state || "",
      shipping_postcode: profileData.shipping_postcode || "",
      shipping_country: profileData.shipping_country || "US",

      // Include the raw data for debugging or additional use cases
      raw_profile_data: profileData,
    });
  } catch (error) {
    logger.error(
      "Error fetching user profile:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user profile",
        error: error.response?.data?.message || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
