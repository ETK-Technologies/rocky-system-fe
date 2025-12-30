/**
 * Transform ED Flow Products
 * Adapts products from API to EdProductCard format
 * Reuses transformEDProducts logic and adds ED Flow specific metadata
 */

import { transformEDProducts } from "@/components/Quiz/functions/transformEdProducts";
import { ED_FLOW_PRODUCTS, getEDFlowProductBySlug } from "@/config/edFlowProducts";
import { logger } from "@/utils/devLogger";

/**
 * Extract active ingredient from product (reused from transformEdProducts)
 */
const extractActiveIngredient = (product) => {
  if (!product) return "";
  
  // Method 1: Try globalAttributes "product" field (most reliable)
  if (product.globalAttributes && Array.isArray(product.globalAttributes)) {
    const productAttr = product.globalAttributes.find(
      attr => attr.slug === "product" || attr.name === "product"
    );
    
    if (productAttr && productAttr.value) {
      const value = productAttr.value.toLowerCase();
      if (value.includes("tadalafil")) return "Tadalafil";
      if (value.includes("sildenafil")) return "Sildenafil";
    }
  }
  
  // Method 2: Fallback to description parsing
  const description = product.description || "";
  if (description.includes("Tadalafil") || description.includes("tadalafil")) {
    return "Tadalafil";
  }
  if (description.includes("Sildenafil") || description.includes("sildenafil")) {
    return "Sildenafil";
  }
  
  return "";
};

/**
 * Get frequency label for display
 * Matches the format expected by EdProductCard
 */
const getFrequencyLabel = (value) => {
  const labels = {
    "monthly-supply": "One Month",
    "quarterly-supply": "Three Months",
    "bi-weekly-supply": "Bi-Weekly",
  };
  return labels[value] || value;
};

/**
 * Normalize pillOptions to match EdProductCard format
 * Maps genericVariationId -> variationId
 * Ensures brandVariationId is present
 */
const normalizePillOptions = (pillOptions) => {
  if (!pillOptions || typeof pillOptions !== "object") {
    return {};
  }

  const normalized = {};

  Object.keys(pillOptions).forEach((frequency) => {
    normalized[frequency] = pillOptions[frequency].map((option) => {
      return {
        count: option.count,
        genericPrice: option.genericPrice,
        brandPrice: option.brandPrice,
        // Map genericVariationId to variationId for EdProductCard compatibility
        variationId: option.genericVariationId || option.variationId,
        brandVariationId: option.brandVariationId,
      };
    });
  });

  return normalized;
};

/**
 * Transform products for ED Flow page
 * For ED Flow, we need BOTH individual products AND variety pack (unlike quiz which returns one or the other)
 * @param {Array} apiProducts - Raw product data from API
 * @param {Object} config - Optional configuration overrides
 * @returns {Array} - Transformed products ready for EdProductCard (individual products + variety pack)
 */
export const transformEdFlowProducts = (apiProducts, config = {}) => {
  if (!Array.isArray(apiProducts) || apiProducts.length === 0) {
    logger.warn("[Transform ED Flow] No products provided");
    return [];
  }

  logger.log(`[Transform ED Flow] Transforming ${apiProducts.length} product(s)`);

  // Check if we have both ingredients for variety pack creation
  const hasBothIngredients = apiProducts.some(p => {
    const ingredient = extractActiveIngredient(p);
    return ingredient === "Tadalafil";
  }) && apiProducts.some(p => {
    const ingredient = extractActiveIngredient(p);
    return ingredient === "Sildenafil";
  });

  // Transform to get individual products
  // Create a modified products array to prevent variety pack creation
  // by temporarily removing one ingredient's products
  let transformed = [];
  
  if (hasBothIngredients) {
    // Get individual products by transforming without creating pack
    // Split products by ingredient and transform separately, then combine
    const tadalafilProducts = apiProducts.filter(p => {
      const ingredient = extractActiveIngredient(p);
      return ingredient === "Tadalafil";
    });
    const sildenafilProducts = apiProducts.filter(p => {
      const ingredient = extractActiveIngredient(p);
      return ingredient === "Sildenafil";
    });
    
    // Transform Cialis (Tadalafil) products alone - will give us individual Cialis
    if (tadalafilProducts.length > 0) {
      const cialisTransformed = transformEDProducts(tadalafilProducts);
      transformed = transformed.concat(cialisTransformed);
    }
    
    // Transform Viagra (Sildenafil) products alone - will give us individual Viagra
    if (sildenafilProducts.length > 0) {
      const viagraTransformed = transformEDProducts(sildenafilProducts);
      transformed = transformed.concat(viagraTransformed);
    }
    
    // Now create variety pack by transforming all products together
    const allTransformed = transformEDProducts(apiProducts);
    const varietyPack = allTransformed.find(p => 
      p.isPack || 
      p.slug === "variety-pack" ||
      (p.activeIngredient?.includes("Tadalafil") && p.activeIngredient?.includes("Sildenafil"))
    );
    
    if (varietyPack) {
      transformed.push(varietyPack);
    }
  } else {
    // If we don't have both ingredients, just transform normally
    transformed = transformEDProducts(apiProducts);
  }

  if (!transformed || transformed.length === 0) {
    logger.warn("[Transform ED Flow] No products after transformation");
    return [];
  }

  logger.log(`[Transform ED Flow] Created ${transformed.length} product(s) (individual + variety pack if applicable)`);

  // Enhance with ED Flow specific metadata
  const enhanced = transformed.map((product) => {
    // Find config entry by slug to get tagline and order
    const configEntry = getEDFlowProductBySlug(product.slug);

    // Normalize pillOptions format
    const normalizedPillOptions = normalizePillOptions(product.pillOptions);

    // Ensure frequencies use proper labels and correct order (Monthly first, then Quarterly)
    const frequencies = {};
    const frequencyOrder = ["monthly-supply", "quarterly-supply", "bi-weekly-supply"];
    
    // Build frequencies object with correct order
    if (product.frequencies) {
      // Use the defined order to ensure Monthly comes first
      frequencyOrder.forEach((key) => {
        if (product.frequencies[key]) {
          frequencies[key] = product.frequencies[key] || getFrequencyLabel(key);
        }
      });
      // Add any other frequencies not in the standard order
      Object.keys(product.frequencies).forEach((key) => {
        if (!frequencies[key]) {
          frequencies[key] = product.frequencies[key] || getFrequencyLabel(key);
        }
      });
    } else if (normalizedPillOptions) {
      // Generate frequencies from pillOptions keys, ensuring correct order
      frequencyOrder.forEach((key) => {
        if (normalizedPillOptions[key]) {
          frequencies[key] = getFrequencyLabel(key);
        }
      });
      // Add any other frequencies not in the standard order
      Object.keys(normalizedPillOptions).forEach((key) => {
        if (!frequencies[key]) {
          frequencies[key] = getFrequencyLabel(key);
        }
      });
    }

    // Build enhanced product
    const enhancedProduct = {
      ...product,
      // Apply tagline from config or use existing
      tagline: configEntry?.tagline || product.tagline || "",
      // Use normalized pillOptions
      pillOptions: normalizedPillOptions,
      // Ensure frequencies object exists with correct order (Monthly first)
      frequencies: Object.keys(frequencies).length > 0 ? frequencies : {
        "monthly-supply": "One Month",
        "quarterly-supply": "Three Months",
      },
      // Ensure preferences array exists
      preferences: product.preferences || ["generic", "brand"],
      // Preserve order from config
      _order: configEntry?.order || 999,
    };

    // Handle variety pack special case
    if (
      product.slug === "variety-pack" ||
      product.name?.toLowerCase().includes("variety") ||
      product.isPack
    ) {
      enhancedProduct.name = "Cialis + Viagra";
      enhancedProduct.tagline = configEntry?.tagline || '"The Variety Pack"';
    } else if (configEntry) {
      // Use the display name from config instead of API name
      // This ensures modal checks like product.name === "Cialis" work correctly
      enhancedProduct.name = configEntry.name || product.name;
    }

    return enhancedProduct;
  });

  // Sort by order from config
  enhanced.sort((a, b) => (a._order || 999) - (b._order || 999));

  logger.log(
    `[Transform ED Flow] Successfully transformed ${enhanced.length} product(s)`
  );

  return enhanced;
};

