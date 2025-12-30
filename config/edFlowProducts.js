/**
 * ED Flow Products Configuration
 * Defines which products to display on the /ed-flow page
 * Generic and Brand are separate products in the API, merged by the transformation utility
 */
export const ED_FLOW_PRODUCTS = [
  {
    name: "Cialis",
    slugs: ["tadalafil-cialis", "cialis"],
    tagline: '"The weekender"',
    order: 1,
    filterKey: "cialis",
    activeIngredient: "Tadalafil",
    preferences: ["generic", "brand"],
  },
  {
    name: "Viagra",
    slugs: ["sildenafil-viagra", "viagra"],
    tagline: '"The one-nighter"',
    order: 2,
    filterKey: "viagra",
    activeIngredient: "Sildenafil",
    preferences: ["generic", "brand"],
  },
];

/**
 * Get all product slugs as flat array for API fetching
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
