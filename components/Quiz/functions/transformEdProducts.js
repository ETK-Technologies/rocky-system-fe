/**
 * Transform ED product data from backend format to EDProductCard format
 * Groups brand/generic pairs and structures variant pricing data
 */

/**
 * Extract active ingredient from product
 * First tries globalAttribute "product", then falls back to description text parsing
 * @param {Object} product - Product object
 * @returns {string} - Active ingredient name (Tadalafil or Sildenafil)
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
 * Extract strength values from short description
 * @param {string} shortDescription - Product short description
 * @returns {string[]} - Array of strength values like ["10mg", "20mg"]
 */
const extractStrengths = (shortDescription) => {
  if (!shortDescription) return [];
  
  // Match patterns like "10mg and 20mg" or "50mg and 100mg"
  const strengthPattern = /(\d+mg)/g;
  const matches = shortDescription.match(strengthPattern);
  
  return matches ? [...new Set(matches)] : [];
};

/**
 * Parse tab count from variant attribute value
 * @param {string} value - Attribute value like "4-tabs", "30-tabs"
 * @returns {number} - Tab count
 */
const parseTabCount = (value) => {
  if (!value) return 0;
  const match = value.match(/(\d+)-tabs?/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Get frequency label from subscription type value
 * @param {string} value - Subscription type like "monthly-supply"
 * @returns {string} - Display label like "Monthly"
 */
const getFrequencyLabel = (value) => {
  const labels = {
    "monthly-supply": "Monthly",
    "quarterly-supply": "Quarterly",
    "bi-weekly-supply": "Bi-Weekly",
  };
  return labels[value] || value;
};

/**
 * Check if product is brand (contains ® symbol) or generic
 * @param {string} name - Product name
 * @returns {boolean} - True if brand product
 */
const isBrandProduct = (name) => {
  return name && name.includes("®");
};

/**
 * Group variants by frequency and tab count
 * @param {Array} variants - Product variants array
 * @param {boolean} isBrand - Whether this is a brand product
 * @returns {Object} - Structured pillOptions grouped by frequency
 */
const groupVariantsByFrequency = (variants, isBrand) => {
  const grouped = {};
  
  variants.forEach((variant) => {
    if (variant.status !== "PUBLISHED" || !variant.isActive) return;
    
    let tabFrequency = null;
    let subscriptionType = null;
    
    // Extract attributes
    variant.attributes?.forEach((attr) => {
      if (attr.name === "Tabs frequency") {
        tabFrequency = attr.value;
      }
      if (attr.name === "Subscription Type") {
        subscriptionType = attr.value;
      }
    });
    
    if (!tabFrequency || !subscriptionType) return;
    
    const tabCount = parseTabCount(tabFrequency);
    if (tabCount === 0) return;
    
    // Initialize frequency group if needed
    if (!grouped[subscriptionType]) {
      grouped[subscriptionType] = [];
    }
    
    // Find existing entry for this tab count
    let entry = grouped[subscriptionType].find((item) => item.count === tabCount);
    
    if (!entry) {
      entry = {
        count: tabCount,
        genericPrice: null,
        brandPrice: null,
        genericVariationId: null,
        brandVariationId: null,
      };
      grouped[subscriptionType].push(entry);
    }
    
    // Set price and variation ID based on brand/generic
    if (isBrand) {
      entry.brandPrice = variant.price;
      entry.brandVariationId = variant.id;
    } else {
      entry.genericPrice = variant.price;
      entry.genericVariationId = variant.id;
    }
  });
  
  // Sort by tab count within each frequency
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => a.count - b.count);
  });
  
  return grouped;
};

/**
 * Merge brand and generic product data into single pillOptions structure
 * @param {Object} brandProduct - Brand product data
 * @param {Object} genericProduct - Generic product data
 * @returns {Object} - Merged pillOptions
 */
