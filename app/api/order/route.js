import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getClientDomain } from "@/lib/utils/getClientDomain";

const BASE_URL = process.env.BASE_URL;

export async function GET(req) {
  try {
    const order_id = req.nextUrl.searchParams.get("order_id");
    const order_key = req.nextUrl.searchParams.get("order_key");
    const cookieStore = await cookies();

    const encodedCredentials = cookieStore.get("authToken");

    if (!encodedCredentials) {
      return NextResponse.json(
        {
          error: "Not authenticated..",
        },
        { status: 500 }
      );
    }

    // Get client domain for X-Client-Domain header (required for backend domain whitelist)
    // Returns only the domain name (hostname) without protocol or port
    const clientDomain = getClientDomain(req);

    // Try by ID first, then by order number if needed
    let response;
    try {
      response = await axios.get(`${BASE_URL}/api/v1/orders/${order_id}`, {
        headers: {
          Authorization: `${encodedCredentials.value}`,
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "X-Client-Domain": clientDomain,
        },
      });
    } catch (error) {
      // If not found by ID, try by order number
      if (error.response?.status === 404 && order_key) {
        response = await axios.get(
          `${BASE_URL}/api/v1/orders/order-number/${order_key}`,
          {
            headers: {
              Authorization: `${encodedCredentials.value}`,
              accept: "application/json",
              "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
              "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
              "X-Client-Domain": clientDomain,
            },
          }
        );
      } else {
        throw error;
      }
    }

    // Return backend order structure directly (no conversion)
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error("Error getting order:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: error.response?.data?.message || "Failed to get order",
      },
      { status: error.response?.status || 500 }
    );
  }
}
