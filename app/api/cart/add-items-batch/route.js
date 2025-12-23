import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";
import {
  ensureValidCartNonce,
  updateCartNonceFromResponse,
} from "@/utils/nonceManager";

const BASE_URL = process.env.BASE_URL;

/**
 * API endpoint for batch adding multiple items to cart
 * Uses WooCommerce Store API batch endpoint to add multiple items in a single request
 */
export async function POST(req) {
  try {
    logger.log("Starting batch cart add-items API endpoint");

    const { items } = await req.json();
    logger.log(
      `Received ${items?.length || 0} items for batch cart addition:`,
      JSON.stringify(items, null, 2)
    );

    const cookieStore = await cookies();
    const encodedCredentials = cookieStore.get("authToken");

    if (!encodedCredentials) {
      logger.log("Batch cart add failed: User not authenticated");
      return NextResponse.json(
        {
          error: "User not authenticated",
        },
        { status: 401 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.log("Batch cart add failed: No valid items provided");
      return NextResponse.json(
        {
          error: "No valid items provided",
        },
        { status: 500 }
      );
    }

    // Validate batch size limit (WooCommerce limit is 100)
    if (items.length > 100) {
      logger.log(`Batch size too large: ${items.length} items (max 100)`);
      return NextResponse.json(
        {
          error: "Batch size too large. Maximum 100 items allowed.",
        },
        { status: 500 }
      );
    }

    // Use unified nonce management
    const nonceResult = await ensureValidCartNonce(
      cookieStore,
      encodedCredentials
    );
    const currentNonce = nonceResult.nonce;

    // Build batch request structure
    const batchRequests = items.map((item) => {
      // Prepare cart data for each item (same structure as individual add-item endpoint)
      const cartData = {
        id: item.productId,
        quantity: item.quantity || 1,
      };

      // Add variation ID if provided
      if (item.variationId) {
        cartData.variation_id = item.variationId;
      }

      // Add subscription data if this is a subscription product
      if (item.isSubscription) {
        cartData.meta_data = [
          {
            key: "_subscription_period",
            value:
              (item.subscriptionPeriod || "1_month").split("_")[1] || "month",
          },
          {
            key: "_subscription_period_interval",
            value: (item.subscriptionPeriod || "1_month").split("_")[0] || "1",
          },
          ...(item.meta_data || []),
        ];
      } else if (item.meta_data && item.meta_data.length > 0) {
        cartData.meta_data = item.meta_data;
      }

      // Add variety pack tracking metadata if this is a variety pack product
      if (item.isVarietyPack && item.varietyPackId) {
        const varietyPackMeta = [
          {
            key: "_is_variety_pack",
            value: "true",
          },
          {
            key: "_variety_pack_id",
            value: item.varietyPackId,
          },
        ];

        if (cartData.meta_data) {
          cartData.meta_data.push(...varietyPackMeta);
        } else {
          cartData.meta_data = varietyPackMeta;
        }
      }

      // Add attributes if provided (for variable products)
      if (item.attributes) {
        cartData.item_data = { attributes: item.attributes };
      }


      logger.log("cartData:", cartData);
      // Build the individual request for the batch
      const batchRequest = {
        path: "/wc/store/v1/cart/add-item",
        method: "POST",
        body: cartData,
      };

      // Add nonce to headers if available
      if (currentNonce) {
        batchRequest.headers = {
          Nonce: currentNonce,
          "X-WC-Store-API-Nonce": currentNonce,
        };
      }

      return batchRequest;
    });

    logger.log(
      "Sending batch request to WooCommerce:",
      JSON.stringify(
        {
          requests: batchRequests,
        },
        null,
        2
      )
    );

    // Send batch request to WooCommerce
    const batchResponse = await axios.post(
      `${BASE_URL}/wp-json/wc/store/v1/batch`,
      {
        requests: batchRequests,
      },
      {
        headers: {
          Authorization: `${encodedCredentials.value}`,
          "Content-Type": "application/json",
          // Add Cart-Token if available for session management
          ...(currentNonce && { "Cart-Token": currentNonce }),
        },
      }
    );

    logger.log(
      "Batch response received:",
      JSON.stringify(batchResponse.data, null, 2)
    );

    // Update nonce using unified manager
    updateCartNonceFromResponse(
      cookieStore,
      batchResponse.headers,
      "batch operation"
    );

    // Process batch response
    const responses = batchResponse.data.responses || [];
    let successfulItems = 0;
    let failedItems = 0;
    const errors = [];
    let latestCart = null;

    responses.forEach((response, index) => {
      if (response.status >= 200 && response.status < 300) {
        successfulItems++;
        // Keep the latest successful cart data
        if (response.body) {
          latestCart = response.body;
        }
        logger.log(`Item ${index + 1} added successfully`);
      } else {
        failedItems++;
        logger.error(`Item ${index + 1} failed:`, response.body);
        errors.push({
          itemIndex: index,
          item: items[index],
          error: response.body,
          status: response.status,
        });
      }
    });

    // Determine response based on results
    if (successfulItems === 0) {
      logger.log("Batch cart add failed: No items were added successfully");
      return NextResponse.json(
        {
          error: "Failed to add any items to cart",
          details: errors,
        },
        { status: 500 }
      );
    }

    // Return success or partial success
    const responseData = {
      success: true,
      message:
        failedItems > 0
          ? `Batch operation partially successful (${successfulItems}/${items.length} items added)`
          : `All ${successfulItems} items added to cart successfully`,
      added_items: successfulItems,
      failed_items: failedItems,
      total_items: items.length,
      cart: latestCart,
    };

    if (failedItems > 0) {
      responseData.errors = errors;
    }

    logger.log(
      `Batch cart add completed: ${successfulItems}/${items.length} items added`
    );
    return NextResponse.json(responseData);
  } catch (error) {
    logger.error(
      "Batch cart add error:",
      error.message,
      "\nResponse data:",
      error.response?.data || "No response data",
      "\nStatus:",
      error.response?.status || "No status"
    );

    // Enhanced error response with fallback recommendation
    const errorResponse = {
      error: "Failed to add items to cart via batch operation",
      details: {
        message: error.message,
        response: error.response?.data || null,
        status: error.response?.status || null,
      },
      fallback_recommended: true, // Signal to client to use individual calls
      batch_size: items?.length || 0,
    };

    // Provide specific guidance based on error type
    if (error.response?.status === 413) {
      errorResponse.error = "Batch size too large for server";
      errorResponse.recommendation =
        "Split into smaller batches or use individual calls";
    } else if (error.response?.status === 429) {
      errorResponse.error = "Rate limit exceeded";
      errorResponse.recommendation = "Retry with individual calls with delays";
    } else if (
      error.response?.data?.code === "woocommerce_rest_missing_nonce"
    ) {
      errorResponse.error = "Nonce error in batch operation";
      errorResponse.recommendation = "Use individual calls with fresh nonce";
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