/**
 * Filter products based on showonly parameter
 * @param {Array} products - Transformed products
 * @param {string} showonly - Filter key (e.g., 'cialis', 'viagra', 'variety')
 * @returns {Array} - Filtered products
 */
export const filterEdFlowProducts = (products, showonly) => {
  if (!products || products.length === 0) {
    return products;
  }

  // If no filter, show all products (including variety pack if auto-created)
  if (!showonly) {
    return products;
  }

  const filterKey = showonly.toLowerCase();

  // Special handling for variety pack filter
  if (filterKey === "variety" || filterKey === "variety-pack") {
    // Filter to show only the variety pack product (auto-created by transformEDProducts)
    const varietyPack = products.filter(
      (p) =>
        p.slug === "variety-pack" ||
        p.isPack === true ||
        p.name?.toLowerCase().includes("variety") ||
        (p.activeIngredient?.includes("Tadalafil") &&
          p.activeIngredient?.includes("Sildenafil"))
    );

    if (varietyPack.length > 0) {
      logger.log(
        `[Filter ED Flow] Filtered to variety pack product`
      );
      return varietyPack;
    }
    // If variety pack doesn't exist yet, return empty (it's a combination product)
    return [];
  }

  // Find matching product by filter key (individual products only - exclude variety pack)
  const configEntry = ED_FLOW_PRODUCTS.find(
    (p) => p.filterKey === filterKey
  );

  if (!configEntry) {
    logger.warn(
      `[Filter ED Flow] No product found for filter key: ${filterKey}`
    );
    // If filter doesn't match, exclude variety pack and return matching products
    return products.filter(
      (p) =>
        !(
          p.slug === "variety-pack" ||
          p.isPack === true ||
          p.name?.toLowerCase().includes("variety") ||
          (p.activeIngredient?.includes("Tadalafil") &&
            p.activeIngredient?.includes("Sildenafil"))
        )
    );
  }

  // Filter by matching slug or name, but EXCLUDE variety pack
  const filtered = products.filter(
    (p) => {
      // Exclude variety pack when filtering individual products
      const isVarietyPack =
        p.slug === "variety-pack" ||
        p.isPack === true ||
        p.name?.toLowerCase().includes("variety") ||
        (p.activeIngredient?.includes("Tadalafil") &&
          p.activeIngredient?.includes("Sildenafil"));

      if (isVarietyPack) {
        return false;
      }

      // Match the individual product
      return (
        (configEntry.slugs && configEntry.slugs.includes(p.slug)) ||
        p.slug === configEntry.slug ||
        p.name?.toLowerCase() === configEntry.name?.toLowerCase() ||
        p.activeIngredient?.toLowerCase() === configEntry.activeIngredient?.toLowerCase()
      );
    }
  );

  logger.log(
    `[Filter ED Flow] Filtered to ${filtered.length} product(s) for key: ${filterKey} (excluded variety pack)`
  );

  return filtered.length > 0 ? filtered : []; // Return empty if no match found
};

export default transformEdFlowProducts;

