/**
 * Product Configuration
 * Static data for products that's not available in the API
 * Map products by their ID to add descriptions, features, details, etc.
 */

export const productConfig = {
  // Weight Loss Products
  weightLoss: {
    // Example: Semaglutide Oral
    cmidswuq702mtvrv8bilrkk6y: {
      description: "(semaglutide) injection",
      details:
        "A once-weekly injectable GLP-1 medication with weight loss benefits.",
      features: [
        {
          title: "Reduces cravings",
        },
        {
          title: "Helps regulate blood sugar levels",
        },
        {
          title: "Helps maintain feelings of fullness",
        },
      ],
    },

    cmj8ut45o01rxqr01mydqc0lz: {
      description: "(semaglutide) injection",
      details:
        "A high-dose GLP-1 injection approved for chronic weight management.",
      features: [
        {
          title: "Reduces cravings",
        },
        {
          title: "Helps regulate blood sugar levels",
        },
        {
          title: "Helps maintain feelings of fullness",
        },
      ],
    },
    // Example: Rybelsus
    cmidszmcp03mxvrv8lp9rmy4s: {
      description: "(tirzepatide) injection",
      details:
        "Mounjaro® is the brand name for Tirzepatide which is a FDA approved drug. It helps reduce appetite and keeps you feeling fuller for longer.",
      features: [
        {
          title: "Reduces cravings",
        },
        {
          title: "Helps regulate blood sugar levels",
        },
        {
          title: "Helps maintain feelings of fullness",
        },
      ],
    },

    // Example: Rybelsus
    cmj8v05140005ph010v2aomvq: {
      description: "(semaglutide) tablets",
      details:
        "The first oral GLP-1 tablet designed to support modest weight loss.",
      features: [
        {
          title: "Reduces cravings",
        },
        {
          title: "Helps regulate blood sugar levels",
        },
        {
          title: "Helps maintain feelings of fullness",
        },
      ],
    },
  },

  // ED Products
  ed: {
   
  },

  // Hair Loss Products
  hair: {
    // Add hair loss product configurations here
  },

  // Mental Health Products
  mentalHealth: {
    // Add mental health product configurations here
  },
};

/**
 * Get product configuration by category and product ID
 * @param {string} category - The product category (weightLoss, ed, hair, mentalHealth)
 * @param {string|number} productId - The product ID
 * @returns {object|null} Product configuration or null if not found
 */
export const getProductConfig = (category, productId) => {
  const categoryConfig = productConfig[category];
  if (!categoryConfig) return null;

  return categoryConfig[String(productId)] || null;
};

/**
 * Get product features by category and product ID
 * @param {string} category - The product category
 * @param {string|number} productId - The product ID
 * @returns {array} Array of features or empty array
 */
export const getProductFeatures = (category, productId) => {
  const config = getProductConfig(category, productId);
  return config?.features || [];
};

/**
 * Get product description by category and product ID
 * @param {string} category - The product category
 * @param {string|number} productId - The product ID
 * @returns {string} Product description or empty string
 */
export const getProductDescription = (category, productId) => {
  const config = getProductConfig(category, productId);
  return config?.description || "";
};

/**
 * Get product details by category and product ID
 * @param {string} category - The product category
 * @param {string|number} productId - The product ID
 * @returns {string} Product details or empty string
 */
export const getProductDetails = (category, productId) => {
  const config = getProductConfig(category, productId);
  return config?.details || "";
};
