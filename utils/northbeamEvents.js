import { logger } from "@/utils/devLogger";
import { getNorthbeamSourceTags, getAttributionData } from "@/utils/sourceAttribution";
import { getCurrency } from "@/lib/constants/currency";

/**
 * Northbeam Events Utility
 * Handles Northbeam tracking events for purchase data
 * Reference: https://docs.northbeam.io/docs/using-the-api
 */

/**
 * Convert 2-letter country code to 3-letter ISO 3166-1 alpha-3 code
 * @param {string} countryCode - 2-letter country code
 * @returns {string} 3-letter country code
 */
const convertToISO3166Alpha3 = (countryCode) => {
  // Comprehensive ISO 3166-1 alpha-2 to alpha-3 mapping
  const countryMap = {
    // North America
    CA: "CAN", US: "USA", MX: "MEX",
    // Europe
    GB: "GBR", DE: "DEU", FR: "FRA", IT: "ITA", ES: "ESP", NL: "NLD", BE: "BEL",
    AT: "AUT", CH: "CHE", SE: "SWE", NO: "NOR", DK: "DNK", FI: "FIN", IE: "IRL",
    PT: "PRT", GR: "GRC", PL: "POL", CZ: "CZE", HU: "HUN", RO: "ROU", SK: "SVK",
    BG: "BGR", HR: "HRV", SI: "SVN", LT: "LTU", LV: "LVA", EE: "EST", IS: "ISL",
    LU: "LUX", MT: "MLT", CY: "CYP", RS: "SRB", UA: "UKR", BY: "BLR", MD: "MDA",
    AL: "ALB", BA: "BIH", MK: "MKD", ME: "MNE", XK: "XKX",
    // Asia
    CN: "CHN", JP: "JPN", KR: "KOR", IN: "IND", SG: "SGP", MY: "MYS", TH: "THA",
    ID: "IDN", PH: "PHL", VN: "VNM", TW: "TWN", HK: "HKG", MO: "MAC", KH: "KHM",
    LA: "LAO", MM: "MMR", BN: "BRN", BD: "BGD", LK: "LKA", NP: "NPL", PK: "PAK",
    AF: "AFG", MV: "MDV", BT: "BTN", MN: "MNG", KZ: "KAZ", UZ: "UZB", TM: "TKM",
    KG: "KGZ", TJ: "TJK",
    // Middle East
    IL: "ISR", AE: "ARE", SA: "SAU", TR: "TUR", IQ: "IRQ", IR: "IRN", JO: "JOR",
    LB: "LBN", SY: "SYR", YE: "YEM", OM: "OMN", KW: "KWT", BH: "BHR", QA: "QAT",
    PS: "PSE", AM: "ARM", AZ: "AZE", GE: "GEO",
    // Oceania
    AU: "AUS", NZ: "NZL", FJ: "FJI", PG: "PNG", NC: "NCL", PF: "PYF", GU: "GUM",
    AS: "ASM", MP: "MNP", FM: "FSM", MH: "MHL", PW: "PLW", WS: "WSM", TO: "TON",
    VU: "VUT", SB: "SLB", KI: "KIR", TV: "TUV", NR: "NRU",
    // South America
    BR: "BRA", AR: "ARG", CL: "CHL", CO: "COL", PE: "PER", VE: "VEN", EC: "ECU",
    BO: "BOL", PY: "PRY", UY: "URY", GY: "GUY", SR: "SUR", GF: "GUF", FK: "FLK",
    // Central America & Caribbean
    GT: "GTM", HN: "HND", SV: "SLV", NI: "NIC", CR: "CRI", PA: "PAN", BZ: "BLZ",
    CU: "CUB", JM: "JAM", HT: "HTI", DO: "DOM", PR: "PRI", TT: "TTO", BS: "BHS",
    BB: "BRB", LC: "LCA", VC: "VCT", GD: "GRD", AG: "ATG", DM: "DMA", KN: "KNA",
    AW: "ABW", CW: "CUW", SX: "SXM", BQ: "BES", VG: "VGB", KY: "CYM", TC: "TCA",
    BM: "BMU", MS: "MSR", AI: "AIA", GP: "GLP", MQ: "MTQ",
    // Africa
    ZA: "ZAF", EG: "EGY", NG: "NGA", KE: "KEN", GH: "GHA", TZ: "TZA", UG: "UGA",
    DZ: "DZA", MA: "MAR", AO: "AGO", SD: "SDN", ET: "ETH", MZ: "MOZ", CM: "CMR",
    CI: "CIV", MG: "MDG", NE: "NER", BF: "BFA", ML: "MLI", MW: "MWI", ZM: "ZMB",
    SN: "SEN", SO: "SOM", TD: "TCD", GN: "GIN", RW: "RWA", BJ: "BEN", BI: "BDI",
    TN: "TUN", SS: "SSD", TG: "TGO", SL: "SLE", LY: "LBY", LR: "LBR", MR: "MRT",
    CF: "CAF", ER: "ERI", GM: "GMB", BW: "BWA", GA: "GAB", GW: "GNB", MU: "MUS",
    SZ: "SWZ", DJ: "DJI", KM: "COM", CV: "CPV", ST: "STP", SC: "SYC", GQ: "GNQ",
    ZW: "ZWE", NA: "NAM", LS: "LSO", RE: "REU", YT: "MYT",
  };
  
  const code = String(countryCode || "").toUpperCase().trim();
  
  // If already 3 letters, return as-is
  if (code.length === 3) {
    return code;
  }
  
  // Convert 2-letter to 3-letter, default to CAN if not found
  return countryMap[code] || "CAN";
};

