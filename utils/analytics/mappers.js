import { formatGA4Item } from "@/utils/ga4Events";
import { logger } from "@/utils/devLogger";
import { getCurrency } from "@/lib/constants/currency";

/**
 * Fetch product details (client-side) to enrich GA4 items with categories/attributes
 * @param {number|string} productId
 * @returns {Promise<any|null>}
 */
export const fetchProductDetails = async (productId) => {
  if (!productId) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`/api/products/id/${productId}` , {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Failed to fetch product ${productId}`);
    return await response.json();
  } catch (error) {
    logger.error(`[Analytics] Failed to fetch product ${productId}:`, error);
    return null;
  }
};

/**
 * Build ecommerce payload from Woo order, mirroring existing client mapping
 * @param {Object} order
 * @returns {Promise<Object>} ecommerce payload
 */
export const mapOrderToEcommerce = async (order) => {
  const lineItemPromises = Array.isArray(order?.line_items)
    ? order.line_items.map(async (item) => {
        const productDetails = await fetchProductDetails(item.product_id);

        const productForGA4 = {
          id: item.product_id,
          sku: item.sku || productDetails?.sku,
          name: item.name,
          price: parseFloat(item.total) / Math.max(1, item.quantity) || 0,
          categories: productDetails?.categories || [],
          attributes: productDetails?.attributes || [],
          meta_data: productDetails?.meta_data || [],
          variation_attributes: item.variation?.attributes || [],
        };

        const formattedItem = formatGA4Item(productForGA4, item.quantity || 1);

        return {
          ...formattedItem,
          item_variant:
            item.variation?.attributes
              ?.map((attr) => `${attr.name}: ${attr.option}`)
              .join(", ") || "",
          discount: parseFloat(item.discount || 0) || 0,
          variant_id: item.variation_id || null,
          item_image: item.image?.src || null,
        };
      })
    : [];

  const items = await Promise.all(lineItemPromises);

  return {
    transaction_id: order?.id?.toString() || "",
    affiliation: "Rocky",
    value: parseFloat(order?.total) || 0,
    tax: parseFloat(order?.total_tax) || 0,
    shipping: parseFloat(order?.shipping_total) || 0,
    currency: order?.currency || getCurrency(),
    coupon: order?.coupon_lines?.map((c) => c.code).join(", ") || "",
    payment_type: order?.payment_method_title || "Visa",
    shipping_tier: order?.shipping_lines?.[0]?.method_title || "Express",
    items,
  };
};
