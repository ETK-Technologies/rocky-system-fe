/**
 * Recommendation Rules Engine
 * Data-driven approach for quiz recommendations
 * Evaluates rules against user answers to determine product recommendations
 */

import { logger } from "./devLogger";

export function createRules(edges, quizData) {
  const rules = [];

  edges.forEach((edge, index) => {
    logger.log(`🔍 Processing edge ${index + 1}/${edges.length}:`, edge);
    rules.push(buildTheRule(edge, edges));
  });

  // Rename IDs to human-readable text if quiz data provided
  if (quizData) {
    return reNameQuestionsAndResults(rules, quizData);
  }

  return rules;
}

function buildTheRule(startEdge, edges, rule = {}) {
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
    rule["result"] = startEdge.target.split("-")[1];
  }

  // Base case: reached a result or no more edges
  return rule;
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
      return product;
    case "wl":
      return product;
    default:
      return product;
  }
}

function transformEdGenericBrandProduct(product) {
    logger.log("Transforming ED product:", product);

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
        pillOptions: mergePackPillOptions(Prod1.pillOptions, Prod2.pillOptions)
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


}

function transformHairProduct(product) {  

}
