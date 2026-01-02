/**
 * Recommendation Rules Engine
 * Data-driven approach for quiz recommendations
 * Evaluates rules against user answers to determine product recommendations
 */

import { logger } from "./devLogger";

export function createRules(edges, quizData) {
  const rules = [];

  // Separate question edges (have sourceHandle) from result edges (no sourceHandle)
  const questionEdges = edges.filter((edge) => {
    const isValid = edge && edge.source && edge.sourceHandle && edge.target;
    if (!isValid && edge) {
      logger.log("⚠️ Skipping non-question edge (might be result-to-result):", edge);
    }
    return isValid;
  });

  logger.log(`📊 Total edges: ${edges.length}, Question edges: ${questionEdges.length}`);

  questionEdges.forEach((edge, index) => {
    logger.log(`🔍 Processing edge ${index + 1}/${questionEdges.length}:`, edge);
    // Pass ALL edges (including result-to-result) for alternative extraction
    rules.push(buildTheRule(edge, edges));
  });

  // Rename IDs to human-readable text if quiz data provided
  if (quizData) {
    return reNameQuestionsAndResults(rules, quizData);
  }

  return rules;
}

function buildTheRule(startEdge, edges, rule = {}) {
  // Validate edge structure
  if (!startEdge || !startEdge.source || !startEdge.sourceHandle) {
    logger.error("❌ Invalid edge structure:", startEdge);
    return rule;
  }

  // Extract question ID and option index from current edge
  var fromQId = startEdge.source.split("-")[1];
  var optionIndex = startEdge.sourceHandle.split("-")[1];

  // Add to rule
  rule[fromQId] = optionIndex;

  // Check if target is a question (not a result)
  if (NexIsProduct(startEdge.target)) {
    // Get next edge from this target
    var nextEdge = getNext(startEdge.target, edges);

    if (nextEdge) {
      // Recursively process next edge
      return buildTheRule(nextEdge, edges, rule);
    }
  } else {
    // Extract main result ID (first part after "result-")
    rule["result"] = startEdge.target.split("-")[1];
    
    // Extract alternative results by following result-to-result chains
    const alternatives = extractAlternativeResults(startEdge.target, edges);
    rule["alternativeProds"] = alternatives;
    
    logger.log(`🔗 Result ${rule["result"]} has ${alternatives.length} alternatives:`, alternatives);
  }

  // Base case: reached a result or no more edges
  return rule;
}

/**
 * Extract alternative result IDs by following result-to-result chains
 * @param {string} resultNode - The result node ID (e.g., "result-1-1765829705967")
 * @param {Array} edges - All edges in the quiz flow
 * @returns {Array} List of alternative result IDs
 */
function extractAlternativeResults(resultNode, edges) {
  const alternatives = [];
  let currentNode = resultNode;

  // Follow the chain of result-to-result edges
  while (true) {
    // Find edge where current result is the source
    const nextEdge = edges.find(edge => 
      edge.source === currentNode && edge.target.startsWith("result-")
    );

    if (!nextEdge) {
      // No more chained results
      break;
    }

    // Extract the result ID from the target (format: "result-{id}-{timestamp}")
    const targetParts = nextEdge.target.split("-");
    if (targetParts.length >= 2) {
      const alternativeId = targetParts[1];
      alternatives.push(alternativeId);
      logger.log(`📎 Found alternative result: ${alternativeId} from chain`);
    }

    // Move to next node in chain
    currentNode = nextEdge.target;
  }

  return alternatives;
}

function getNext(to, edges) {
  return edges.find((edge) => edge.source === to);
}

function NexIsProduct(to) {
  if (to.startsWith("result")) {
    return false;
  } else {
    return true;
  }
}

function reNameQuestionsAndResults(rules, quizData) {
  const steps = quizData.steps || [];
  const results = quizData.results || [];

  const renamedRules = rules.map((rule) => {
    const renamedRule = {};

    Object.entries(rule).forEach(([key, value]) => {
      if (key === "result") {
        // Find result by ID and use its title
        const result = results.find((r) => r.id == value);
        renamedRule["result"] = result ? result.id : value;
      } else {
        // Key is question ID, value is option index
        const questionId = key;
        const optionIndex = parseInt(value);

        // Find question/step by ID
        const step = steps.find((s) => s.id == questionId);

        if (step) {
          // Get question title
          const questionTitle = step.id;

          // Get option text by index
          const option = step.options?.[optionIndex];
          const optionText = option ? option.text : value;

          renamedRule[questionTitle] = optionText;
        } else {
          // If question not found, keep original
          renamedRule[key] = value;
        }
      }
    });

    return renamedRule;
  });

  return renamedRules;
}

