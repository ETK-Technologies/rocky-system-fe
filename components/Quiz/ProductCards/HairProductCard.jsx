import React from "react";
import CustomImage from "../../utils/CustomImage";
import CustomContainImage from "../../utils/CustomContainImage";

const HairProductCard = ({ product, isRecommended = false, onSelect, isSelected }) => {
  if (!product) return null;

  // Extract data from productData if available
  const productData = product.productData || product;
  const variant = product.variant || productData.variants?.[0];
  
  // Get image from various possible sources
  const imageUrl = variant?.imageUrl || 
                   productData.images?.[0]?.url || 
                   product.image ||
                   '';
  
  // Get product name/title
  const productName = product.pills || 
                     product.title || 
                     product.name || 
                     productData.name ||
                     '';
  
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
  
  // Get additional details
  const tooltip = product.tooltip || product.details || '';
  const badge = product.badge || "https://myrocky.b-cdn.net/WP%20Images/Hair%20Loss/satisfaction-guarantee.png";
  const supplyAvailable = product.supplyAvailable !== false && product.available !== false;

  const handleSelect = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  return (
    <div className="mx-auto w-full md:w-[335px] mt-4 relative z-10">
      {/* Recommended Banner */}
      {isRecommended && (
        <div className="bg-[#AE7E56] text-white text-center w-full rounded-t-2xl h-[40px] relative z-10 px-2 text-xs font-normal leading-[140%] tracking-[0%] pt-[2px] flex items-center justify-center">
          Recommended
        </div>
      )}
      
      <div
        className={`bg-white shadow-[0px_0px_16px_0px_rgba(0,0,0,0.25)] p-6 h-[409px] md:h-[415px] w-full md:w-[335px] flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.01] ${
          isRecommended ? "relative -mt-[20px] z-20" : ""
        } ${
          isSelected ? "border-2 border-[#A7885A]" : ""
        }`}
        onClick={handleSelect}
      >
        {/* Rating and Trustpilot */}
        <div className="flex gap-2 items-center mb-4 w-[220px] h-[20px]">
          <div className="text-black text-[12px] font-medium">
            <span className="font-medium">4.4 out of 5 • Excellent</span>
          </div>
          <CustomImage
            src="https://myrocky.b-cdn.net/WP%20Images/Hair%20Loss/Trustpilot_Logo.png"
            alt="trustpilot"
            width={74}
            height={18}
          />
        </div>

        {/* Product Image and Guarantee Badge */}
        <div className="relative flex justify-center items-center mb-4 w-full">
          <div className="absolute left-[15px] top-0 z-10">
            <CustomImage
              src={badge}
              alt="guarantee"
              width={72}
              height={72}
            />
          </div>

          {/* Product Image */}
          <div className="flex justify-center items-center w-[200px] h-[140px]">
            {imageUrl && (
              <CustomContainImage
                src={imageUrl}
                alt={productName}
                fill
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>

        {/* Product Information */}
        <div className="text-center">
          {/* Product Name */}
          <h3 className="font-medium md:text-[18px] text-base leading-[140%] tracking-[0%] align-middle capitalize text-[#000000] mb-[2px]">
            {productName}
          </h3>
          
          <p className="font-normal text-xs leading-[140%] tracking-[0%] text-center align-middle capitalize text-[#212121] mb-2">
            {description}
          </p>
          
          {price && (
            <p className="text-[16px] font-medium leading-[140%] text-black mb-2">
              ${price}
            </p>
          )}
          
          {/* Product Description */}
          {tooltip && (
            <p className="text-[#212121] text-[14px] font-normal leading-[140%] mb-3">
              {tooltip}
            </p>
          )}
          
          <div className="w-full">
            {supplyAvailable ? (
              <span className="align-middle w-[116px] px-[8px] text-[12px] font-normal leading-[140%] text-[#098C60] bg-[#F7F7F7] rounded-full py-[2px] text-center border border-[#E2E2E1]">
                Supply available
              </span>
            ) : (
              <span className="align-middle w-[116px] px-[8px] text-[12px] font-normal leading-[140%] text-[#C53030] bg-red-50 rounded-full py-[2px] text-center border border-red-200">
                Out of stock
              </span>
            )}
          </div>
          
          {/* Selection indicator */}
          {isSelected && (
            <div className="mt-4 flex items-center justify-center">
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
              <span className="ml-2 text-sm font-medium text-[#A7885A]">Selected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HairProductCard;
