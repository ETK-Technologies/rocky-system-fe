import { NextResponse } from "next/server";
import { api } from "@/lib/woocommerce"; // Assuming woocommerce.js exports 'api'
import { logger } from "@/utils/devLogger";

// Helper function to safely get product details (implement caching if needed)
async function getProductDetails(productId) {
  try {
    // Check if product details are cached, otherwise fetch
    // For simplicity, fetching directly here. Consider caching for performance.
    const response = await api.get(`products/${productId}`);
    return response.data;
  } catch (error) {
    logger.error(
      `[GA4 API] Error fetching product ${productId}:`,
      error.response?.data || error.message
    );
    return null; // Return null if product fetch fails
  }
}

// Helper function to get variation details if needed
async function getVariationDetails(productId, variationId) {
  if (!variationId) return null;
  try {
    const response = await api.get(
      `products/${productId}/variations/${variationId}`
    );
    return response.data;
  } catch (error) {
    logger.error(
      `[GA4 API] Error fetching variation ${variationId} for product ${productId}:`,
      error.response?.data || error.message
    );
    return null;
  }
}

// Helper function to format variation attributes like the PHP example
function formatVariationAttributes(variationData) {
  if (
    !variationData ||
    !variationData.attributes ||
    variationData.attributes.length === 0
  ) {
    return "";
  }
  // The REST API provides attributes as { name: 'Size', option: 'Large' }
  // We need to format them as "Name: Option"
  // Attempt to read brand name from CSS variable, fallback to 'Rocky'
  let defaultBrand = "Rocky";
  if (typeof window !== "undefined") {
    // Check if running in a browser context
    try {
      defaultBrand =
        getComputedStyle(document.body)
          .getPropertyValue("--default-brand-name")
          .trim() || "Rocky";
    } catch (e) {
      logger.warn(
        "[GA4 API] Could not read --default-brand-name CSS variable."
      );
    }
  }

  return variationData.attributes
    .map((attr) => `${attr.name}: ${attr.option}`)
    .join(", ");
}

export async function GET(request, { params }) {
  const { id: orderId } = await params;

  if (!orderId) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch the order
    const orderResponse = await api.get(`orders/${orderId}`);
    const order = orderResponse.data;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Process line items to gather GA4 item data
    const items_data = await Promise.all(
      order.line_items.map(async (item) => {
        const productId = item.product_id;
        const variationId = item.variation_id;
        let productData = null;
        let variationData = null;
        let attributesString = "";
        // Default brand name - It's safer to define this server-side or pass via config
        // Reading CSS variables server-side is not possible.
        let brand = "Rocky"; // Set default brand name here
        let categories = [];

        // Fetch product details (needed for SKU, categories, brand attribute)
        productData = await getProductDetails(productId);

        if (productData) {
          // Get Brand from attribute if available
          const brandAttribute = productData.attributes?.find(
            (attr) => attr.name.toLowerCase() === "brand"
          );
          if (brandAttribute && brandAttribute.options?.length > 0) {
            brand = brandAttribute.options[0];
          }
          // Get categories
          categories = productData.categories?.map((cat) => cat.name) || [];

          // Handle variations
          if (variationId) {
            variationData = await getVariationDetails(productId, variationId);
            attributesString = formatVariationAttributes(variationData);
          }
        }

        return {
          item_id: item.sku || productId.toString(), // Use SKU if available, else product ID
          item_name: item.name,
          price: parseFloat(item.total) / Math.max(1, item.quantity), // Price per unit
          quantity: item.quantity,
          item_brand: brand, // Use the determined brand
          item_category: categories[0] || "",
          item_category2: categories[1] || "",
          item_category3: categories[2] || "",
          item_variant: attributesString, // Formatted variation attributes
        };
      })
    );

    // 3. Construct the final purchase data object
    const purchase_data = {
      event: "purchase",
      ecommerce: {
        transaction_id: order.id.toString(),
        affiliation: "Rocky", // As per your PHP snippet
        value: parseFloat(order.total),
        tax: parseFloat(order.total_tax),
        shipping: parseFloat(order.shipping_total),
        currency: order.currency,
        items: items_data.filter((item) => item !== null), // Filter out any potential null items from failed fetches
      },
    };

    return NextResponse.json(purchase_data);
  } catch (error) {
    logger.error(
      `[GA4 API] Error fetching order ${orderId} details:`,
      error.response?.data || error.message
    );
    // Check if it's a WooCommerce API error response
    if (error.response && error.response.data) {
      return NextResponse.json(
        {
          error: "Failed to fetch order details",
          details: error.response.data,
        },
        { status: error.response.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
