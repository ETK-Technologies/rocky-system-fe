/**
 * Product Adapter
 * Transforms new backend API response to format expected by existing components
 */

/**
 * Transform new backend API product response to WooCommerce-like format
 * @param {Object} apiProduct - Product data from new backend API
 * @returns {Object} Transformed product data in WooCommerce format
 */
export function transformBackendProductToWooCommerceFormat(apiProduct) {
  if (!apiProduct) return null;

  // Transform images
  const images = (apiProduct.images || []).map((img) => ({
    id: img.id || null,
    src: img.url || img.src || "",
    alt: img.alt || apiProduct.name || "",
    name: img.name || "",
  }));

  // Extract variants from attributes or direct variants array
  // Some products have variants nested under attribute options, others have them directly
  let allVariants = [];
  const variantAttributeMap = new Map(); // Map variant ID to its attribute values

  if (apiProduct.variants && apiProduct.variants.length > 0) {
    // Direct variants array (like finasteride-minoxidil-topical-foam, sildenafil-viagra)
    // Filter out variants that are not active or not visible
    allVariants = apiProduct.variants.filter((variant) => {
      // Exclude variants that are explicitly marked as inactive or not visible
      if (variant.isActive === false) {
        return false;
      }
      if (variant.visible === false) {
        return false;
      }
      return true;
    });

    // Map variant attributes
    allVariants.forEach((variant) => {
      const attributesObj = {};
      (variant.attributes || []).forEach((attr) => {
        const attrSlug =
          attr.attribute?.slug ||
          attr.name?.toLowerCase().replace(/\s+/g, "-") ||
          "";
        const normalizedValue = (attr.value || "")
          .toLowerCase()
          .replace(/\s+/g, "-");
        attributesObj[`attribute_pa_${attrSlug}`] = normalizedValue;
        attributesObj[`attribute_${attrSlug}`] = normalizedValue;
        attributesObj[attrSlug] = normalizedValue;
      });
      variantAttributeMap.set(variant.id, attributesObj);
    });
  } else if (apiProduct.attributes && apiProduct.attributes.length > 0) {
    // Variants nested under attribute options (like tadalafil-cialis, sildenafil-viagra)
    const seenVariantIds = new Set();

    apiProduct.attributes.forEach((attr) => {
      const attrSlug =
        attr.slug ||
        attr.attribute?.slug ||
        attr.name?.toLowerCase().replace(/\s+/g, "-") ||
        "";
      const attrName = attr.name || attr.attribute?.name || "";

      (attr.options || []).forEach((option) => {
        // Skip options that are not visible
        if (option.visible === false) {
          return;
        }

        const optionValue = option.value || "";
        // Normalize the option value (e.g., "4 Tabs" -> "4-tabs")
        const normalizedOptionValue = optionValue
          .toLowerCase()
          .replace(/\s+/g, "-");

        (option.variants || []).forEach((variant) => {
          // Initialize attribute map for this variant if not already done
          if (!variantAttributeMap.has(variant.id)) {
            variantAttributeMap.set(variant.id, {});
            // Only add variant to list once
            if (!seenVariantIds.has(variant.id)) {
              seenVariantIds.add(variant.id);
              allVariants.push(variant);
            }
          }

          const attributesObj = variantAttributeMap.get(variant.id);

          // For tabs-frequency attribute, use normalized value for ED products
          if (
            attrSlug === "tabs-frequency" ||
            attrSlug.includes("tabs") ||
            attrSlug.includes("frequency")
          ) {
            // EdCategoryHandler expects: attribute_pa_tabs-frequency or attribute_tabs-frequency
            // Only set if not already set (to avoid overwriting with different values)
            if (!attributesObj["attribute_pa_tabs-frequency"]) {
              attributesObj["attribute_pa_tabs-frequency"] =
                normalizedOptionValue;
              attributesObj["attribute_tabs-frequency"] = normalizedOptionValue;
            }
            // Also keep the original slug format
            attributesObj[`attribute_pa_${attrSlug}`] = normalizedOptionValue;
            attributesObj[`attribute_${attrSlug}`] = normalizedOptionValue;
          } else {
            // For other attributes, use normalized value
            attributesObj[`attribute_pa_${attrSlug}`] = normalizedOptionValue;
            attributesObj[`attribute_${attrSlug}`] = normalizedOptionValue;
            attributesObj[attrSlug] = normalizedOptionValue;
          }

          // For ED products, infer subscription frequency from subscriptionInterval
          // subscriptionInterval: 1 = monthly, 3 = quarterly
          // Only set if not already set
          if (
            !attributesObj["attribute_pa_subscription-type"] &&
            variant.subscriptionInterval !== null &&
            variant.subscriptionInterval !== undefined
          ) {
            const frequency =
              variant.subscriptionInterval === 3
                ? "quarterly-supply"
                : "monthly-supply";
            attributesObj["attribute_pa_subscription-type"] = frequency;
            attributesObj["attribute_subscription-type"] = frequency;
          }
        });
      });
    });
  }

  // Transform variants to variations format
  // Filter out variants with isActive: false or visible: false
  const variations = allVariants
    .filter((variant) => {
      // Skip variants that are explicitly marked as inactive or not visible
      if (variant.isActive === false) {
        return false;
      }
      if (variant.visible === false) {
        return false;
      }
      return true;
    })
    .map((variant) => {
      const attributesObj = variantAttributeMap.get(variant.id) || {};

      // Ensure subscription-type is set based on subscriptionInterval if not already set
      if (
        !attributesObj["attribute_pa_subscription-type"] &&
        variant.subscriptionInterval !== null &&
        variant.subscriptionInterval !== undefined
      ) {
        const frequency =
          variant.subscriptionInterval === 3
            ? "quarterly-supply"
            : "monthly-supply";
        attributesObj["attribute_pa_subscription-type"] = frequency;
        attributesObj["attribute_subscription-type"] = frequency;
      }

      return {
        id: variant.id,
        variation_id: variant.id,
        name: variant.name || apiProduct.name,
        sku: variant.sku || "",
        price:
          variant.price || variant.salePrice || apiProduct.basePrice || "0",
        display_price:
          variant.price || variant.salePrice || apiProduct.basePrice || "0",
        regular_price: variant.price || apiProduct.basePrice || "0",
        sale_price: variant.salePrice || null,
        stock_status: variant.stockQuantity > 0 ? "instock" : "outofstock",
        stock_quantity: variant.stockQuantity || 0,
        manage_stock:
          variant.manageStock !== undefined ? variant.manageStock : true,
        backorders: variant.backorders || "no",
        attributes: attributesObj,
        subscription_period: variant.subscriptionPeriod || null,
        subscription_interval: variant.subscriptionInterval || null,
        subscription_length: variant.subscriptionLength || null,
        subscription_sign_up_fee: variant.subscriptionSignUpFee || null,
        subscription_trial_length: variant.subscriptionTrialLength || null,
        subscription_trial_period: variant.subscriptionTrialPeriod || null,
        // ✅ Include isActive flag from backend API (default to true if not specified)
        isActive: variant.isActive !== undefined ? variant.isActive : true,
        status: variant.status || apiProduct.status,
      };
    });

  // Transform categories
  const categories = (apiProduct.categories || []).map((cat) => ({
    id: cat.category?.id || cat.categoryId,
    name: cat.category?.name || "",
    slug: cat.category?.slug || "",
  }));

  // Transform attributes - handle both globalAttributes and attributes
  // Filter out attributes with visible: false
  const attributes = [];

  // First, try globalAttributes (like finasteride-minoxidil-topical-foam, sildenafil-viagra)
  if (apiProduct.globalAttributes && apiProduct.globalAttributes.length > 0) {
    apiProduct.globalAttributes.forEach((attr) => {
      // Skip attributes with visible: false (explicitly false)
      if (attr.visible === false) {
        return;
      }

      // Handle options - globalAttributes may have options array or value string
      let options = [];
      if (
        attr.options &&
        Array.isArray(attr.options) &&
        attr.options.length > 0
      ) {
        // If options array exists, map the values
        options = attr.options.map((opt) => {
          return typeof opt === "string" ? opt : opt.value || opt;
        });
      } else if (attr.value && typeof attr.value === "string") {
        // If value is a comma-separated string, split it
        options = attr.value
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      }

      attributes.push({
        id: attr.attributeId || attr.attribute?.id,
        name: attr.name || attr.attribute?.name,
        slug: attr.slug || attr.attribute?.slug,
        options: options,
        variation: attr.variation !== undefined ? attr.variation : false,
        visible: attr.visible !== undefined ? attr.visible : true,
        position: attr.position || 0,
      });
    });
  }

  // Then, try attributes (like tadalafil-cialis)
  if (apiProduct.attributes && apiProduct.attributes.length > 0) {
    apiProduct.attributes.forEach((attr) => {
      // Skip attributes with visible: false (explicitly false)
      if (attr.visible === false) {
        return;
      }

      attributes.push({
        id: attr.attributeId || attr.attribute?.id,
        name: attr.name || attr.attribute?.name,
        slug: attr.slug || attr.attribute?.slug,
        options: (attr.options || []).map((opt) => {
          return typeof opt === "string" ? opt : opt.value || opt;
        }),
        variation: attr.variation !== undefined ? attr.variation : true, // Default to true for variation attributes
        visible: attr.visible !== undefined ? attr.visible : true,
        position: attr.position || 0,
      });
    });
  }

  // Determine product type
  let type = "simple";
  if (apiProduct.type === "VARIABLE_SUBSCRIPTION") {
    type = "variable-subscription";
  } else if (variations.length > 0) {
    type = "variable";
  }

  // Build the transformed product object
  const transformed = {
    id: apiProduct.id,
    wordpress_id: apiProduct.wordpressId || null,
    name: apiProduct.name || "",
    slug: apiProduct.slug || "",
    type: type,
    status: apiProduct.status?.toLowerCase() || "publish",
    sku: apiProduct.sku || "",
    price: apiProduct.salePrice || apiProduct.basePrice || "0",
    regular_price: apiProduct.basePrice || "0",
    sale_price: apiProduct.salePrice || null,
    on_sale:
      !!apiProduct.salePrice && apiProduct.salePrice !== apiProduct.basePrice,
    description: apiProduct.description || "",
    short_description: apiProduct.shortDescription || "",
    images: images,
    categories: categories,
    attributes: attributes,
    variations: variations,
    variations_data: variations, // Also include as variations_data for VariableProduct compatibility
    meta_data: [],
    stock_status: apiProduct.stockQuantity > 0 ? "instock" : "outofstock",
    stock_quantity: apiProduct.stockQuantity || 0,
    manage_stock:
      apiProduct.trackInventory !== undefined
        ? apiProduct.trackInventory
        : true,
    backorders: apiProduct.backorders?.toLowerCase() || "no",
    backorders_allowed: apiProduct.backorders?.toLowerCase() === "yes",
    backordered: false,
    sold_individually: false,
    virtual: apiProduct.virtual || false,
    downloadable: apiProduct.downloadable || false,
    tax_status: apiProduct.taxStatus?.toLowerCase() || "none",
    tax_class: apiProduct.taxClass || "",
    shipping_required:
      apiProduct.shippingRequired !== undefined
        ? apiProduct.shippingRequired
        : true,
    shipping_class: null,
    shipping_class_id: apiProduct.shippingClassId || null,
    reviews_allowed:
      apiProduct.reviewsAllowed !== undefined
        ? apiProduct.reviewsAllowed
        : true,
    average_rating: apiProduct.averageRating || 0,
    rating_count: apiProduct.reviewCount || 0,
    total_sales: apiProduct.totalSales || 0,
    featured: apiProduct.featured || false,
    purchasable: true,
    weight: apiProduct.weight || null,
    dimensions: {
      length: apiProduct.length || null,
      width: apiProduct.width || null,
      height: apiProduct.height || null,
    },
    date_created: apiProduct.createdAt || new Date().toISOString(),
    date_modified: apiProduct.updatedAt || new Date().toISOString(),
    // Additional fields from new API
    _raw: apiProduct, // Keep raw data for reference
  };

  return transformed;
}

export default {
  transformBackendProductToWooCommerceFormat,
};
