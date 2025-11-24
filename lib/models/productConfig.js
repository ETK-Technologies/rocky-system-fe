/**
 * Product Config
 * Configuration for special product behavior and display
 */

/**
 * Configuration for special product cases by slug
 */
export const PRODUCT_SPECIAL_CONFIGS = {
  // Minoxidil specific configuration
  minoxidil: {
    frequencyLabel: "every 3 months for 24 months",
    variationSelectionStrategy: "lowestPrice", // Strategy for selecting variation
    displayOptions: {
      showFrequencyLabel: true,
      preventLabelWrapping: true,
    },
  },

  // Finasteride specific configuration
  finasteride: {
    frequencyLabel: "every 3 months for 24 months",
    variationSelectionStrategy: "first",
  },

  // Finasteride-minoxidil-topical-foam specific configuration
  "finasteride-minoxidil-topical-foam": {
    frequencyLabel: "$185.00 every 3 months", // Price will be added dynamically from API
    variationSelectionStrategy: "highestPrice", // Use highest price variation (185)
  },

  // Essential hair supplements configurations
  "essential-ix": {
    frequencyLabel: "every 3 months for 24 months",
    variationSelectionStrategy: "first",
  },
  "essential-v": {
    frequencyLabel: "every 3 months for 24 months",
    variationSelectionStrategy: "first",
  },

  // Lidocaine specific configuration
  lidocaine: {
    customPricing: {
      monthlyDiscount: 0.15, // 15% discount
      quarterlyPrice: 80, // Fixed price
    },
  },
};

/**
 * Get product configuration for a specific product slug
 * @param {string} slug - Product slug
 * @returns {Object} Product configuration or empty object if not found
 */
export function getProductConfig(slug) {
  if (!slug) return {};

  // First, try exact match
  if (PRODUCT_SPECIAL_CONFIGS[slug]) {
    return PRODUCT_SPECIAL_CONFIGS[slug];
  }

  // If no exact match, check for partial matches
  const matchingKey = Object.keys(PRODUCT_SPECIAL_CONFIGS).find((key) =>
    slug.includes(key)
  );

  if (matchingKey) {
    return PRODUCT_SPECIAL_CONFIGS[matchingKey];
  }

  // No special config found
  return {};
}

export default {
  PRODUCT_SPECIAL_CONFIGS,
  getProductConfig,
};