/**
 * Get order status tag
 * @param {string} status - Order status
 * @returns {string} Status tag
 */
const getStatusTag = (status) => {
  const statusMap = {
    pending: "Pending",
    processing: "Processing",
    "on-hold": "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    failed: "Failed",
  };
  return statusMap[status?.toLowerCase()] || "Pending";
};

/**
 * Get lifecycle/purchase type tag
 * @param {Object} order - Order data
 * @returns {string} Lifecycle tag
 */
const getLifecycleTag = (order) => {
  // Check if order has subscription products
  const hasSubscription = order.line_items?.some(
    (item) =>
      item.product_type === "subscription" ||
      item.name?.toLowerCase().includes("subscription")
  );

  // Check if this is a recurring order
  if (order.is_recurring_order || hasSubscription) {
    // Check if this is the first order for this customer
    if (order.is_first_order) {
      return "Subscription First Order";
    }
    return "Subscription Recurring";
  }

  return "OTC";
};

/**
 * Fetch product details from our API endpoint
 * @param {number} productId - Product ID
 * @returns {Promise<Object|null>} Product details or null
 */
const fetchProductDetails = async (productId) => {
  try {
    // Use relative URL for client-side (same-origin)
    const response = await fetch(`/api/products/by-id/${productId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching product details for ${productId}:`, error);
    return null;
  }
};

/**
 * Get product type tags based on categories
 * @param {Array} lineItems - Order line items
 * @returns {Promise<Array>} Product type tags
 */
const getProductTypeTags = async (lineItems) => {
  const tags = [];
  const productTypes = new Set();

  if (!lineItems || lineItems.length === 0) {
    return tags;
  }

  try {
    // Fetch product details for each line item
    const productPromises = lineItems.map(async (item) => {
      try {
        const productDetails = await fetchProductDetails(item.product_id);
        return productDetails;
      } catch (error) {
        console.error(
          `Error fetching product details for ${item.product_id}:`,
          error
        );
        return null;
      }
    });

    const productDetails = await Promise.all(productPromises);

    // Extract categories from product details
    productDetails.forEach((product) => {
      if (product?.categories) {
        product.categories.forEach((category) => {
          productTypes.add(category.name);
        });
      }
    });

    // Add tags for each product type found with item-category format (use colon separator)
    let categoryIndex = 1;
    productTypes.forEach((type) => {
      tags.push(`item-category-${categoryIndex}:${type}`);
      categoryIndex++;
    });
  } catch (error) {
    console.error("Error in getProductTypeTags:", error);
    // Return empty array if category fetching fails - don't break the order tracking
  }

  return tags;
};

