/**
 * Server-side function to fetch ED Flow products
 * Used for Server-Side Rendering (SSR) with automatic caching
 * 
 * Next.js 13+ App Router automatically caches fetch requests:
 * - Data is cached during request time
 * - Can be configured for revalidation (ISR)
 * - Faster than client-side fetching as it happens on the server
 */

import { fetchProductBySlugFromBackend } from "@/lib/api/productApi";
import { getEDFlowProductSlugs } from "@/config/edFlowProducts";
import { logger } from "@/utils/devLogger";

/**
 * Fetch ED Flow products server-side
 * This function runs on the server (or at build time with static generation)
 * Next.js will automatically cache the results for better performance
 * 
 * @param {Request} request - Optional request object for context
 * @returns {Promise<Array>} Array of product data
 */
export async function fetchEDFlowProducts(request = null) {
  try {
    const slugs = getEDFlowProductSlugs();

    if (!slugs || slugs.length === 0) {
      logger.warn("[Fetch ED Flow] No product slugs found in config");
      return [];
    }

    logger.log(`[Fetch ED Flow] Fetching ${slugs.length} product(s) server-side: ${slugs.join(", ")}`);

    // Fetch all products in parallel
    // Since this runs server-side, it's faster than client-side fetching
    // Next.js will cache these fetches automatically
    const productPromises = slugs.map(async (slug) => {
      try {
        const product = await fetchProductBySlugFromBackend(slug, true, request);
        if (product) {
          return { slug, product, success: true };
        }
        return { slug, product: null, success: false, error: "Product not found" };
      } catch (error) {
        logger.error(`[Fetch ED Flow] Error fetching product ${slug}:`, error);
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
        `[Fetch ED Flow] Failed to fetch ${failures.length} product(s):`,
        failures.map(f => `${f.slug}: ${f.error}`).join(", ")
      );
    }

    logger.log(`[Fetch ED Flow] Successfully fetched ${products.length} product(s) server-side`);

    return products;
  } catch (error) {
    logger.error("[Fetch ED Flow] Error in server-side fetch:", error);
    return [];
  }
}

