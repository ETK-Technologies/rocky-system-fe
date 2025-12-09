import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import axios from "axios";
import { getCurrency } from "@/lib/constants/currency";
import { getClientDomain } from "@/lib/utils/getClientDomain";

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
 * POST /api/northbeam/backfill
 * Body: { order_ids: (number[]|string[]), dry_run?: boolean }
 * For each order id, fetch order from new backend + forward to `/api/northbeam/orders`.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.order_ids) ? body.order_ids : [];
    const dryRun = Boolean(body?.dry_run);
    // Pass-through debug echo controls to internal NB orders route (URL param only)
    const debugParam = req.nextUrl?.searchParams?.get("debug") === "1";

    if (!ids.length) {
      return NextResponse.json(
        { error: "order_ids array required" },
        { status: 400 }
      );
    }

    // Validate Northbeam credentials exist early to fail fast if not configured
    const clientId = process.env.NB_CLIENT_ID || process.env.NORTHBEAM_CLIENT_ID;
    const apiKey = process.env.NB_API_KEY || process.env.NORTHBEAM_AUTH_TOKEN;
    if (!clientId || !apiKey) {
      return NextResponse.json(
        { error: "Northbeam configuration missing (NB_CLIENT_ID/NB_API_KEY)" },
        { status: 500 }
      );
    }

    const BASE_URL = process.env.BASE_URL;
    
    if (!BASE_URL) {
      return NextResponse.json(
        { error: "Backend configuration missing (BASE_URL)" },
        { status: 500 }
      );
    }

    // Helper: map new backend order to the shape our NB orders endpoint expects
    const mapBackendOrderToNorthbeamOrder = (order) => {
      const purchaseTotal = parseFloat(order?.totalAmount ?? order?.total ?? 0) || 0;
      const tax = parseFloat(order?.taxAmount ?? order?.totalTax ?? 0) || 0;
      const shipping = parseFloat(order?.shippingAmount ?? order?.shippingTotal ?? 0) || 0;
      const discountAmount = parseFloat(order?.discountAmount ?? order?.discountTotal ?? 0) || 0;
      
      // Extract billing info (new backend structure)
      const billing = order?.billingAddress || order?.billing || {};
      const email = billing?.email || order?.customerEmail || "";
      const phone = billing?.phone || billing?.phoneNumber || "";
      const name = `${billing?.firstName || billing?.first_name || ""} ${billing?.lastName || billing?.last_name || ""}`.trim();
      
      // Map status from new backend format
      const status = String(order?.status || "").toLowerCase();
      const timeCandidate =
        order?.paidAt ||
        order?.createdAt ||
        order?.datePaid ||
        order?.dateCreated;

      // Build product list from new backend structure
      const items = order?.items || order?.lineItems || [];
      const products = Array.isArray(items)
        ? items.map((item) => {
            const unitPrice = parseFloat(item?.unitPrice ?? item?.price ?? 0) || 0;
            const variantId = item?.variantId ? String(item.variantId) : "";
            const base = {
              id: item?.product?.sku || item?.sku || String(item?.productId || item?.product_id || ""),
              product_id: String(item?.productId || item?.product_id || ""),
              name: item?.product?.name || item?.name || "",
              quantity: parseInt(item?.quantity || 1, 10) || 1,
              price: unitPrice,
            };
            if (variantId) base.variant_id = variantId;
            return base;
          })
        : [];

      // Build tag helpers
      const getStatusTag = (s) => {
        const map = {
          pending: "Pending",
          processing: "Processing",
          "on-hold": "On Hold",
          completed: "Completed",
          cancelled: "Cancelled",
          refunded: "Refunded",
          failed: "Failed",
          draft: "Pending",
        };
        return map[String(s || "").toLowerCase()] || "Pending";
      };
      const hasSubscription = products.some(
        (p) => /subscription/i.test(p?.name || "")
      );
      const lifecycle = hasSubscription
        ? order?.isFirstOrder
          ? "Subscription First Order"
          : "Subscription Recurring"
        : "OTC";

      // Shipping address (new backend structure)
      const shippingAddr = order?.shippingAddress || order?.shipping;
      const shippingAddress = shippingAddr
        ? {
            address1: shippingAddr.address1 || shippingAddr.address_1 || shippingAddr.address || "",
            address2: shippingAddr.address2 || shippingAddr.address_2 || "",
            city: shippingAddr.city || "",
            state: shippingAddr.state || shippingAddr.province || "",
            zip: shippingAddr.zip || shippingAddr.postcode || shippingAddr.postalCode || "",
            country_code: convertToISO3166Alpha3(shippingAddr.country || shippingAddr.countryCode),
          }
        : undefined;

      // Build canonical customer_id
      const rawCustomerId = order?.customerId || order?.customer_id;
      const emailLower = (email || "").toString().trim().toLowerCase();
      const phoneDigits = (phone || "").toString().replace(/\D+/g, "");
      let canonicalCustomerId = "";
      if (rawCustomerId && String(rawCustomerId).length > 0) {
        canonicalCustomerId = `backend:${String(rawCustomerId)}`;
      } else if (emailLower) {
        canonicalCustomerId = `email:${emailLower}`;
      } else if (phoneDigits) {
        canonicalCustomerId = `phone:${phoneDigits}`;
      }

      return {
        order_id: String(order?.id || order?.orderId || order?.orderNumber || ""),
        customer_id: canonicalCustomerId || String(rawCustomerId || email || ""),
        customer_id_canonical: canonicalCustomerId || String(rawCustomerId || email || ""),
        time_of_purchase: new Date(timeCandidate || order?.createdAt || Date.now()).toISOString(),
        currency: order?.currency || getCurrency(),
        purchase_total: purchaseTotal,
        tax,
        shipping_cost: shipping,
        discount_codes: Array.isArray(order?.discountCodes)
          ? order.discountCodes.map((c) => c?.code || c).filter(Boolean)
          : [],
        discount_amount: discountAmount,
        customer_email: email,
        customer_phone_number: phone,
        customer_name: name,
        customer_ip_address: order?.customerIpAddress || order?.ipAddress || "",
        is_recurring_order: Boolean(order?.isRecurringOrder || order?.is_recurring_order),
        order_tags: [getStatusTag(status), lifecycle],
        products,
        ...(shippingAddress ? { customer_shipping_address: shippingAddress } : {}),
      };
    };

    // Resolve same-origin base URL from incoming request to avoid external network hops
    let origin;
    try {
      origin = new URL(req.url).origin;
    } catch (_) {
      origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        "http://localhost:3000";
    }

    // Process sequentially to avoid overwhelming Woo/NB; could batch if needed
    const results = [];
    for (const rawId of ids) {
      const id = String(rawId).trim();
      if (!/^[0-9]+$/.test(id)) {
        results.push({ id, status: "skipped", reason: "invalid_id" });
        continue;
      }

      try {
        // 1) Fetch order from new backend API
        // Try by ID first, then by order number if ID doesn't work
        let order = null;
        // Get client domain for X-Client-Domain header (required for backend domain whitelist)
        const clientDomain = getClientDomain(req);
        try {
          const orderResponse = await axios.get(`${BASE_URL}/api/v1/orders/${id}`, {
            headers: {
              accept: "application/json",
              "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
              "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
              "X-Client-Domain": clientDomain,
            },
          });
          order = orderResponse.data;
        } catch (fetchError) {
          // If not found by ID, try by order number
          if (fetchError.response?.status === 404) {
            try {
              const orderNumberResponse = await axios.get(`${BASE_URL}/api/v1/orders/order-number/${id}`, {
                headers: {
                  accept: "application/json",
                  "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
                  "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
                  "X-Client-Domain": clientDomain,
                },
              });
              order = orderNumberResponse.data;
            } catch (orderNumberError) {
              // Order not found by either method
              results.push({ id, status: "not_found" });
              continue;
            }
          } else {
            throw fetchError;
          }
        }

        if (!order?.id && !order?.orderId && !order?.orderNumber) {
          results.push({ id, status: "not_found" });
          continue;
        }

        // 2) Map to NB format our server accepts
        const mapped = mapBackendOrderToNorthbeamOrder(order);

        if (dryRun) {
          results.push({ id, status: "dry_run", payload_preview: { ...mapped, customer_email: "[redacted]", customer_phone_number: "[redacted]", customer_name: "[redacted]", customer_ip_address: "[redacted]" } });
          continue;
        }

        // 3) Send to our own NB endpoint (same-origin) to centralize logic/tags
        const internalUrl = `${origin}/api/northbeam/orders${debugParam ? "?debug=1" : ""}`;
        const headers = { "Content-Type": "application/json" };
        const res = await fetch(internalUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ orders: [mapped] }),
          // Avoid caching
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          results.push({
            id,
            status: "failed",
            error: `${res.status} ${res.statusText}`,
            http_status: res.status,
            details: text,
          });
          continue;
        }

        const json = await res.json().catch(() => ({}));
        // If internal route echoed sanitized payload, surface it under payload_preview for convenience
        const payloadEcho = Array.isArray(json?.echo) && json.echo.length > 0 ? json.echo[0] : undefined;
        const resultEntry = { id, status: "ok", northbeam: json };
        if (payloadEcho) {
          resultEntry.payload_preview = payloadEcho;
        }
        results.push(resultEntry);
      } catch (err) {
        logger.error("[NB Backfill] Error processing order", id, err);
        results.push({ id, status: "error", error: err?.message || String(err) });
      }
    }

    const okCount = results.filter((r) => r.status === "ok").length;
    const failCount = results.filter((r) => r.status === "failed" || r.status === "error").length;
    return NextResponse.json({ success: true, dry_run: dryRun, totals: { count: ids.length, ok: okCount, failed: failCount }, results });
  } catch (error) {
    logger.error("[NB Backfill] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


