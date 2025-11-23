/**
 * Hair Category Handler
 * Handles specific logic for Hair products
 */
import CategoryHandler from "./CategoryHandler";
import { PRODUCT_TYPES, VARIATION_TYPES } from "../../constants/productTypes";

export class HairCategoryHandler extends CategoryHandler {
  constructor(product) {
    super(product);
    this.categoryName = "hair";
  }

  /**
   * Get product type for display
   * @returns {string} Product type constant
   */
  getProductType() {
    return PRODUCT_TYPES.HAIR;
  }

  /**
   * Check if this handler has special subscription handling
   * @returns {boolean} True for hair products
   */
  hasSpecialSubscriptionHandling() {
    return true;
  }

  /**
   * Get variation type for this category
   * @returns {string} Variation type constant
   */
  getVariationType() {
    const product = this.getProduct();
    const hasVariations = product.getVariations?.()?.length > 0 || false;

    if (hasVariations) {
      return VARIATION_TYPES.SUBSCRIPTION;
    }

    return VARIATION_TYPES.SIMPLE;
  }

  /**
   * Gets the custom frequency label based on product slug
   * @param {string} slug - Product slug
   * @returns {string} Frequency label
   */
  getFrequencyLabel(slug) {
    // For finasteride-minoxidil-topical-foam, the label will be set dynamically from API price
    // This method is used as a fallback, but the actual price will come from the variation
    if (slug.includes("finasteride-minoxidil-topical-foam")) {
      return "every 3 months"; // Will be replaced with dynamic price in formatSubscriptionVariations
    } else if (slug.includes("finasteride")) {
      return "every 3 months for 24 months";
    } else if (slug.includes("minoxidil")) {
      return "every 3 months for 24 months";
    } else if (slug.includes("essential-ix")) {
      return "every 3 months for 24 months";
    } else if (slug.includes("essential-v")) {
      return "every 3 months for 24 months";
    }

    return "every 3 months for 24 months";
  }