function getAnswerText(answers, selectedOne) {
  return answers[selectedOne];
}

export function transformProductDataForCard(product, flowType) {
  // Null safety check
  if (!product) {
    logger.warn("⚠️ transformProductDataForCard: product is null or undefined");
    return null;
  }

  // ed, wl, hair
  switch (flowType) {
    case "ed":
        switch (product.productType) {
          case "pack":
            return transformEdPackProduct(product);
          case "generic-brand":
            return transformEdGenericBrandProduct(product);
          default:
            return product;
        }
      return {};
    case "hair":
      return transformHairProduct(product);
    case "wl":
      return transformWLProduct(product);
    default:
      return product;
  }
}

function transformEdGenericBrandProduct(product) {
    logger.log("Transforming ED product:", product);

    if (!product?.productData || !Array.isArray(product.productData)) {
      logger.error("❌ Invalid product data structure for ED product:", product);
      return null;
    }

    const BrandProductDetails = product.productData[0];
    const GenericProductDetails = product.productData[1] || null;

    // Extract individual product data
    const brandData = extractEDProductData(BrandProductDetails);
    const genericData = extractEDProductData(GenericProductDetails);

    // Merge both generic and brand into one transformed product
    const transformed = mergeGenericAndBrandProduct(brandData, genericData, BrandProductDetails, GenericProductDetails);

    return transformed;
}

function extractEDProductData(productDetails) {
    if (!productDetails) return null;

    return {
        id: productDetails.id,
        name: productDetails.name,
        image: productDetails.images?.[0]?.url || '',
        shortDescription: productDetails.shortDescription || '',
        pillOptions: extractPillOptions(productDetails),
    };
}

function mergeGenericAndBrandProduct(brandData, genericData, brandProductDetails, genericProductDetails) {
    const transformed = {};

    transformed.id = brandData.id;
    transformed.genericId = genericData ? genericData.id : null;
    transformed.name = brandData.name;
    transformed.image = genericData?.image || '';
    transformed.tagline = brandData.shortDescription;
    transformed.activeIngredient = genericData?.name || '';
    transformed.strengths = extractStrengthsFromVariants(brandProductDetails, genericProductDetails);
    transformed.preferences = ["generic", "brand"];

    // Merge pill options with same type and count
    const BrandPillOptions = brandData.pillOptions;
    const GenericPillOptions = genericData?.pillOptions || [];

    transformed.pillOptions = GenericPillOptions.map(genericOption => {
        const matchingBrandOption = BrandPillOptions.find(
            brandOption => brandOption.type === genericOption.type && brandOption.count === genericOption.count
        );

        return {
            type: genericOption.type,
            count: genericOption.count,
            genericPrice: genericOption.price,
            brandPrice: matchingBrandOption?.price || null,
            variationId: genericOption.id,
            brandVariationId: matchingBrandOption?.id || null,
        };
    });

    return transformed;
}


function extractStrengthsFromVariants(Prod1, Prod2) {
    const strengths = [];
    
    Prod1.globalAttributes.map(attribute => {
        if(attribute.slug == "dose-strength") {
            strengths.push(...attribute.value.split(",").map(str => str.trim()));
        }
    })

    Prod2.globalAttributes.map(attribute => {
        if(attribute.slug == "dose-strength") {
            strengths.push(...attribute.value.split(",").map(str => str.trim()));
        }
    })
    
    // Remove duplicates using Set
    return [...new Set(strengths)];
}


function extractPillOptions(Product) {
    const ActivePillOptionsInBrand = Product.variants
        .filter(variant => variant.status === "PUBLISHED")
        .map((variant) => ({
            type: variant.attributes.find((attr) => attr.name === "Subscription Type")?.value || null,
            id: variant.id,
            price: variant.price || null,
            count: variant.attributes.find((attr) => attr.name === "Tabs frequency")?.value || null,
        }));
    
    return ActivePillOptionsInBrand;
}