/**
 * Track Northbeam Purchase event
 * @param {Object} order - Order data
 * @param {Object} additionalData - Additional event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackNorthbeamPurchase = async (
  order,
  additionalData = {},
  debug = true
) => {
  if (!order || !order.id) return;

  try {
    if (debug) {
      logger.log("[Northbeam] Tracking purchase event for order:", order.id);
    }

    // Prefer canonical overrides when provided
    const canonicalTimeIso =
      additionalData.time_of_purchase_iso ||
      new Date(order.date_created || Date.now()).toISOString();
    const customerIdOverride = additionalData.customer_id || null;

    // Get source attribution tags for Northbeam
    const sourceAttributionTags = getNorthbeamSourceTags();
    
    // Log attribution data for debugging
    if (debug) {
      const attribution = getAttributionData();
      logger.log("[Northbeam] Attribution data:", {
        source: attribution.source || "none",
        medium: attribution.medium || "none",
        campaign: attribution.campaign || "none",
        awinAwc: attribution.awinAwc ? "present" : "none",
        tags: sourceAttributionTags,
      });
    }

    // Build the Northbeam payload - send as array directly
    const payload = {
      orders: [
        {
          order_id: order.id.toString(),
          // Send canonical id override explicitly and as customer_id for server consistency
          customer_id: String(
            customerIdOverride ||
              order.customer_id ||
              order.billing?.email ||
              ""
          ),
          customer_id_canonical: String(customerIdOverride || ""),
          time_of_purchase: canonicalTimeIso, // Ensure proper ISO format
          currency: order.currency || getCurrency(),
          purchase_total: parseFloat(order.total) || 0, // Keep in dollars, not cents
          tax: parseFloat(order.total_tax) || 0, // Keep in dollars, not cents
          shipping_cost: parseFloat(order.shipping_total) || 0,
          discount_codes: order.coupon_lines?.map((c) => c.code) || [],
          discount_amount: parseFloat(order.discount_total) || 0, // Keep in dollars, not cents
          customer_email: order.billing?.email || "",
          customer_phone_number: order.billing?.phone || "",
          customer_name:
            `${order.billing?.first_name || ""} ${
              order.billing?.last_name || ""
            }`.trim() || "",
          ...(order.customer_ip_address && {
            customer_ip_address: order.customer_ip_address,
          }),
          is_recurring_order: order.is_recurring_order || false,
          order_tags: [
            getStatusTag(order.status),
            getLifecycleTag(order),
            ...(await getProductTypeTags(order.line_items)),
            ...sourceAttributionTags, // Add source/channel attribution tags
          ],
          products: (order.line_items || []).map((item) => ({
            id: item.sku || item.product_id?.toString() || "",
            product_id: item.product_id?.toString() || "",
            name: item.name || "",
            quantity: parseInt(item.quantity) || 1,
            price: parseFloat(item.total) / Math.max(1, item.quantity) || 0, // Keep in dollars, not cents
            variant_id: item.variation_id?.toString() || "",
            ...(item.product_type && { product_type: item.product_type }),
            ...(item.variation?.attributes && {
              variant_name: item.variation.attributes
                .map((attr) => `${attr.name}: ${attr.option}`)
                .join(", "),
            }),
          })),
          ...(order.shipping && {
            customer_shipping_address: {
              address1: order.shipping.address_1 || "",
              address2: order.shipping.address_2 || "",
              city: order.shipping.city || "",
              state: order.shipping.state || "",
              zip: order.shipping.postcode || "",
              country_code: convertToISO3166Alpha3(order.shipping.country),
            },
          }),
        },
      ],
    };

    const hasWin = typeof window !== "undefined";
    const debugNetwork = (() => {
      try {
        if (!hasWin) return false;
        const usp = new URLSearchParams(window.location.search);
        return usp.get("nb-debug") === "1";
      } catch (_) {
        return false;
      }
    })();

    if (debug) {
      try {
        // Do not log PII: mask email/phone/name
        const preview = JSON.parse(JSON.stringify(payload));
        const o = preview.orders?.[0] || {};
        if (o) {
          if (o.customer_email) o.customer_email = "[redacted]";
          if (o.customer_phone_number) o.customer_phone_number = "[redacted]";
          if (o.customer_name) o.customer_name = "[redacted]";
          if (o.customer_ip_address) o.customer_ip_address = "[redacted]";
        }
        logger.log("[Northbeam] Payload preview:", preview);
      } catch (_) {}
    }

    // Expose last payload for manual inspection when debugging
    if (hasWin && debugNetwork) {
      try {
        window.__NB_LAST_PAYLOAD = payload;
        logger.log("[Northbeam] Debug mode active. __NB_LAST_PAYLOAD set.");
      } catch (_) {}
    }

    // Send to Northbeam API with one retry on failure
    const sendOnce = async () => {
      const res = await fetch(
        `/api/northbeam/orders${debugNetwork ? "?debug=1" : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(debugNetwork ? { "X-NB-Debug-Client": "1" } : {}),
          },
          body: JSON.stringify(payload),
          // In debug mode, avoid keepalive so the request is clearly visible
          keepalive: !debugNetwork,
          cache: debugNetwork ? "no-store" : "default",
        }
      );
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Northbeam API error: ${res.status} ${errorText}`);
      }
      return res;
    };

    let response;
    try {
      response = await sendOnce();
    } catch (firstError) {
      logger.error(
        "[Northbeam] First attempt failed, retrying once...",
        firstError
      );
      await new Promise((r) => setTimeout(r, 800));
      response = await sendOnce();
    }

    if (debug) {
      logger.log("[Northbeam] ✅ Purchase event tracked successfully");
    }

    return response;
  } catch (error) {
    logger.error("[Northbeam] Error tracking purchase event:", error);
    throw error;
  }
};

/**
 * Format order data for Northbeam
 * @param {Object} order - Order data
 * @returns {Object} Formatted data for Northbeam
 */
