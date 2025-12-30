/**
 * ED Flow Products Configuration
 * Defines which products to display on the /ed-flow page
 * Products will be fetched dynamically from the API using these slugs
 *
 * IMPORTANT: Generic and Brand are SEPARATE products in the API.
 * Each product entry requires BOTH slugs:
 * - First slug: Generic version product
 * - Second slug: Brand version product (detected by "®" in name by transformation)
 *
 * The transformation utility (transformEDProducts) automatically merges them by:
 * - Grouping products by activeIngredient (Tadalafil, Sildenafil)
 * - Detecting brand products by checking for "®" in the product name
 * - Merging pricing data from both versions into pillOptions
 *
 * slugs: Array with exactly 2 slugs [genericSlug, brandSlug]
 *        If you don't know the brand slug, check the API or product database
 */
export const ED_FLOW_PRODUCTS = [
  {
    name: "Cialis",
    // REQUIRED: Both generic and brand product slugs
    // Format: [genericSlug, brandSlug]
    // Update brand slug based on actual API slug (e.g., "cialis-brand", "cialis-®", etc.)
    slugs: ["tadalafil-cialis", "cialis"], // TODO: Verify brand slug in API
    tagline: '"The weekender"',
    order: 1,
    filterKey: "cialis",
    activeIngredient: "Tadalafil",
    preferences: ["generic", "brand"], // Both must be available
  },
  {
    name: "Viagra",
    // REQUIRED: Both generic and brand product slugs
    // Format: [genericSlug, brandSlug]
    // Update brand slug based on actual API slug (e.g., "viagra-brand", "viagra-®", etc.)
    slugs: ["sildenafil-viagra", "viagra"], // TODO: Verify brand slug in API
    tagline: '"The one-nighter"',
    order: 2,
    filterKey: "viagra",
    activeIngredient: "Sildenafil",
    preferences: ["generic", "brand"], // Both must be available
  },
  // NOTE: Variety Pack is NOT a separate product
  // It's automatically created by transformEDProducts when both Cialis (Tadalafil) and Viagra (Sildenafil) products are fetched
  // The pricing is calculated as the sum of selected variations from both products
];

/**
 * Get all product slugs as flat array for API fetching
 * This flattens the slugs arrays from all products
 */
export const getEDFlowProductSlugs = () => {
  return ED_FLOW_PRODUCTS.flatMap(
    (product) => product.slugs || [product.slug]
  ).filter(Boolean);
};

/**
 * Get product config by slug
 * Checks both the slugs array and legacy slug property
 */
export const getEDFlowProductBySlug = (slug) => {
  return ED_FLOW_PRODUCTS.find(
    (product) =>
      (product.slugs && product.slugs.includes(slug)) ||
      product.slug === slug ||
      product.name.toLowerCase() === slug.toLowerCase()
  );
};

/**
 * Get product config by filter key (used in showonly parameter)
 */
export const getEDFlowProductByFilterKey = (filterKey) => {
  return ED_FLOW_PRODUCTS.find((product) => product.filterKey === filterKey);
};
