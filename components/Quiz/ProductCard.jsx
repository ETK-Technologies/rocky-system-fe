import React from "react";
import { useParams } from "next/navigation";
import {
  WLProductCard,
  EDProductCard,
  HairProductCard,
  MHProductCard,
  DefaultProductCard,
} from "./ProductCards";
import { logger } from "@/utils/devLogger";

/**
 * Smart Product Card Router
 * Automatically selects the appropriate product card design based on quiz type
 * 
 * Supported flow types:
 * - wl, wlprecons: Weight Loss (WLProductCard)
 * - ed, edprecons: Erectile Dysfunction (EDProductCard)
 * - hair, hairprecons: Hair Loss (HairProductCard)
 * - mh, mhprecons: Mental Health (MHProductCard)
 * - default: Generic product card (DefaultProductCard)
 */
const ProductCard = ({ product, onSelect, isSelected, flowType, isRecommended, ...rest }) => {
  const params = useParams();
  const slug = params?.slug || flowType;

  // Debug logging
  logger.log("🔍 ProductCard Debug:", {
    flowTypeProp: flowType,
    params: params,
    slug: slug,
    productId: product?.id,
    productName: product?.name
  });

  if (!product) return null;

  

  const detectedFlowType = flowType;

  // Debug logging for detected flow type
  logger.log("🎯 Detected Flow Type:", detectedFlowType, "from slug:", slug);

  logger.log("Rendering ProductCard with flowType:", detectedFlowType, "and product:", product);

  // Route to the appropriate product card based on flow type
  switch (flowType) {
    case "wl":
      logger.log("📦 Rendering WLProductCard");
      return (
        <WLProductCard
          product={product}
          onSelect={onSelect}
          isSelected={isSelected}
        />
      );
    
    case "ed":
      logger.log("📦 Rendering EDProductCard for product:", product);
      return (
        <EDProductCard
          product={product}
          onSelect={onSelect}
          isSelected={isSelected}
          isRecommended={isRecommended}
          {...rest}
        />
      );
    
    case "hair":
      logger.log("📦 Rendering HairProductCard");
      return (
        <HairProductCard
          product={product}
          onSelect={onSelect}
          isSelected={isSelected}
          isRecommended={isRecommended}
        />
      );
    
    case "mh":
      logger.log("📦 Rendering MHProductCard");
      return (
        <MHProductCard
          product={product}
          onSelect={onSelect}
          isSelected={isSelected}
          isRecommended={isRecommended}
        />
      );
    
    default:
      logger.log("📦 Rendering DefaultProductCard (fallback)");
      return (
        <DefaultProductCard
          product={product}
          onSelect={onSelect}
          isSelected={isSelected}
        />
      );
  }
};

export default ProductCard;
