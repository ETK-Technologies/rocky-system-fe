import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { logger } from "@/utils/devLogger";

// Validate environment variables (lazy validation - only when api is accessed)
const validateEnvVariables = () => {
  const required = ["BASE_URL", "CONSUMER_KEY", "CONSUMER_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

// Lazy initialization - only create API instance when needed
let wooApiInstance = null;

const getWooApi = () => {
  if (!wooApiInstance) {
    validateEnvVariables();
    wooApiInstance = new WooCommerceRestApi({
      url: process.env.BASE_URL,
      consumerKey: process.env.CONSUMER_KEY,
      consumerSecret: process.env.CONSUMER_SECRET,
      version: "wc/v3",
      queryStringAuth: true,
      timeout: 300000, // 5 minutes timeout (300,000 milliseconds)
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }
  return wooApiInstance;
};

// Export a getter that validates on access
export const api = new Proxy({}, {
  get(target, prop) {
    const api = getWooApi();
    if (typeof api[prop] === 'function') {
      return api[prop].bind(api);
    }
    return api[prop];
  }
});

// Add the wooApiGet function for fetching data from WooCommerce API
export async function wooApiGet(endpoint, params = {}) {
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

    const response = await fetch(
      `${process.env.BASE_URL}/wp-json/wc/v3/${endpoint}?${new URLSearchParams({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        ...params,
      }).toString()}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(
        `[WooCommerce] Request timeout for ${endpoint} after 5 minutes`
      );
      throw new Error(`Request timeout for ${endpoint} after 5 minutes`);
    }
    logger.error(`[WooCommerce] Error in wooApiGet for ${endpoint}:`, error);
    throw error;
  }
}

// Simple in-memory cache for products to avoid duplicate fetches
const productCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Cache for product variations to avoid duplicate fetches
const variationsCache = new Map();

export async function fetchProductBySlug(slug) {
  if (!slug) {
    logger.error("No slug provided to fetchProductBySlug");
    return null;
  }

  // Check if the product is in the cache
  const cacheKey = `product_${slug}`;
  const cachedProduct = productCache.get(cacheKey);

  if (cachedProduct && Date.now() - cachedProduct.timestamp < CACHE_TTL) {
    logger.log(`[WooCommerce] Using cached product for slug: ${slug}`);
    return cachedProduct.data;
  }

  try {
    logger.log(`[WooCommerce] Fetching product with slug: ${slug}`);

    // Optimize the API call by only requesting needed fields
    const response = await api.get("products", {
      slug,
      status: "publish",
      per_page: 1,
      _fields: [
        "id",
        "name",
        "slug",
        "sku",
        "price",
        "images",
        "description",
        "short_description",
        "categories",
        "attributes",
        "variations",
        "meta_data",
        "type",
        "status",
        "stock_status",
        "regular_price",
        "sale_price",
        "on_sale",
        "purchasable",
        "total_sales",
        "virtual",
        "downloadable",
        "tax_status",
        "tax_class",
        "manage_stock",
        "stock_quantity",
        "backorders",
        "backorders_allowed",
        "backordered",
        "sold_individually",
        "weight",
        "dimensions",
        "shipping_required",
        "shipping_taxable",
        "shipping_class",
        "shipping_class_id",
        "reviews_allowed",
        "average_rating",
        "rating_count",
        "related_ids",
        "upsell_ids",
        "cross_sell_ids",
        "parent_id",
        "purchase_note",
        "featured",
        "catalog_visibility",
        "date_created",
        "date_modified",
      ].join(","),
    });

    if (response.data && response.data.length > 0) {
      const product = response.data[0];

      // Verify exact slug match
      if (product.slug === slug) {
        // Determine product type from categories
        const categories = product.categories?.map((cat) => cat.slug) || [];
        let productType = "default";

        if (categories.includes("ed")) productType = "ed";
        else if (categories.includes("dhm-blend")) productType = "dhm-blend";
        else if (categories.includes("smoking")) productType = "smoking";
        else if (categories.includes("hair")) productType = "hair";
        else if (categories.includes("weight-loss"))
          productType = "weight-loss";

        // Fetch variations and subscription data in parallel for better performance
        const [variations, subscriptionData] = await Promise.allSettled([
          fetchProductVariations(product.id, productType),
          api
            .get(`products/${product.id}/subscriptions`)
            .catch(() => ({ data: [] })),
        ]);

        // Add variations data if available
        if (variations.status === "fulfilled") {
          product.variations_data = variations.value;
        } else {
          logger.error(
            "[WooCommerce] Error fetching variations:",
            variations.reason
          );
          product.variations_data = [];
        }

        // Add subscription data if available
        if (subscriptionData.status === "fulfilled") {
          product.subscriptions = subscriptionData.value.data;
        } else {
          product.subscriptions = [];
        }

        // PATCH: Only apply this for lidocaine and lidocaine spray
        const isLidocaine =
          (product.slug && product.slug.toLowerCase().includes("lidocaine")) ||
          (product.name && product.name.toLowerCase().includes("lidocaine"));
        if (
          isLidocaine &&
          (!product.subscriptions || product.subscriptions.length === 0) &&
          Array.isArray(product.variations_data) &&
          product.variations_data.length > 0
        ) {
          // Find variations with a subscription-type attribute
          const subscriptionVariations = product.variations_data.filter((v) => {
            return (
              v.attributes &&
              (v.attributes["attribute_pa_subscription-type"] ||
                v.attributes["attribute_subscription-type"])
            );
          });
          if (subscriptionVariations.length > 0) {
            // Map and relabel subscription options
            const labelMap = {
              "one-time-purchase": "One Time Purchase",
              "monthly-supply": "Monthly Supply",
              "quarterly-supply": "Quarterly Supply",
              "one time purchase": "One Time Purchase",
              "monthly supply": "Monthly Supply",
              "quarterly supply": "Quarterly Supply",
              monthly: "Monthly Supply",
              quarterly: "Quarterly Supply",
              "one-time": "One Time Purchase",
            };
            // Helper to normalize the key
            const normalize = (str) =>
              (str || "").toLowerCase().replace(/[_-]/g, " ").trim();
            // Sort order
            const sortOrder = [
              "One Time Purchase",
              "Monthly Supply",
              "Quarterly Supply",
            ];
            // Map, relabel, and sort
            let mapped = subscriptionVariations.map((v) => {
              const raw =
                v.attributes["attribute_pa_subscription-type"] ||
                v.attributes["attribute_subscription-type"] ||
                v.sku ||
                v.id ||
                "Subscription";
              const label = labelMap[normalize(raw)] || "One Time Purchase";
              return {
                id: v.id || v.variation_id,
                variation_id: v.variation_id || v.id,
                name: label,
                price: v.display_price || v.price || v.regular_price,
                description: v.description || "",
                attributes: v.attributes,
                _sort: sortOrder.indexOf(label),
              };
            });
            mapped = mapped.sort((a, b) => a._sort - b._sort);
            mapped.forEach((m) => delete m._sort);
            product.subscriptions = mapped;
          }
        }

        // Cache the product
        productCache.set(cacheKey, {
          data: product,
          timestamp: Date.now(),
        });

        return product;
      }
    }

    // If no exact match found, try searching with a broader query
    logger.log(`[WooCommerce] No exact match found, trying search...`);
    const searchResponse = await api.get("products", {
      search: slug.replace(/-/g, " "),
      status: "publish",
      per_page: 1,
      _fields: [
        "id",
        "name",
        "slug",
        "sku",
        "price",
        "images",
        "description",
        "short_description",
        "categories",
        "attributes",
        "variations",
        "meta_data",
      ].join(","),
    });

    if (searchResponse.data && searchResponse.data.length > 0) {
      const product = searchResponse.data[0];
      // Verify exact slug match even for search results
      if (product.slug === slug) {
        // Cache the product
        productCache.set(cacheKey, {
          data: product,
          timestamp: Date.now(),
        });
        return product;
      }
    }

    logger.log(`[WooCommerce] No product found for slug: ${slug}`);
    return null;
  } catch (error) {
    logger.error("[WooCommerce] Error fetching product:", error.message);
    return null;
  }
}

export async function fetchProducts(params = {}) {
  try {
    const response = await api.get("products", {
      status: "publish",
      ...params,
    });
    return response.data;
  } catch (error) {
    logger.error(
      "Error fetching products:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function fetchProductCategories() {
  try {
    const response = await api.get("products/categories", {
      status: "publish",
    });
    return response.data;
  } catch (error) {
    logger.error(
      "Error fetching product categories:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function fetchRelatedProducts(productId, limit = 4) {
  try {
    const response = await api.get("products", {
      status: "publish",
      related: productId,
      per_page: limit,
    });
    return response.data;
  } catch (error) {
    logger.error(
      "Error fetching related products:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function fetchProductVariations(productId, productType) {
  // Check for cached variations first
  const cacheKey = `variations_${productId}_${productType}`;
  const cachedVariations = variationsCache.get(cacheKey);

  if (cachedVariations && Date.now() - cachedVariations.timestamp < CACHE_TTL) {
    logger.log(
      `[WooCommerce] Using cached variations for product ID: ${productId}`
    );
    return cachedVariations.data;
  }

  try {
    logger.log("[WooCommerce] Fetching variations for product ID:", productId);
    const response = await api.get(`products/${productId}/variations`, {
      per_page: 100,
      status: "publish",
    });

    // Transform the variations data to match the exact PHP format
    const formattedVariations = response.data.map((variation) => {
      // Format attributes to match the old PHP structure
      const attributes = {};
      variation.attributes.forEach((attr) => {
        // Convert attribute names to match PHP format based on product type
        let name, value;

        // Handle subscription type attributes
        if (
          attr.name.toLowerCase().includes("subscription") ||
          attr.name.toLowerCase().includes("dhm")
        ) {
          name = `attribute_pa_subscription-type`;
          value = attr.option.toLowerCase().replace(/\s+/g, "-");
        }
        // Handle quantity/pack attributes based on product type
        else if (
          attr.name.toLowerCase().includes("tabs") ||
          attr.name.toLowerCase().includes("capsules") ||
          attr.name.toLowerCase().includes("packs")
        ) {
          switch (productType) {
            case "ed":
              name = "attribute_pa_tabs-frequency";
              break;
            case "dhm-blend":
              name = "attribute_pa_subscription-type";
              break;
            case "smoking":
              name = "attribute_pa_zonnic-packs";
              break;
            default:
              name = `attribute_${attr.name
                .toLowerCase()
                .replace(/\s+/g, "-")}`;
          }
          value = attr.option.toLowerCase().replace(/\s+/g, "-");
        }
        // Handle all other attributes - trigger cart refresh for all product types
        else {
          name = `attribute_${attr.name.toLowerCase().replace(/\s+/g, "-")}`;
          value = attr.option.toLowerCase().replace(/\s+/g, "-");
        }

        attributes[name] = value;
      });

      // Create the formatted variation object matching PHP structure exactly
      const formatted = {
        attributes: attributes,
        availability_html: "",
        backorders_allowed: variation.backorders_allowed,
        dimensions: variation.dimensions || {
          length: "",
          width: "",
          height: "",
        },
        dimensions_html: "N/A",
        display_price: parseFloat(variation.regular_price || variation.price),
        display_regular_price: parseFloat(
          variation.regular_price || variation.price
        ),
        image: variation.image
          ? {
              title: variation.image.name || "",
              caption: "",
              url: variation.image.src || "",
              alt: variation.image.alt || "",
              src: variation.image.src || "",
              srcset: "",
              sizes: "(max-width: 600px) 100vw, 600px",
              full_src: variation.image.src || "",
              full_src_w: variation.image.width || 975,
              full_src_h: variation.image.height || 650,
              gallery_thumbnail_src: variation.image.src || "",
              gallery_thumbnail_src_w: 140,
              gallery_thumbnail_src_h: 140,
              thumb_src: variation.image.src || "",
              thumb_src_w: 300,
              thumb_src_h: 300,
              src_w: 600,
              src_h: 400,
            }
          : null,
        image_id: variation.image?.id || "",
        is_downloadable: variation.downloadable || false,
        is_in_stock: variation.stock_status === "instock",
        is_purchasable: variation.purchasable || true,
        is_sold_individually: "no",
        is_virtual: variation.virtual || false,
        max_qty: "",
        min_qty: 1,
        price_html: `$${variation.price}${
          attributes["attribute_pa_subscription-type"] === "quarterly-supply"
            ? " every 3 months"
            : " / month"
        }`,
        sku: variation.sku || "",
        variation_description: variation.description || "",
        variation_id: variation.id,
        variation_is_active: 1,
        variation_is_visible: 1,
        weight: variation.weight || "",
        weight_html: "N/A",
        input_value: 1,
        first_payment_html: "",
      };

      return formatted;
    });

    // Cache the variations
    variationsCache.set(cacheKey, {
      data: formattedVariations,
      timestamp: Date.now(),
    });

    return formattedVariations;
  } catch (error) {
    logger.error("[WooCommerce] Error fetching variations:", error.message);
    return [];
  }
}