  /**
   * Format subscription variations for Hair products
   * @param {Object} product - The product object
   * @returns {Array} Formatted subscription variations
   */
  formatSubscriptionVariations(product) {
    const variations = product.getVariations();
    if (!variations || variations.length === 0) return [];

    const slug = product.getSlug();
    const frequencyLabel = this.getFrequencyLabel(slug);

    // Check if it's a special hair product (finasteride or minoxidil)
    const isMinoxidil = slug.includes("minoxidil");
    const isFinasteride = slug.includes("finasteride");
    const isSpecialHairProduct = isFinasteride || isMinoxidil;

    // Format variations according to display requirements
    let subscriptionOptions = [];

    if (isSpecialHairProduct && variations.length >= 1) {
      if (isMinoxidil) {
        // For minoxidil, we want to select the variation that matches the live site
        // Specifically we want the variation with the quarterly subscription at $101.25

        // First look for variations with quarterly subscription attribute
        let quarterlyVariations = variations.filter((v) => {
          const attrs = v.attributes || {};
          return Object.entries(attrs).some(
            ([key, value]) =>
              key.includes("subscription") &&
              (String(value).includes("quarterly") ||
                String(value).includes("3-month"))
          );
        });

        // If we found quarterly variations, sort by price (descending) and take the first
        if (quarterlyVariations.length > 0) {
          const variationToUse = quarterlyVariations.sort(
            (a, b) => b.display_price - a.display_price
          )[0];

          // Make sure we're using the sale price if it exists
          const price =
            variationToUse.display_regular_price &&
              variationToUse.display_price < variationToUse.display_regular_price
              ? variationToUse.display_price // This is the sale price
              : variationToUse.price || variationToUse.display_price;

          const singleOption = {
            id: variationToUse.variation_id.toString(),
            label: "every 3 months for 24 months",
            originalLabel: frequencyLabel,
            price: price,
            regularPrice: variationToUse.display_regular_price || null,
            variation_id: variationToUse.variation_id,
            isHairProduct: true,
          };
          subscriptionOptions = [singleOption];
        } else {
          // If we couldn't find a quarterly variation, look for the most expensive variation
          // This is a fallback that should match the pricing on the live site
          const variationToUse = [...variations].sort(
            (a, b) => b.display_price - a.display_price
          )[0];

          // Make sure we're using the sale price if it exists
          const price =
            variationToUse.display_regular_price &&
              variationToUse.display_price < variationToUse.display_regular_price
              ? variationToUse.display_price // This is the sale price
              : variationToUse.price || variationToUse.display_price;

          const singleOption = {
            id: variationToUse.variation_id.toString(),
            label: "every 3 months for 24 months",
            originalLabel: frequencyLabel,
            price: price,
            regularPrice: variationToUse.display_regular_price || null,
            variation_id: variationToUse.variation_id,
            isHairProduct: true,
          };
          subscriptionOptions = [singleOption];
        }
      } else {
        // For finasteride and other hair products, keep the existing logic
        // For finasteride-minoxidil-topical-foam, select the highest price variation (185)
        let variationToUse = variations[0];

        if (slug.includes("finasteride-minoxidil-topical-foam")) {
          // Select the variation with the highest price (should be 185)
          variationToUse = variations.reduce((highest, current) => {
            const currentPrice = Number.parseFloat(current.price || current.display_price || 0);
            const highestPrice = Number.parseFloat(highest.price || highest.display_price || 0);
            return currentPrice > highestPrice ? current : highest;
          }, variations[0]);
        }

        // Use sale price if available and less than regular price, otherwise use regular price
        const regularPrice = Number.parseFloat(variationToUse.display_regular_price || variationToUse.regular_price || variationToUse.price || variationToUse.display_price || 0);
        const salePrice = variationToUse.sale_price ? Number.parseFloat(variationToUse.sale_price) : null;
        const displayPrice = variationToUse.display_price ? Number.parseFloat(variationToUse.display_price) : null;

        // Determine the final price: use sale_price if it exists and is valid, otherwise use regular price
        const price = (salePrice && salePrice < regularPrice)
          ? salePrice
          : (displayPrice && displayPrice < regularPrice)
            ? displayPrice
            : regularPrice;

        // Build dynamic frequency label with actual price from API
        const dynamicFrequencyLabel = slug.includes("finasteride-minoxidil-topical-foam")
          ? `$${price.toFixed(2)} every 3 months`
          : frequencyLabel;

        const singleOption = {
          id: variationToUse.variation_id.toString(),
          label: "every 3 months for 24 months",
          originalLabel: dynamicFrequencyLabel,
          price: price,
          regularPrice: regularPrice,
          salePrice: salePrice,
          variation_id: variationToUse.variation_id,
          isHairProduct: true,
        };

        subscriptionOptions = [singleOption];
      }
    } else {
      // For other hair products, show all available variations
      subscriptionOptions = variations.map((variation) => {
        // Make sure we're using the sale price if it exists
        const price =
          variation.display_regular_price &&
            variation.display_price < variation.display_regular_price
            ? variation.display_price // This is the sale price
            : variation.price || variation.display_price;

        // Get the subscription type from attributes
        const subscriptionType =
          variation.attributes["attribute_pa_subscription-type"];

        // Determine the appropriate label based on subscription type
        let label;
        if (subscriptionType) {
          if (subscriptionType.includes("quarterly")) {
            label = "Quarterly Subscription";
          } else if (subscriptionType.includes("monthly")) {
            label = "Monthly Subscription";
          } else {
            label = "One Time Purchase";
          }
        } else {
          label = "One Time Purchase";
        }

        return {
          id: variation.variation_id.toString(),
          label: label,
          originalLabel: label, // Use the determined label as originalLabel
          price: price,
          regularPrice: variation.display_regular_price || null,
          variation_id: variation.variation_id,
          isHairProduct: true,
        };
      });
    }

    return subscriptionOptions;
  }

  /**
   * Get consultation link for Hair products
   * @returns {string} Consultation link
   */
  getConsultationLink() {
    return "/hair-main-questionnaire";
  }

  /**
   * Format data for display on product page
   * @returns {Object} Formatted data for Hair products
   */
  formatForProductDisplay() {
    const product = this.getProduct();
    const variationType = this.getVariationType();
    let variations = null;

    variations = this.formatSubscriptionVariations(product);

    return {
      product: product.getData(),
      productType: this.getProductType(),
      variationType: variationType,
      variations: variations,
      consultationLink: this.getConsultationLink(),
    };
  }
}

export default HairCategoryHandler;