const mergeBrandGenericPricing = (brandProduct, genericProduct) => {
  const brandOptions = brandProduct ? groupVariantsByFrequency(brandProduct.variants, true) : {};
  const genericOptions = genericProduct ? groupVariantsByFrequency(genericProduct.variants, false) : {};
  
  const merged = {};
  
  // Get all unique frequency keys
  const allFrequencies = new Set([
    ...Object.keys(brandOptions),
    ...Object.keys(genericOptions),
  ]);
  
  console.log("🔗 Merging brand and generic pricing:");
  console.log("  Brand product:", brandProduct?.name, "| Variants:", brandProduct?.variants?.length || 0);
  console.log("  Generic product:", genericProduct?.name, "| Variants:", genericProduct?.variants?.length || 0);
  
  allFrequencies.forEach((frequency) => {
    const brandItems = brandOptions[frequency] || [];
    const genericItems = genericOptions[frequency] || [];
    
    console.log(`  📋 Frequency: ${frequency}`);
    console.log(`    Brand items:`, brandItems.map(i => `${i.count} tabs ($${i.brandPrice})`).join(", "));
    console.log(`    Generic items:`, genericItems.map(i => `${i.count} tabs ($${i.genericPrice})`).join(", "));
    
    // Create a map of all unique tab counts
    const tabCountMap = new Map();
    
    brandItems.forEach((item) => {
      tabCountMap.set(item.count, {
        count: item.count,
        genericPrice: null,
        brandPrice: item.brandPrice,
        genericVariationId: null,
        brandVariationId: item.brandVariationId,
      });
    });
    
    genericItems.forEach((item) => {
      if (tabCountMap.has(item.count)) {
        const existing = tabCountMap.get(item.count);
        existing.genericPrice = item.genericPrice;
        existing.genericVariationId = item.genericVariationId;
      } else {
        tabCountMap.set(item.count, {
          count: item.count,
          genericPrice: item.genericPrice,
          brandPrice: null,
          genericVariationId: item.genericVariationId,
          brandVariationId: null,
        });
      }
    });
    
    // Convert map to sorted array
    merged[frequency] = Array.from(tabCountMap.values()).sort((a, b) => a.count - b.count);
    
    // Log merged results
    const mergedItems = merged[frequency];
    const withBothPrices = mergedItems.filter(i => i.brandPrice && i.genericPrice).length;
    const genericOnly = mergedItems.filter(i => !i.brandPrice && i.genericPrice).length;
    const brandOnly = mergedItems.filter(i => i.brandPrice && !i.genericPrice).length;
    
    console.log(`    ✅ Merged: ${mergedItems.length} options (Both prices: ${withBothPrices}, Generic only: ${genericOnly}, Brand only: ${brandOnly})`);
  });
  
  return merged;
};

/**
 * Transform raw product data array into EDProductCard format
 * @param {Array} products - Array of product objects from API (can be results with productData arrays)
 * @returns {Array} - Transformed products ready for EDProductCard
 */
