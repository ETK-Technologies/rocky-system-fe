import { NextResponse } from "next/server";
import { fetchProductBySlugFromBackend } from "@/lib/api/productApi";
import { logger } from "@/utils/devLogger";
import { getEDFlowProductSlugs } from "@/config/edFlowProducts";

/**
 * API endpoint to fetch ED flow products
 * Accepts slugs in query params or uses default from config
 * Returns raw product data from backend API
 */
export async function GET(request) {
  try {
    // Get slugs from query params or use default from config
    const { searchParams } = new URL(request.url);
    const slugsParam = searchParams.get("slugs");
    
    let slugs = [];
    if (slugsParam) {
      // Parse comma-separated slugs from query param
      slugs = slugsParam.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      // Use default slugs from config
      slugs = getEDFlowProductSlugs();
    }

    if (!slugs || slugs.length === 0) {
      return NextResponse.json(
        { error: "No product slugs provided" },
        { status: 400 }
      );
    }

    logger.log(`[ED Flow API] Fetching products for slugs: ${slugs.join(", ")}`);

    // Fetch all products in parallel
    const productPromises = slugs.map(async (slug) => {
      try {
        const product = await fetchProductBySlugFromBackend(slug, true, request);
        if (product) {
          return { slug, product, success: true };
        }
        return { slug, product: null, success: false, error: "Product not found" };
      } catch (error) {
        logger.error(`[ED Flow API] Error fetching product ${slug}:`, error);
        return { slug, product: null, success: false, error: error.message };
      }
    });

    const results = await Promise.all(productPromises);

    // Filter out failed fetches and extract products
    const products = results
      .filter(result => result.success && result.product)
      .map(result => result.product);

    // Log any failures
    const failures = results.filter(result => !result.success);
    if (failures.length > 0) {
      logger.warn(
        `[ED Flow API] Failed to fetch ${failures.length} product(s):`,
        failures.map(f => `${f.slug}: ${f.error}`).join(", ")
      );
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products found", failures },
        { status: 404 }
      );
    }

    logger.log(`[ED Flow API] Successfully fetched ${products.length} product(s)`);

    return NextResponse.json(
      { products, fetched: products.length, requested: slugs.length },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    logger.error("[ED Flow API] Error in GET handler:", error);
    return NextResponse.json(
      { error: "Failed to fetch ED flow products", details: error.message },
      { status: 500 }
    );
  }
}