function transformEdPackProduct(product) {
    logger.log("Transforming ED Pack products:", product);

    if (!product?.productData || !Array.isArray(product.productData) || product.productData.length < 4) {
      logger.error("❌ Invalid product data structure for ED pack (needs 4 products):", product);
      return null;
    }

    var BrandProd1 = extractEDProductData(product.productData[0]);
    var GenericProd1 = extractEDProductData(product.productData[1]);

    var BrandProd2 = extractEDProductData(product.productData[2]);
    var GenericProd2 = extractEDProductData(product.productData[3]);

    var Prod1 = mergeGenericAndBrandProduct(BrandProd1, GenericProd1, product.productData[0], product.productData[1]);
    var Prod2 = mergeGenericAndBrandProduct(BrandProd2, GenericProd2, product.productData[2], product.productData[3]);

    // Merge both products into variety pack
    const varietyPackProduct = {
        name: `${Prod1.name} + ${Prod2.name}`,
        tagline: '"The Variety Pack"',
        image: product.productData[0].images?.[0]?.url || '',
        activeIngredient: `${Prod1.activeIngredient} + ${Prod2.activeIngredient}`,
        strengths: [
            ...Prod1.strengths.map(s => `${s} (${Prod1.name})`),
            ...Prod2.strengths.map(s => `${s} (${Prod2.name})`)
        ],
        preferences: ["generic", "brand"],
        frequencies: {
            "monthly-supply": "One Month",
            "quarterly-supply": "Three Months",
        },
        pillOptions: mergePackPillOptions(Prod1.pillOptions, Prod2.pillOptions),
        id: Prod1.id + "," + Prod2.id,
        genericId: (Prod1.genericId ? Prod1.genericId : '') + "," + (Prod2.genericId ? Prod2.genericId : ''),
    };

    return varietyPackProduct;
}

function mergePackPillOptions(prod1Options, prod2Options) {
    const groupedOptions = {
        "monthly-supply": [],
        "quarterly-supply": []
    };

    // Group options by subscription type and merge matching counts
    prod1Options.forEach(option1 => {
        const matchingOption2 = prod2Options.find(
            option2 => option2.type === option1.type && option2.count === option1.count
        );

        if (matchingOption2) {
            const subscriptionType = option1.type || "monthly-supply";
            
            groupedOptions[subscriptionType].push({
                count: `${option1.count}/${matchingOption2.count}`,
                genericPrice: (parseFloat(option1.genericPrice) + parseFloat(matchingOption2.genericPrice)),
                brandPrice: (parseFloat(option1.brandPrice) + parseFloat(matchingOption2.brandPrice)),
                variationId: `${option1.variationId},${matchingOption2.variationId}`,
                brandVariationId: `${option1.brandVariationId},${matchingOption2.brandVariationId}`,
            });
        }
    });

    return groupedOptions;
}



function transformWLProduct(product) {  
    if (!product?.productData) {
      logger.error("❌ Invalid product data structure for WL product:", product);
      return null;
    }

    var transformed = {};

    transformed.id = product.productData.id;
    transformed.name = product.productData.name;
    transformed.image = product.productData.images?.[0]?.url || '';
    transformed.description = product.productData.description || '';
    transformed.price = product.productData.variants.find((variant) => variant.status === "PUBLISHED")?.price || null;
    transformed.variationId = product.productData.variants.find((variant) => variant.status === "PUBLISHED")?.id || null;
    transformed.isSubscription = true;
    transformed.requireConsultation = true;
    transformed.subscriptionPeriod =  product.productData.variants.find((variant) => variant.status === "PUBLISHED")?.subscriptionPeriod || null;
    return transformed;
}

function transformHairProduct(product) {  
    if (!product?.productData) {
      logger.error("❌ Invalid product data structure for Hair product:", product);
      return null;
    }

    var transformed = {};

    transformed.id = product.productData.id;
    transformed.name = product.productData.name;
    transformed.image = product.productData.images?.[0]?.url || '';
    transformed.description = product.productData.shortDescription || '';
    transformed.price = product.productData.variants.find((variant) => variant.status === "PUBLISHED")?.price || null;
    transformed.variationId = product.productData.variants.find((variant) => variant.status === "PUBLISHED")?.id || null;
    transformed.isSubscription = true;
    transformed.requireConsultation = true;
    transformed.subscriptionPeriod =  product.productData.variants.find((variant) => variant.status === "PUBLISHED")?.subscriptionPeriod || null;
    return transformed;
}
