import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import axios from "axios";
import { getOrigin } from "@/lib/utils/getOrigin";

/**
 * Automatic Northbeam Order Retry Cron Job
 * 
 * This endpoint is designed to be called by Vercel Cron to automatically
 * retry sending orders to Northbeam that may have failed.
 * 
 * Strategy:
 * - Queries recent orders from new backend API (last 2 hours)
 * - Filters for completed/processing orders (orders we care about tracking)
 * - Attempts to send them to Northbeam via backfill endpoint
 * - Northbeam will deduplicate if order was already received
 * 
 * POST /api/northbeam/auto-retry
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req) {
  const startTime = Date.now();
  
  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
    
    if (!cronSecret) {
      logger.error("[NB Auto-Retry] CRON_SECRET not configured, rejecting request for security");
      return NextResponse.json(
        { error: "Unauthorized - CRON_SECRET must be configured" },
        { status: 401 }
      );
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.error("[NB Auto-Retry] Unauthorized cron request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.log("[NB Auto-Retry] ⏰ Starting automatic retry job");

    // Check if Northbeam is configured
    const clientId = process.env.NB_CLIENT_ID || process.env.NORTHBEAM_CLIENT_ID;
    const apiKey = process.env.NB_API_KEY || process.env.NORTHBEAM_AUTH_TOKEN;
    
    if (!clientId || !apiKey) {
      logger.warn("[NB Auto-Retry] Northbeam not configured, skipping");
      return NextResponse.json({
        success: true,
        message: "Northbeam not configured, skipped",
        skipped: true,
      });
    }

    // Configuration
    const lookbackMinutes = parseInt(process.env.NB_RETRY_LOOKBACK_MINUTES) || 120; // Default 2 hours
    const maxOrdersToRetry = parseInt(process.env.NB_RETRY_MAX_ORDERS) || 50; // Safety limit
    const afterDate = new Date(Date.now() - lookbackMinutes * 60 * 1000);

    logger.log(`[NB Auto-Retry] Looking for orders after ${afterDate.toISOString()}`);

    // Query new backend API for recent orders
    // Filter for orders that should be tracked in Northbeam
    const BASE_URL = process.env.BASE_URL;
    
    if (!BASE_URL) {
      logger.error("[NB Auto-Retry] BASE_URL not configured");
      return NextResponse.json(
        { error: "Backend configuration missing" },
        { status: 500 }
      );
    }

    try {
      // Get origin for Origin header (required for backend domain whitelist)
      const origin = getOrigin(req);

      // Query orders from new backend API
      // Note: This assumes the backend has an orders list endpoint
      // Adjust the endpoint and parameters based on your actual backend API
      const ordersResponse = await axios.get(`${BASE_URL}/api/v1/orders`, {
        params: {
          after: afterDate.toISOString(),
          status: ["PROCESSING", "COMPLETED", "PENDING"], // Map to new backend statuses
          limit: maxOrdersToRetry,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        headers: {
          accept: "application/json",
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          "Origin": origin,
        },
      });

      const orders = ordersResponse.data?.data || ordersResponse.data?.orders || [];
      
      if (!orders || orders.length === 0) {
        logger.log("[NB Auto-Retry] No recent orders found to retry");
        return NextResponse.json({
          success: true,
          message: "No orders to retry",
          orderCount: 0,
          lookbackMinutes,
        });
      }

      logger.log(`[NB Auto-Retry] Found ${orders.length} orders to attempt retry`);

      // Extract order IDs (new backend may use different field names)
      const orderIds = orders.map((order) => order.id || order.orderId || order.orderNumber).filter(Boolean);

      // Build URL for internal backfill endpoint
      let baseOrigin;
      try {
        baseOrigin = new URL(req.url).origin;
      } catch (_) {
        baseOrigin =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.SITE_URL ||
          "http://localhost:3000";
      }

      // Call the backfill endpoint (which handles deduplication and formatting)
      const backfillUrl = `${baseOrigin}/api/northbeam/backfill`;
      
      logger.log(`[NB Auto-Retry] Calling backfill endpoint with ${orderIds.length} orders`);
      
      const backfillResponse = await fetch(backfillUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_ids: orderIds,
          dry_run: false,
        }),
      });

      if (!backfillResponse.ok) {
        const errorText = await backfillResponse.text();
        throw new Error(
          `Backfill failed: ${backfillResponse.status} ${errorText}`
        );
      }

      const backfillResult = await backfillResponse.json();
      
      const duration = Date.now() - startTime;
      
      logger.log(
        `[NB Auto-Retry] ✅ Completed in ${duration}ms:`,
        `${backfillResult.totals?.ok || 0} succeeded,`,
        `${backfillResult.totals?.failed || 0} failed`
      );

      return NextResponse.json({
        success: true,
        message: "Auto-retry completed",
        duration: `${duration}ms`,
        lookbackMinutes,
        ordersAttempted: orderIds.length,
        results: {
          succeeded: backfillResult.totals?.ok || 0,
          failed: backfillResult.totals?.failed || 0,
        },
        // Include failed order IDs for monitoring
        failedOrderIds: backfillResult.results
          ?.filter((r) => r.status === "failed" || r.status === "error")
          .map((r) => r.id) || [],
      });
    } catch (fetchError) {
      logger.error("[NB Auto-Retry] Error fetching orders from backend:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch orders from backend",
          details: fetchError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("[NB Auto-Retry] Error during auto-retry:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Auto-retry failed",
        details: error.message,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing/debugging
 * Returns configuration and status info
 */
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  
  // Require authentication for GET as well
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized - CRON_SECRET must be configured" },
      { status: 401 }
    );
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lookbackMinutes = parseInt(process.env.NB_RETRY_LOOKBACK_MINUTES) || 120;
  const maxOrdersToRetry = parseInt(process.env.NB_RETRY_MAX_ORDERS) || 50;
  const isConfigured = !!(
    (process.env.NB_CLIENT_ID || process.env.NORTHBEAM_CLIENT_ID) &&
    (process.env.NB_API_KEY || process.env.NORTHBEAM_AUTH_TOKEN)
  );

  return NextResponse.json({
    status: "ready",
    configuration: {
      northbeamConfigured: isConfigured,
      lookbackMinutes,
      maxOrdersToRetry,
      afterDate: new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString(),
    },
    message: "Use POST to trigger manual retry, or let Vercel Cron handle it automatically",
  });
}