export const transformEDProducts = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }
  
  console.log("🔄 Transform ED Products - Input:", products.length, "products");
  
  // Check if this is a pack result
  const packResult = products.find(p => p.productType === "pack");
  const isPackResult = !!packResult;
  
  if (isPackResult) {
    console.log("🎁 PACK RESULT DETECTED:", packResult.title);
    console.log("🎁 Pack has", packResult.productData?.length || 0, "products");
    console.log("🎁 Main Product IDs:", packResult.mainProductId);
  }
  
  // Flatten productData arrays - each result can contain multiple products
  const flattenedProducts = [];
  products.forEach((item) => {
    // Store the result metadata for pack handling
    const resultMetadata = {
      title: item.title,
      productType: item.productType,
      mainProductId: item.mainProductId,
      id: item.id,
    };
    
    // If item has productData array, flatten it
    if (item.productData && Array.isArray(item.productData)) {
      console.log(`📦 Flattening productData array with ${item.productData.length} products from result:`, item.title || item.id);
      item.productData.forEach(product => {
        flattenedProducts.push({
          ...product,
          _resultMetadata: resultMetadata, // Attach result metadata to each product
        });
      });
    } 
    // If item has single productData object, use it
    else if (item.productData && typeof item.productData === 'object') {
      flattenedProducts.push({
        ...item.productData,
        _resultMetadata: resultMetadata,
      });
    }
    // If item IS the product itself (no wrapper)
    else if (item.name && (item.variants || item.images)) {
      flattenedProducts.push({
        ...item,
        _resultMetadata: resultMetadata,
      });
    }
  });
  
  console.log("📊 Flattened to", flattenedProducts.length, "individual products");
  
  // Detect if this is a pack (multiple active ingredients in same result)
  // Check if we have both Sildenafil and Tadalafil products
  const ingredients = new Set(
    flattenedProducts.map(p => extractActiveIngredient(p)).filter(Boolean)
  );
  const isPack = isPackResult || (ingredients.size > 1 && ingredients.has("Sildenafil") && ingredients.has("Tadalafil"));
  
  if (isPack) {
    console.log("🎁 PACK DETECTED - Will merge Viagra + Cialis into combo product");
  }
  
  // Group products by active ingredient
  const productsByIngredient = {};
  
  flattenedProducts.forEach((product) => {
    if (!product) return;
    
    const activeIngredient = extractActiveIngredient(product);
    if (!activeIngredient) {
      console.warn("⚠️ No active ingredient found for product:", product.name);
      return;
    }
    
    const isBrand = isBrandProduct(product.name);
    console.log(`📦 Product: ${product.name}, Ingredient: ${activeIngredient}, IsBrand: ${isBrand}`);
    
    if (!productsByIngredient[activeIngredient]) {
      productsByIngredient[activeIngredient] = {
        brand: null,
        generic: null,
      };
    }
    
    if (isBrand) {
      productsByIngredient[activeIngredient].brand = product;
    } else {
      productsByIngredient[activeIngredient].generic = product;
    }
  });
  
  console.log("📊 Products grouped by ingredient:", productsByIngredient);
  
  // Transform each ingredient group into EDProductCard format
  const transformed = [];
  
  // If this is a pack, create a single combo product
  if (isPack && productsByIngredient["Sildenafil"] && productsByIngredient["Tadalafil"]) {
    console.log("🎁 Creating PACK product from Viagra + Cialis");
    
    const viagraBrand = productsByIngredient["Sildenafil"].brand;
    const viagraGeneric = productsByIngredient["Sildenafil"].generic;
    const cialisBrand = productsByIngredient["Tadalafil"].brand;
    const cialisGeneric = productsByIngredient["Tadalafil"].generic;
    
    // Build combo pill options by matching frequencies and counts
    const viagraOptions = groupVariantsByFrequency(viagraBrand?.variants || [], true);
    const viagraGenericOptions = groupVariantsByFrequency(viagraGeneric?.variants || [], false);
    const cialisOptions = groupVariantsByFrequency(cialisBrand?.variants || [], true);
    const cialisGenericOptions = groupVariantsByFrequency(cialisGeneric?.variants || [], false);
    
    console.log("🔗 Viagra options:", viagraOptions);
    console.log("🔗 Cialis options:", cialisOptions);
    
    const comboPillOptions = {};
    
    // Get all frequencies
    const allFrequencies = new Set([
      ...Object.keys(viagraOptions),
      ...Object.keys(viagraGenericOptions),
      ...Object.keys(cialisOptions),
      ...Object.keys(cialisGenericOptions),
    ]);
    
    allFrequencies.forEach((frequency) => {
      comboPillOptions[frequency] = [];
      
      const viagraItems = [...(viagraOptions[frequency] || []), ...(viagraGenericOptions[frequency] || [])];
      const cialisItems = [...(cialisOptions[frequency] || []), ...(cialisGenericOptions[frequency] || [])];
      
      // Match viagra and cialis items by count (e.g., 4 Viagra + 4 Cialis)
      const matchedPairs = new Map();
      
      viagraItems.forEach(vItem => {
        cialisItems.forEach(cItem => {
          if (vItem.count === cItem.count) {
            const key = `${vItem.count}/${cItem.count}`;
            if (!matchedPairs.has(key)) {
              matchedPairs.set(key, {
                count: key,
                genericPrice: null,
                brandPrice: null,
                genericVariationId: null,
                brandVariationId: null,
              });
            }
            
            const pair = matchedPairs.get(key);
            
            // Combine generic prices and IDs
            if (vItem.genericVariationId && cItem.genericVariationId) {
              pair.genericPrice = (vItem.genericPrice || 0) + (cItem.genericPrice || 0);
              pair.genericVariationId = `${cItem.genericVariationId},${vItem.genericVariationId}`;
            }
            
            // Combine brand prices and IDs
            if (vItem.brandVariationId && cItem.brandVariationId) {
              pair.brandPrice = (vItem.brandPrice || 0) + (cItem.brandPrice || 0);
              pair.brandVariationId = `${cItem.brandVariationId},${vItem.brandVariationId}`;
            }
          }
        });
      });
      
      comboPillOptions[frequency] = Array.from(matchedPairs.values())
        .filter(item => item.genericVariationId || item.brandVariationId)
        .sort((a, b) => {
          const aCount = parseInt(a.count.split('/')[0]) || 0;
          const bCount = parseInt(b.count.split('/')[0]) || 0;
          return aCount - bCount;
        });
      
      console.log(`🎁 Pack frequency ${frequency}:`, comboPillOptions[frequency]);
    });
    
    // Build frequencies object
    const frequencies = {};
    Object.keys(comboPillOptions).forEach((key) => {
      frequencies[key] = getFrequencyLabel(key);
    });
    
    // Use first available product for base info and get result metadata
    const primaryProduct = viagraGeneric || viagraBrand || cialisGeneric || cialisBrand;
    const resultMetadata = primaryProduct._resultMetadata || {};
    
    // Use result title if available, otherwise default to "Viagra & Cialis"
    const packTitle = resultMetadata.title || "Viagra & Cialis";
    
    // Get main product IDs (comma-separated for cart)
    const mainProductIds = resultMetadata.mainProductId 
      ? (Array.isArray(resultMetadata.mainProductId) 
          ? resultMetadata.mainProductId.join(',') 
          : resultMetadata.mainProductId)
      : [viagraBrand?.id, viagraGeneric?.id, cialisBrand?.id, cialisGeneric?.id].filter(Boolean).join(',');
    
    console.log("🎁 Pack configuration:", {
      title: packTitle,
      productType: resultMetadata.productType,
      mainProductIds: mainProductIds,
      resultId: resultMetadata.id
    });
    
    transformed.push({
      id: resultMetadata.id || primaryProduct.id,
      productId: mainProductIds, // Comma-separated product IDs for cart
      name: packTitle,
      title: packTitle,
      slug: "variety-pack",
      image: "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/RockyHealth-variety-400px%20(1).webp",
      description: "The Variety Pack - Try both Viagra (Sildenafil) and Cialis (Tadalafil)",
      shortDescription: "Combination pack with both medications",
      activeIngredient: "Tadalafil + Sildenafil",
      strengths: ["50mg & 100mg (Viagra)", "10mg & 20mg (Cialis)"],
      preferences: ["generic", "brand"],
      frequencies,
      pillOptions: comboPillOptions,
      isPack: true,
      productType: "pack",
      tagline: '"The Variety Pack"',
      _originalViagraBrand: viagraBrand,
      _originalViagraGeneric: viagraGeneric,
      _originalCialisBrand: cialisBrand,
      _originalCialisGeneric: cialisGeneric,
    });
    
    console.log("✅ Pack product created:", transformed[0]);
    return transformed;
  }
  
  // Regular flow: Transform individual products
  Object.entries(productsByIngredient).forEach(([activeIngredient, { brand, generic }]) => {
    // Use generic product as primary, fallback to brand
    const primaryProduct = generic || brand;
    if (!primaryProduct) return;
    
    const strengths = extractStrengths(primaryProduct.shortDescription);
    const pillOptions = mergeBrandGenericPricing(brand, generic);
    
    console.log(`💊 Merged pill options for ${activeIngredient}:`, pillOptions);
    
    // Build frequencies object with labels
    const frequencies = {};
    Object.keys(pillOptions).forEach((key) => {
      frequencies[key] = getFrequencyLabel(key);
    });
    
    // Get primary image
    const image = primaryProduct.images?.[0]?.url || "";
    
    transformed.push({
      id: primaryProduct.id,
      name: primaryProduct.name,
      title: primaryProduct.name,
      slug: primaryProduct.slug,
      image,
      description: primaryProduct.description,
      shortDescription: primaryProduct.shortDescription,
      activeIngredient,
      strengths,
      preferences: ["generic", "brand"], // Standard for ED products
      frequencies,
      pillOptions,
      // Include original product data for reference
      _originalBrand: brand,
      _originalGeneric: generic,
    });
  });
  
  console.log("✅ Transformed products:", transformed);
  
  return transformed;
};

export default transformEDProducts;
