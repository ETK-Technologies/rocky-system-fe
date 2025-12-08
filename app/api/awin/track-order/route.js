import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getCurrency } from "@/lib/constants/currency";

const BASE_URL = process.env.BASE_URL;
const AWIN_MERCHANT_ID = process.env.AWIN_MERCHANT_ID || "101159";
const AWIN_TESTMODE =
  parseInt(process.env.AWIN_TESTMODE || "0", 10) === 1 ? 1 : 0;

function toMoney(value) {
  const num = parseFloat(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function formatAmount2(value) {
  return toMoney(value).toFixed(2);
}

function buildBd0({
  merchant,
  orderRef,
  group,
  items,
  fallbackCategory = "DefaultCategory",
}) {
  const lines = [];
  for (const it of items) {
    const pid = String(it.product_id ?? it.variation_id ?? it.id ?? "");
    const name = String((it.name || "").replace(/\s+/g, " ")).slice(0, 255);
    const qty = parseInt(it.quantity || it.qty || 1, 10) || 1;
    const unit =
      qty > 0 ? toMoney(it.line_total || it.unit_price || 0) / qty : 0;
    const unitStr = unit.toFixed(2);
    const sku = String(it.sku || pid);
    const cat = String(it.category || fallbackCategory);

    lines.push(
      [
        "AW:P",
        merchant,
        orderRef,
        pid,
        name,
        unitStr,
        qty,
        sku,
        group,
        cat,
      ].join("|")
    );
  }
  return lines.join("\r\n");
}

export async function POST(req) {
  try {
    const { order_id, order_data } = await req.json();
    if (!order_id) {
      return NextResponse.json(
        { error: "order_id is required" },
        { status: 400 }
      );
    }

    console.log("[AWIN] Starting tracking for order:", order_id);

    // Use provided order data or fetch if not provided (fallback)
    let order;
    if (order_data) {
      order = order_data;
    } else {
      // Fallback: fetch order data if not provided
      const orderResponse = await axios.get(
        `${BASE_URL}/wp-json/wc/v3/orders/${order_id}`,
        {
          auth: {
            username: process.env.CONSUMER_KEY,
            password: process.env.CONSUMER_SECRET,
          },
        }
      );
      order = orderResponse.data;
    }

    // Extract order details
    const totalAmount = toMoney(order.total);
    const taxAmount = toMoney(order.total_tax);
    const shippingAmount = toMoney(order.shipping_total);
    const subtotalAmount = Math.max(
      0,
      totalAmount - taxAmount - shippingAmount
    );
    const currencyCode = order.currency || getCurrency();
    const orderReference = order.number || order.id.toString();

    // Determine commission group NEWCUST/EXISTING with fallback DEFAULT
    let commissionGroup = "DEFAULT";
    try {
      const billingEmail =
        order.billing?.email || order.billing?.email_address || "";
      if (billingEmail) {
        const custResp = await axios.get(
          `${BASE_URL}/wp-json/wc/v3/customers`,
          {
            params: { email: billingEmail },
            auth: {
              username: process.env.CONSUMER_KEY,
              password: process.env.CONSUMER_SECRET,
            },
            timeout: 10000,
          }
        );
        const isExisting =
          Array.isArray(custResp.data) && custResp.data.length > 0;
        commissionGroup = isExisting ? "EXISTING" : "NEWCUST";
      }
    } catch (e) {
      console.warn(
        "[AWIN] Unable to determine commission group, using DEFAULT:",
        e?.message || e
      );
      commissionGroup = "DEFAULT";
    }

    // Voucher (coupon codes)
    let voucher = "";
    try {
      const codes = (order.coupon_lines || [])
        .map((c) => c.code)
        .filter(Boolean);
      voucher = codes.join(",");
    } catch (_) {}

    // Products for bd[0]
    const items = Array.isArray(order.line_items) ? order.line_items : [];
    const bd0 = buildBd0({
      merchant: AWIN_MERCHANT_ID,
      orderRef: orderReference,
      group: commissionGroup,
      items,
    });

    // Click checksum from cookies (prefer _awin_awc, then awc)
    const cookieStore = await cookies();
    const awcCookie =
      cookieStore.get("_awin_awc")?.value ||
      cookieStore.get("awc")?.value ||
      "";

    // Build canonical AWIN URL via URLSearchParams
    const params = new URLSearchParams();
    params.set("tt", "ss");
    params.set("tv", "2");
    params.set("merchant", AWIN_MERCHANT_ID);
    params.set("amount", formatAmount2(subtotalAmount));
    params.set("ch", awcCookie ? "aw" : "other");
    params.set("parts", `${commissionGroup}:${formatAmount2(subtotalAmount)}`);
    if (voucher) params.set("vc", voucher);
    params.set("cr", currencyCode);
    params.set("ref", String(orderReference));
    params.set("testmode", String(AWIN_TESTMODE));
    if (bd0) params.set("bd[0]", bd0);
    if (awcCookie) params.set("cks", awcCookie);

    const awinUrl = `https://www.awin1.com/sread.php?${params.toString()}`;

    // Idempotency: if order already has _awin_s2s_code=200, skip
    const alreadyFired = Array.isArray(order.meta_data)
      ? order.meta_data.find(
          (m) => m?.key === "_awin_s2s_code" && String(m?.value) === "200"
        )
      : null;
    if (alreadyFired) {
      console.log(
        "[AWIN] Skipping S2S; already fired for order",
        orderReference
      );
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "idempotent",
        awin_url: awinUrl,
      });
    }

    // Send tracking request to Awin
    const trackingResponse = await axios.get(awinUrl, {
      timeout: 10000,
      headers: { Referer: process.env.NEXT_PUBLIC_SITE_URL || "" },
    });

    console.log("[AWIN] Awin response:", {
      status: trackingResponse.status,
      status_text: trackingResponse.statusText,
      data: trackingResponse.data,
    });

    // Persist idempotency/meta back to Woo
    try {
      await axios.put(
        `${BASE_URL}/wp-json/wc/v3/orders/${orderReference}`,
        {
          meta_data: [
            { key: "_awin_s2s_url", value: awinUrl },
            { key: "_awin_s2s_code", value: String(trackingResponse.status) },
            { key: "_awin_s2s_last", value: new Date().toISOString() },
            { key: "_awin_channel", value: awcCookie ? "aw" : "other" },
            { key: "_awin_awc", value: awcCookie || "" },
          ],
        },
        {
          auth: {
            username: process.env.CONSUMER_KEY,
            password: process.env.CONSUMER_SECRET,
          },
          timeout: 10000,
        }
      );
    } catch (e) {
      console.warn(
        "[AWIN] Failed to persist S2S meta to Woo:",
        e?.message || e
      );
    }

    return NextResponse.json({
      success: true,
      status: trackingResponse.status,
      awin_url: awinUrl,
      order_data: {
        order_id,
        total_amount: totalAmount,
        subtotal_amount: subtotalAmount,
        currency: currencyCode,
        order_reference: orderReference,
        voucher,
        commission_group: commissionGroup,
        items_count: items.length,
        awc: awcCookie ? "***" : "not_found",
      },
      awin_response: {
        status: trackingResponse.status,
        status_text: trackingResponse.statusText,
        data: trackingResponse.data,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500,
      },
      { status: error.response?.status || 500 }
    );
  }
}

// GET: Fallback pixel endpoint for noscript environments
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // If we have order_id, mirror POST logic to compute canonical values
    const orderId = searchParams.get("order_id");
    if (orderId) {
      let order;
      // Fetch order
      const orderResponse = await axios.get(
        `${BASE_URL}/wp-json/wc/v3/orders/${orderId}`,
        {
          auth: {
            username: process.env.CONSUMER_KEY,
            password: process.env.CONSUMER_SECRET,
          },
          timeout: 10000,
        }
      );
      order = orderResponse.data;

      const totalAmount = toMoney(order.total);
      const taxAmount = toMoney(order.total_tax);
      const shippingAmount = toMoney(order.shipping_total);
      const subtotalAmount = Math.max(
        0,
        totalAmount - taxAmount - shippingAmount
      );
      const currencyCode = order.currency || getCurrency();
      const orderReference = order.number || order.id.toString();

      let commissionGroup = "DEFAULT";
      try {
        const billingEmail =
          order.billing?.email || order.billing?.email_address || "";
        if (billingEmail) {
          const custResp = await axios.get(
            `${BASE_URL}/wp-json/wc/v3/customers`,
            {
              params: { email: billingEmail },
              auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET,
              },
              timeout: 10000,
            }
          );
          const isExisting =
            Array.isArray(custResp.data) && custResp.data.length > 0;
          commissionGroup = isExisting ? "EXISTING" : "NEWCUST";
        }
      } catch (_) {}

      let voucher = "";
      try {
        const codes = (order.coupon_lines || [])
          .map((c) => c.code)
          .filter(Boolean);
        voucher = codes.join(",");
      } catch (_) {}

      // Read awc from cookies via header is not possible here; fallback to channel=other
      const channel = "other";

      const params = new URLSearchParams();
      params.set("tt", "ss");
      params.set("tv", "2");
      params.set("merchant", process.env.AWIN_MERCHANT_ID || "101159");
      params.set("amount", formatAmount2(subtotalAmount));
      params.set("ch", channel);
      params.set(
        "parts",
        `${commissionGroup}:${formatAmount2(subtotalAmount)}`
      );
      if (voucher) params.set("vc", voucher);
      params.set("cr", currencyCode);
      params.set("ref", String(orderReference));
      params.set("testmode", String(AWIN_TESTMODE));

      const awinUrl = `https://www.awin1.com/sread.php?${params.toString()}`;
      axios.get(awinUrl).catch(() => {});
    } else {
      // Build server-side sread.php URL mirroring client fallback parameters when possible
      const merchant =
        searchParams.get("merchant") ||
        process.env.AWIN_MERCHANT_ID ||
        "101159";
      const amount = searchParams.get("amount") || "0.00";
      const currency =
        searchParams.get("cr") || searchParams.get("currency") || getCurrency();
      const orderRef =
        searchParams.get("ref") || searchParams.get("orderRef") || "";
      const parts = searchParams.get("parts") || `DEFAULT:${amount}`;
      const voucher =
        searchParams.get("vc") || searchParams.get("voucher") || "";
      const channel =
        searchParams.get("ch") || searchParams.get("channel") || "other";

      const params = new URLSearchParams();
      params.set("tt", "ss");
      params.set("tv", "2");
      params.set("merchant", merchant);
      params.set("amount", amount);
      params.set("ch", channel);
      params.set("parts", parts);
      if (voucher) params.set("vc", voucher);
      params.set("cr", currency);
      if (orderRef) params.set("ref", orderRef);
      params.set("testmode", String(AWIN_TESTMODE));

      const awinUrl = `https://www.awin1.com/sread.php?${params.toString()}`;
      axios.get(awinUrl).catch(() => {});
    }

    // Return a 1x1 transparent GIF
    const oneByOneGif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "base64"
    );
    return new NextResponse(oneByOneGif, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (e) {
    return new NextResponse(null, { status: 204 });
  }
}
