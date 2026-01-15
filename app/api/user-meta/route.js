import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getAuthTokenFromCookies, getUserIdFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);

    // Check if user is authenticated
    if (!authToken || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
          userMeta: {},
        },
        { status: 401 }
      );
    }

    // Fetch user metadata from WordPress API
    const response = await axios.get(
      `${BASE_URL}/wp-json/wp/v2/users/${userId.value}`,
      {
        headers: {
          Authorization: authToken.value,
        },
      }
    );

    // Get billing and shipping addresses
    const billingShippingResponse = await axios.get(
      `${BASE_URL}/wp-json/wc/v3/customers/${userId.value}`,
      {
        headers: {
          Authorization: process.env.ADMIN_TOKEN || authToken.value,
        },
      }
    );

    // Extract the user metadata
    const user = response.data;
    const customerData = billingShippingResponse.data;

    // Get the metadata from the meta_input or acf fields
    let userMeta = {};

    if (user.meta_input) {
      userMeta = user.meta_input;
    } else if (user.acf) {
      userMeta = user.acf;
    } else {
      // If we don't have structured metadata, look for specific meta fields
      userMeta = {
        phone_number: user.phone_number || "",
        date_of_birth: user.date_of_birth || "",
        province: user.province || "",
        gender: user.gender || "",
      };
    }

    // Extract billing and shipping addresses from WooCommerce customer data
    const billing = customerData.billing || {};
    const shipping = customerData.shipping || {};

    // Extract Stripe customer ID from WooCommerce metadata
    const metaData = customerData.meta_data || [];
    const stripeCustomerMeta = metaData.find(
      (meta) => meta.key === "_stripe_customer_id"
    );
    const stripeCustomerId = stripeCustomerMeta?.value || null;

    logger.log("Stripe customer ID from WooCommerce:", stripeCustomerId);

    // Return the user metadata and address information
    return NextResponse.json({
      success: true,
      userMeta,
      first_name: user.first_name || customerData.first_name || "",
      last_name: user.last_name || customerData.last_name || "",
      email: user.email || customerData.email || "",
      gender: userMeta.gender || "",
      phone: userMeta.phone_number || billing.phone || "",
      date_of_birth: userMeta.date_of_birth || "",
      province: userMeta.province || billing.state || "",

      // Stripe customer ID
      stripe_customer_id: stripeCustomerId,

      // Billing address fields
      billing_address_1: billing.address_1 || "",
      billing_address_2: billing.address_2 || "",
      billing_city: billing.city || "",
      billing_state: billing.state || userMeta.province || "",
      billing_postcode: billing.postcode || "",
      billing_country: billing.country || "CA",

      // Shipping address fields
      shipping_address_1: shipping.address_1 || "",
      shipping_address_2: shipping.address_2 || "",
      shipping_city: shipping.city || "",
      shipping_state:
        shipping.state || billing.state || userMeta.province || "",
      shipping_postcode: shipping.postcode || "",
      shipping_country: shipping.country || "CA",
    });
  } catch (error) {
    logger.error("Error fetching user metadata:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user metadata",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