export const formatNorthbeamOrderData = async (order) => {
  if (!order || !order.id) return null;

  // Get source attribution tags
  const sourceAttributionTags = getNorthbeamSourceTags();

  return {
    order_id: order.id.toString(),
    customer_id: String(order.customer_id || order.billing?.email || ""), // Ensure customer_id is a string
    time_of_purchase: new Date(order.date_created || new Date()).toISOString(), // Ensure proper ISO format
    currency: order.currency || getCurrency(),
    purchase_total: parseFloat(order.total) || 0, // Keep in dollars, not cents
    tax: parseFloat(order.total_tax) || 0, // Keep in dollars, not cents
    shipping_cost: parseFloat(order.shipping_total) || 0,
    discount_codes: order.coupon_lines?.map((c) => c.code) || [],
    discount_amount: parseFloat(order.discount_total) || 0, // Keep in dollars, not cents
    customer_email: order.billing?.email || "",
    customer_phone_number: order.billing?.phone || "",
    customer_name:
      `${order.billing?.first_name || ""} ${
        order.billing?.last_name || ""
      }`.trim() || "",
    customer_ip_address: order.customer_ip_address || "",
    is_recurring_order: order.is_recurring_order || false,
    order_tags: [
      getStatusTag(order.status),
      getLifecycleTag(order),
      ...(await getProductTypeTags(order.line_items)),
      ...sourceAttributionTags, // Add source/channel attribution tags
    ],
    products: (order.line_items || []).map((item) => ({
      id: item.sku || item.product_id?.toString() || "",
      name: item.name || "",
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.total) / Math.max(1, item.quantity) || 0, // Keep in dollars, not cents
      variant_id: item.variation_id?.toString() || "",
      ...(item.variation?.attributes && {
        variant_name: item.variation.attributes
          .map((attr) => `${attr.name}: ${attr.option}`)
          .join(", "),
      }),
    })),
    ...(order.shipping && {
      customer_shipping_address: {
        address1: order.shipping.address_1 || "",
        address2: order.shipping.address_2 || "",
        city: order.shipping.city || "",
        state: order.shipping.state || "",
        zip: order.shipping.postcode || "",
        country_code: convertToISO3166Alpha3(order.shipping.country),
      },
    }),
  };
};

/**
 * Track custom Northbeam event
 * @param {string} eventName - Custom event name
 * @param {Object} eventData - Event data
 * @param {boolean} debug - Whether to log debug information
 */
export const trackNorthbeamCustomEvent = async (
  eventName,
  eventData = {},
  debug = true
) => {
  try {
    if (debug) {
      logger.log(`[Northbeam] Tracking custom event: ${eventName}`, eventData);
    }

    // For custom events, you might need to implement additional API endpoints
    // This is a placeholder for future custom event tracking
    logger.warn("[Northbeam] Custom event tracking not yet implemented");

    if (debug) {
      logger.log(
        `[Northbeam] ✅ Custom event "${eventName}" tracked successfully`
      );
    }
  } catch (error) {
    logger.error(
      `[Northbeam] Error tracking custom event "${eventName}":`,
      error
    );
    throw error;
  }
};
