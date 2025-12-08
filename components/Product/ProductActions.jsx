"use client";

import { useState } from "react";
import { logger } from "@/utils/devLogger";
import Link from "next/link";
import CartPopup from "../Cart/CartPopup";
import { addItemToCart } from "@/lib/cart/cartService";
import { addRequiredConsultation } from "@/utils/requiredConsultation";
import { analyticsService } from "@/utils/analytics/analyticsService";
import { formatPrice } from "@/utils/priceFormatter";
import { toast } from "react-toastify";

const ProductActions = ({
  price = 90,
  selectedVariationPrice = null,
  productType = null,
  product = null,
  selectedVariation = null,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCartPopup, setShowCartPopup] = useState(false);

  // Use the selectedVariationPrice if available, otherwise fall back to the default price
  const displayPrice =
    selectedVariationPrice !== null ? selectedVariationPrice : price;

  // Check if there's a sale price available
  const hasSalePrice =
    selectedVariation &&
    selectedVariation.sale_price &&
    Number(selectedVariation.sale_price) <
    Number(selectedVariation.regular_price);

  // If there's a sale price, use it, otherwise use the regular price
  const finalPrice = hasSalePrice
    ? Number(selectedVariation.sale_price)
    : displayPrice;


  const handleAddToCart = async () => {
    try {
      setIsLoading(true);

      if (!product || !product.id) {
        logger.error("No product ID available for adding to cart");
        return;
      }

      // --- FLOW DETECTION AND LOCALSTORAGE LOGIC ---
      const url = product.meta_data.find(
        (m) => m.key === "add_to_cart_url"
      )?.value;
      if (url && typeof window !== "undefined") {
        //const url = product.add_to_cart_url;
        logger.log("add to cart url", url);
        const flowMatch = url.match(
          /(ed-flow|hair-flow|wl-flow|smoking-flow|skincare-flow)=1/
        );
        if (flowMatch) {
          logger.log("flow match", flowMatch);
          const flowType = flowMatch[1];
          // Use selected variation ID if present, otherwise product ID
          const selectedId = selectedVariation?.variation_id || product.id;
          addRequiredConsultation(selectedId, flowType);
        }
      } else {
        logger.log("no add to cart url");
      }
      // --- END FLOW DETECTION AND LOCALSTORAGE LOGIC ---

      logger.log("Adding product to cart:", {
        productId: product.id,
        productName: product.name,
        hasVariation: !!selectedVariation,
      });

      // Prepare CLEAN cart data - ONLY required fields for the new API
      const cartData = {
        productId: product.id,
        quantity: 1,
      };

      // Add variantId if there's a selected variation
      if (selectedVariation) {
        const variantId = selectedVariation.variation_id || selectedVariation.id;

        // Only add variantId if it's DIFFERENT from productId
        if (variantId && variantId !== product.id) {
          cartData.variantId = variantId;
          logger.log(`Variable product: productId=${product.id}, variantId=${variantId}`);
        } else {
          logger.log(`Simple product (variantId same as productId): ${product.id}`);
        }
      } else {
        logger.log(`Simple product (no variation selected): ${product.id}`);
      }

      // Use the cart service instead of direct API call
      await addItemToCart(cartData);

      // Refresh the cart in the navbar
      document.getElementById("cart-refresher")?.click();

      // Track add_to_cart event for analytics
      try {
        const productForTracking = {
          id: product.id,
          sku: product.sku || "",
          name: product.name || "Product",
          price: finalPrice,
          variant_id:
            selectedVariation &&
            (selectedVariation.variation_id || selectedVariation.id),
          item_variant: selectedVariation?.attributes
            ? Object.entries(selectedVariation.attributes)
              .map(
                ([key, val]) =>
                  `${key
                    .replace(/^attribute_/, "")
                    .replace(/^pa_/, "")}: ${val}`
              )
              .join(", ")
            : "",
          attributes: selectedVariation?.attributes
            ? Object.entries(selectedVariation.attributes).map(
              ([key, val]) => ({
                name: key.replace(/^attribute_/, "").replace(/^pa_/, ""),
                options: [val],
              })
            )
            : [],
        };
        analyticsService.trackAddToCart(productForTracking, 1);
      } catch (e) {
        logger.warn("[Analytics] add_to_cart tracking skipped:", e);
      }

      // Show the cart popup on success
      setShowCartPopup(true);
    } catch (error) {
      logger.error("Error adding to cart:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Unable to add this item to your cart. Please try again.";
      
      if (error.message) {
        // Check for specific error types
        if (error.message.includes("Authentication required") || 
            error.message.includes("AUTH_OR_SESSION_REQUIRED") ||
            error.message.includes("Session ID is required")) {
          // This shouldn't happen with our fixes, but if it does, provide helpful message
          errorMessage = "Unable to add to cart. Please refresh the page and try again.";
        } else if (error.message.includes("low in stock") || error.message.includes("out of stock") || error.message.includes("0 available")) {
          // Stock-related errors - simple and clear
          errorMessage = "This product is currently out of stock. Please try another option.";
        } else if (error.message.includes("Cannot add to cart")) {
          // Generic "cannot add" errors - keep it simple
          errorMessage = "This item is currently unavailable. Please try another option.";
        } else {
          // For other errors, show a generic friendly message
          errorMessage = "Unable to add this item to your cart. Please try again.";
        }
      }
      
      toast.error(errorMessage, { autoClose: 6000 });
    } finally {
      setIsLoading(false);
    }
  };

  // Create button text with sale price if available
  const buttonText = `$${formatPrice(finalPrice)} Add to Cart`;

  // For displaying regular price strikethrough when on sale
  const regularPriceDisplay = hasSalePrice ? (
    <span className="text-gray-500 line-through text-sm ml-2">
      ${formatPrice(selectedVariation.regular_price)}
    </span>
  ) : null;

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={isLoading}
        className="w-full bg-black text-white py-[12px] px-4 text-base rounded-full hover:bg-gray-900 transition-colors duration-200 font-medium"
      >
        {isLoading ? "Adding to Cart..." : buttonText}
        {regularPriceDisplay}
      </button>

      <p className="text-gray-500 text-xs mt-2 text-center">
        *Only available if prescribed after an online consultation with a
        healthcare provider.
      </p>

      {/* Cart Popup */}
      <CartPopup
        isOpen={showCartPopup}
        onClose={() => setShowCartPopup(false)}
        productType={productType}
      />
    </div>
  );
};

export default ProductActions;
