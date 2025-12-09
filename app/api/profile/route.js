import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/utils/getOrigin";

const BASE_URL = process.env.BASE_URL;

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

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

    // Fetch user profile data from backend API
    const response = await axios.get(
      `${BASE_URL}/api/v1/auth/profile`,
      {
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "Origin": origin,
          Authorization: authToken.value, // Should already include "Bearer " prefix
        },
      }
    );

    // Extract the profile data from backend API
    const profileData = response.data;

    // Handle error responses
    if (profileData.error || !profileData) {
      return NextResponse.json(
        {
          success: false,
          message: profileData?.message || "Failed to get user profile",
        },
        { status: profileData?.statusCode || 400 }
      );
    }

    // Backend API returns user object with nested billing/shipping addresses
    // Map the backend response structure to our frontend format
    const user = profileData.user || profileData;
    const billing = user.billingAddress || user.billing || {};
    const shipping = user.shippingAddress || user.shipping || {};
    const customMeta = user.customMeta || user.meta || {};

    // Format the response for our frontend
    return NextResponse.json({
      success: true,
      // User data
      first_name: user.firstName || user.first_name || "",
      last_name: user.lastName || user.last_name || "",
      email: user.email || "",
      phone: user.phone || billing.phone || customMeta.phone_number || "",

      // Custom meta
      gender: customMeta.gender || user.gender || "",
      date_of_birth: customMeta.date_of_birth || customMeta.dateOfBirth || user.date_of_birth || user.dateOfBirth || "",
      province:
        customMeta.province ||
        billing.state ||
        billing.province ||
        user.province ||
        "",

      // Billing address fields
      billing_address_1: billing.address1 || billing.address_1 || billing.street || "",
      billing_address_2: billing.address2 || billing.address_2 || "",
      billing_city: billing.city || "",
      billing_state: billing.state || billing.province || customMeta.province || "",
      billing_postcode: billing.postalCode || billing.postcode || billing.postal_code || "",
      billing_country: billing.country || "CA",

      // Shipping address fields
      shipping_address_1: shipping.address1 || shipping.address_1 || shipping.street || "",
      shipping_address_2: shipping.address2 || shipping.address_2 || "",
      shipping_city: shipping.city || "",
      shipping_state:
        shipping.state ||
        shipping.province ||
        billing.state ||
        billing.province ||
        customMeta.province ||
        "",
      shipping_postcode: shipping.postalCode || shipping.postcode || shipping.postal_code || "",
      shipping_country: shipping.country || "CA",

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
