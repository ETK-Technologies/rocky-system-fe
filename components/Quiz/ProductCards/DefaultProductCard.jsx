import React, { useState, useEffect } from "react";

const DefaultProductCard = ({ product, onSelect, isSelected }) => {
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
  
  // Get tagline/description
  const tagline = product.product_tagline ||
                  productData.shortDescription ||
                  '';
  
  const description = product.description || '';
  
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
              ? "border drop-shadow-lg"
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
        
        {tagline && (
          <p className="text-sm md:text-base text-[#212121]">
            {tagline}
          </p>
        )}
        
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

        {/* Display frequency/supply info */}
        {description && (
          <p className="text-sm text-[#555555] mt-1">
            {description}
          </p>
        )}

        {/* Display pills info if available */}
        {product.pills && (
          <p className="text-sm text-[#555555] mt-1">
            {product.pills}
          </p>
        )}

        {/* Display badge if available */}
        {product.badge && (
          <div className="mt-2">
            <span className="inline-block bg-[#A7885A] text-white text-xs font-medium px-2 py-1 rounded">
              {product.badge}
            </span>
          </div>
        )}

        {product.strengthLevel === 3 && product.isPrescription && (
          <p
            className="text-[#AE7E56] text-sm underline text-center mt-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobilePopup(true);
            }}
          >
            Learn about prescription strength benefits.
          </p>
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

      {showMobilePopup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-2xl w-full p-6 pb-10 relative sm:rounded-2xl sm:max-w-2xl sm:w-full sm:pb-6">
            <div className="flex justify-end items-center mb-2 cursor-pointer">
              <button
                className="text-xl bg-[#0000001A] rounded-full px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobilePopup(false);
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <h3 className="text-xl font-medium text-[#000000] mb-2">
              Why Prescription Strength Works Better
            </h3>
            <p className="mb-5 text-[#212121] text-sm">
              Prescription-strength products deliver superior results with clinically proven effectiveness.
            </p>
            <ol className="list-decimal pl-4 space-y-5">
              <li className="text-[#212121] text-sm">
                <span className="font-semibold text-base text-[#212121]">
                  Clinically Proven Results
                </span>
                <br />
                Prescription formulations undergo rigorous testing for proven efficacy.
              </li>
              <li className="text-[#212121] text-sm">
                <span className="font-semibold text-base text-[#212121]">
                  Higher Active Concentrations
                </span>
                <br />
                Access to therapeutic levels not available in over-the-counter products.
              </li>
              <li className="text-[#212121] text-sm">
                <span className="font-semibold text-base text-[#212121]">
                  Professional Supervision
                </span>
                <br />
                Monitored treatment plans ensure safety and optimize results.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};

export default DefaultProductCard;
