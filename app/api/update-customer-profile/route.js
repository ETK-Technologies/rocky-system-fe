import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getAuthTokenFromCookies, getUserIdFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

export async function POST(req) {
  try {
    const requestData = await req.json();
    const cookieStore = await cookies();

    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);

    if (!authToken || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Log the request data for debugging
    logger.log(
      "Update customer profile request data:",
      JSON.stringify(requestData, null, 2)
    );

    // Prepare meta data updates
    const dobToUpdate = requestData.date_of_birth || "";
    const phoneToUpdate = requestData.billing_address?.phone || "";
    const stateToUpdate = requestData.billing_address?.state || "";

    // Convert state code to province name
    const stateToProvince = {
      AB: "Alberta",
      BC: "British Columbia",
      MB: "Manitoba",
      NB: "New Brunswick",
      NL: "Newfoundland and Labrador",
      NT: "Northwest Territories",
      NS: "Nova Scotia",
      NU: "Nunavut",
      ON: "Ontario",
      PE: "Prince Edward Island",
      QC: "Quebec",
      SK: "Saskatchewan",
      YT: "Yukon Territory",
    };
    const provinceName = stateToProvince[stateToUpdate] || stateToUpdate;

    // Build meta_data array for WooCommerce API
    const metaDataUpdates = [];
    if (dobToUpdate) {
      metaDataUpdates.push({ key: "date_of_birth", value: dobToUpdate });
    }
    if (phoneToUpdate) {
      metaDataUpdates.push({ key: "phone_number", value: phoneToUpdate });
    }
    if (provinceName) {
      metaDataUpdates.push({ key: "province", value: provinceName });
    }

    logger.log("Meta data to update via WooCommerce API:", metaDataUpdates);

    // Update WooCommerce customer billing, shipping, AND metadata in one call
    const updatePayload = {
      billing: requestData.billing_address,
      shipping: requestData.shipping_address,
    };

    // Add meta_data if we have any updates
    if (metaDataUpdates.length > 0) {
      updatePayload.meta_data = metaDataUpdates;
    }

    logger.log(
      "Full WooCommerce update payload:",
      JSON.stringify(updatePayload, null, 2)
    );

    const response = await axios.put(
      `${BASE_URL}/wp-json/wc/v3/customers/${userId.value}`,
      updatePayload,
      {
        headers: {
          Authorization: process.env.ADMIN_TOKEN || authToken.value,
          "Content-Type": "application/json",
        },
      }
    );

    logger.log("Customer profile updated successfully:", {
      customer_id: userId.value,
      billing_city: response.data.billing?.city,
      billing_state: response.data.billing?.state,
    });

    // Verify metadata was updated in the response
    const updatedMetadata = response.data.meta_data || [];
    const dobMeta = updatedMetadata.find((m) => m.key === "date_of_birth");
    const phoneMeta = updatedMetadata.find((m) => m.key === "phone_number");
    const provinceMeta = updatedMetadata.find((m) => m.key === "province");

    logger.log("=== METADATA UPDATED IN WOOCOMMERCE ===", {
      date_of_birth: dobMeta?.value || "(not found)",
      phone_number: phoneMeta?.value || "(not found)",
      province: provinceMeta?.value || "(not found)",
    });

    return NextResponse.json({
      success: true,
      message: "Customer profile and metadata updated successfully",
      data: response.data,
      metadata_update: {
        attempted: metaDataUpdates.length > 0,
        success: true,
        updated_fields: metaDataUpdates.map((m) => m.key),
      },
    });
  } catch (error) {
    logger.error(
      "Error updating customer profile:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.response?.data?.message || "Failed to update customer profile",
        details: error.response?.data || null,
      },
      { status: error.response?.status || 500 }
    );
  }
}
