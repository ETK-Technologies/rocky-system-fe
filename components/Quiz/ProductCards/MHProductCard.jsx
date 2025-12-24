import React, { useState, useEffect } from "react";

const MHProductCard = ({ product, onSelect, isSelected, isRecommended = false }) => {
  const [showMobilePopup, setShowMobilePopup] = useState(false);

  useEffect(() => {
    if (showMobilePopup) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [showMobilePopup]);

  if (!product) return null;

  // Extract data from productData if available
  const productData = product.productData || product;
  const variant = product.variant || productData.variants?.[0];
  
  // Get image from various possible sources
  const imageUrl = variant?.imageUrl || 
                   productData.images?.[0]?.url || 
                   product.image ||
                   '';
  
  // Get product name
  const productName = product.title || product.name || productData.name || '';
  
  // Get description/tagline
  const description = product.description || 
                     product.product_tagline ||
                     productData.shortDescription ||
                     '';
  
  // Get price
  const price = variant?.price || 
               productData.basePrice ||
               product.price ||
               null;
  
  // Check if product is available (default to true if not specified)
  const isAvailable = product.supplyAvailable !== false && product.available !== false;

  return (
    <>
      <div
        className={`bg-[#FFFFFF] flex flex-col gap-2 rounded-2xl p-6 
          ${
            isSelected
              ? "border-2 border-[#A7885A] drop-shadow-lg"
              : "border border-transparent drop-shadow-lg"
          } 
          cursor-pointer transition-all duration-200 ease-in-out 
          hover:shadow-xl hover:scale-[1.01] ${
            isAvailable ? "" : "opacity-75"
          }`}
        onClick={() => isAvailable && onSelect && onSelect(product)}
      >
        <div className="flex justify-between">
          {isAvailable ? (
            <p className="text-[#047000] w-fit bg-[#D0FDD0] rounded-full py-[2px] px-[10px] font-normal text-sm">
              Supply available
            </p>
          ) : (
            <p className="text-[#C53030] w-fit bg-red-400 rounded-full py-[2px] px-[10px] font-normal text-sm">
              Out of stock
            </p>
          )}
          {isSelected && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-[#A7885A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        
        <h2 className="text-xl md:text-2xl text-[#000000] font-medium">
          {productName}
        </h2>
        
        <p className="text-sm md:text-base text-[#212121]">
          {description}
        </p>
        
        {price && (
          <p className="text-lg font-semibold text-[#000000] mt-2">
            ${price}
          </p>
        )}

        {imageUrl && imageUrl.trim() && (
          <div className="w-full mt-2 relative">
            <img
              src={imageUrl}
              alt={productName || "Product"}
              className="w-full h-auto max-h-64 object-contain rounded-2xl"
              onError={(e) => {
                e.target.style.display = "none";
                const fallback = e.target.nextElementSibling;
                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
            <div className="w-full h-32 bg-gray-200 rounded-lg hidden items-center justify-center text-gray-400 text-sm">
              Product Image
            </div>
          </div>
        )}

        {product.details && (
          <p className="text-sm text-[#212121] mt-1">{product.details}</p>
        )}

        {product.features && Array.isArray(product.features) && product.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {product.features.map((feature, idx) => (
              <div 
                key={idx}
                className="inline-flex items-center max-w-max text-[12px] font-normal leading-[140%] bg-[#FBF9F7] border border-[#E2E2E1] px-2 rounded-full py-1"
              >
                {feature}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MHProductCard;
