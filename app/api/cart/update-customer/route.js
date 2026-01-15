import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getAuthTokenFromCookies, getCookieValue } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

export async function POST(req) {
  try {
    const requestData = await req.json();
    const cookieStore = await cookies();

    const encodedCredentials = getAuthTokenFromCookies(cookieStore);

    if (!encodedCredentials) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    // Log the request data for debugging
    logger.log(
      "Update customer request data:",
      JSON.stringify(requestData, null, 2)
    );


    // Call the WooCommerce Store API update-customer endpoint
    const response = await axios.post(
      `${BASE_URL}/wp-json/wc/store/v1/cart/update-customer`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: encodedCredentials.value,
          Nonce: cookieStore.get("cart-nonce")?.value || "",
        },
      }
    );

    // Log the response data for debugging
    logger.log("WooCommerce update-customer response:", {
      status: response.status,
      hasShippingRates: response.data.shipping_rates?.length > 0,
      shippingRatesCount: response.data.shipping_rates?.length || 0,
      destination: response.data.shipping_rates?.[0]?.destination,
    });

    // Update cart nonce if provided in response headers
    if (response.headers?.nonce) {
      const { setCookieValue } = await import("@/services/userDataService");
      setCookieValue(cookieStore, "cart-nonce", response.headers.nonce);
    }

    return NextResponse.json(response.data);
  } catch (error) {
    logger.error(
      "Error updating customer:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: error.response?.data?.message || "Failed to update customer",
        details: error.response?.data || null,
      },
      { status: error.response?.status || 500 }
    );
  }
}
