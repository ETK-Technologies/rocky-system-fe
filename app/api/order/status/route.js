import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";

const BASE_URL = process.env.BASE_URL;

export async function GET(req) {
  try {
    const order_id = req.nextUrl.searchParams.get("id");
    if (!order_id) {
      return NextResponse.json(
        { success: false, message: "Order ID is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken");

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get order status from new backend API
    // Try by ID first, then by order number if needed
    let response;
    try {
      response = await axios.get(
        `${BASE_URL}/api/v1/orders/${order_id}`,
        {
          headers: {
            Authorization: `${authToken.value}`,
            accept: "application/json",
            "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
            "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          },
        }
      );
    } catch (error) {
      // If not found by ID, try by order number
      if (error.response?.status === 404) {
        response = await axios.get(
          `${BASE_URL}/api/v1/orders/order-number/${order_id}`,
          {
            headers: {
              Authorization: `${authToken.value}`,
              accept: "application/json",
              "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
              "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
            },
          }
        );
      } else {
        throw error;
      }
    }

    const order = response.data;

    // Return just the necessary status information (mapped from new backend format)
    return NextResponse.json({
      success: true,
      id: order.id || order.orderId,
      status: order.status || order.orderStatus,
      payment_method: order.paymentMethod || order.payment?.method,
      transaction_id: order.transactionId || order.payment?.transactionId,
      total: order.totalAmount || order.total,
    });
  } catch (error) {
    logger.error(
      "Error checking order status:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data?.message || "Failed to check order status",
      },
      { status: error.response?.status || 500 }
    );
  }
}
