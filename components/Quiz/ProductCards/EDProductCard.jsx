import React, { useState, useEffect } from "react";
import CustomContainImage from "../../utils/CustomContainImage";
import { logger } from "@/utils/devLogger";
import { addToCartDirectly } from "@/utils/flowCartHandler";

const EDProductCard = ({
  product,
  isRecommended = false,
  onSelect,
  isSelected = false,
  onContinue,
}) => {

  //logger.log("PProduct received in", product);
  // Check if this is a pack product
  const isPack = product.isPack;
  
  // Store both brand and generic products (or pack products)
  const brandProduct = isPack ? null : product._originalBrand;
  const genericProduct = isPack ? null : product._originalGeneric;
  
  // For packs, store all 4 products
  const viagraBrand = isPack ? product._originalViagraBrand : null;
  const viagraGeneric = isPack ? product._originalViagraGeneric : null;
  const cialisBrand = isPack ? product._originalCialisBrand : null;
  const cialisGeneric = isPack ? product._originalCialisGeneric : null;

  logger.log("EDProductCard rendering product:", product);
  logger.log("EDProductCard isPack:", isPack);
  if (isPack) {
    logger.log("EDProductCard pack products:", { viagraBrand, viagraGeneric, cialisBrand, cialisGeneric });
  } else {
    logger.log("EDProductCard brandProduct:", brandProduct);
    logger.log("EDProductCard genericProduct:", genericProduct);
  }
  
  // If product comes with a selected preference, use it, otherwise default to "generic"
  const [selectedPreference, setSelectedPreference] = useState(
    product.selectedPreference || "generic"
  );
  const [selectedFrequency, setSelectedFrequency] = useState("monthly-supply");
  const [selectedPills, setSelectedPills] = useState(null);

  // Get the active product based on preference
  const getActiveProduct = () => {
    if (isPack) {
      // For packs, use generic products as base (or first available)
      return viagraGeneric || viagraBrand || cialisGeneric || cialisBrand || product;
    }
    if (selectedPreference === "brand" && brandProduct) {
      return brandProduct;
    }
    return genericProduct || brandProduct || product;
  };

  const activeProduct = getActiveProduct();
  
  const {
    activeIngredient,
    strengths,
    preferences,
    frequencies,
    pillOptions,
  } = product;

  // Get dynamic properties from active product based on preference
  const name = activeProduct.name || product.name;
  const title = activeProduct.title || activeProduct.name || product.title || product.name;
  const tagline = activeProduct.tagline || product.tagline;
  const product_tagline = activeProduct.product_tagline || product.product_tagline;
  const image = activeProduct.images?.[0]?.url || product.image;

  // Only auto-select the recommended product on initial render
  useEffect(() => {
    if (isRecommended && onSelect && !isSelected) {
      // This will only run once when the component is initially mounted
      // to set the initial recommended product
      handleCardSelect();
    }
    // Empty dependency array means this only runs once on initial mount
  }, []);

  useEffect(() => {
    // Automatically select the first available pill option when frequency or preference changes
    const availableOptions = getAvailablePillOptions();
    if (availableOptions.length > 0) {
      // Only update if the count actually changed (avoid infinite loop from object reference changes)
      const firstOption = availableOptions[0];
      const currentCount = selectedPills?.count;
      const firstCount = firstOption?.count;
      
      if (currentCount !== firstCount) {
        setSelectedPills(firstOption);
      }
    } else {
      if (selectedPills !== null) {
        setSelectedPills(null);
      }
    }
  }, [selectedFrequency, selectedPreference, selectedPills?.count]);

  // Auto-update selection when options change
  useEffect(() => {
    // When any selection changes, update the parent component
    if (isSelected && onSelect && selectedPills) {
      const price =
        selectedPreference === "generic"
          ? selectedPills.genericPrice
          : selectedPills.brandPrice;

      const variationId =
        selectedPreference === "generic"
          ? selectedPills.genericVariationId
          : selectedPills.brandVariationId;

      if (price && variationId) {
        logger.log("🔄 Auto-updating selection:", {
          isPack,
          preference: selectedPreference,
          frequency: selectedFrequency,
          pills: selectedPills.count,
          variationId,
          price
        });

        // For pack products, pass the main product object (contains all pack data)
        // For regular products, pass the activeProduct (brand or generic)
        const productToPass = isPack ? product : activeProduct;

        onSelect(productToPass, {
          preference: selectedPreference,
          frequency: selectedFrequency,
          pills: selectedPills,
          pillCount: selectedPills.count,
          price: price,
          variationId: variationId,
        });
      }
    }
  }, [selectedPreference, selectedFrequency, selectedPills, isSelected]);

  // Get available pill options for selected frequency and preference
  const getAvailablePillOptions = () => {
    if (!pillOptions || !pillOptions[selectedFrequency]) return [];
    
    // Filter to only show options that have the selected preference available
    return pillOptions[selectedFrequency].filter((pill) => {
      if (selectedPreference === "generic") {
        return pill.genericPrice !== null && pill.genericVariationId !== null;
      } else {
        return pill.brandPrice !== null && pill.brandVariationId !== null;
      }
    });
  };

  // Check if the current preference is available for all pill counts
  const isPreferenceAvailable = (preference) => {
    if (!pillOptions || !pillOptions[selectedFrequency]) return false;
    
    const priceKey = preference === "generic" ? "genericPrice" : "brandPrice";
    const hasAnyOption = pillOptions[selectedFrequency].some(
      (pill) => pill[priceKey] !== null
    );
    
    return hasAnyOption;
  };

  // Handle card selection
  const handleCardSelect = async () => {
    if (onSelect && selectedPills) {
      logger.log("Handling card select with preference:", selectedPills);
      // Calculate the correct price based on preference
      const price =
        selectedPreference === "generic"
          ? selectedPills.genericPrice
          : selectedPills.brandPrice;

      // If price is null, fall back to the other option or show error
      if (!price) {
        console.error("Price is null for selected preference:", {
          selectedPreference,
          selectedPills,
          product: activeProduct.name
        });
        return;
      }

      // Get the correct variation ID based on preference
      const variationId =
        selectedPreference === "generic"
          ? selectedPills.genericVariationId
          : selectedPills.brandVariationId;

      // If variation ID is null, show error
      if (!variationId) {
        logger.log("Variation ID is null for selected preference:", {
          selectedPreference,
          selectedPills,
          product: activeProduct.name
        });
        return;
      }

      // Pass the active product (brand or generic) with the selected options
      // onSelect(isPack ? product : activeProduct, {
      //   preference: selectedPreference,
      //   frequency: selectedFrequency,
      //   pills: selectedPills,
      //   pillCount: selectedPills.count,
      //   price: price,
      //   variationId: variationId,
      // });

      // For pack products, pass the main product object (contains all pack data)
      // For regular products, pass the activeProduct (brand or generic)
      const productToPass = isPack ? product : activeProduct;

      logger.log("✅ Selecting product with options:", {
        isPack,
        preference: selectedPreference,
        frequency: selectedFrequency,
        pills: selectedPills,
        pillCount: selectedPills.count,
        price: price,
        variationId: variationId,
        productId: isPack ? product.productId : activeProduct.id,
        productName: isPack ? product.name : activeProduct.name,
        product: productToPass
      });

      const ProductToCart = {
        preference: selectedPreference,
        frequency: selectedFrequency == "monthly-supply" ? "1_month" : "3_month",
        pills: selectedPills,
        pillCount: selectedPills.count,
        price: price,
        variationId: variationId,
        productId: isPack ? product.productId : activeProduct.id,
        dataAddToCart: isPack ? product.name : activeProduct.name,
      };

      const result = await addToCartDirectly(ProductToCart, [], "ed");

      if(result.success){
        logger.log("Product added to cart successfully:", result);
        window.location.href = result.redirectUrl;
      } else {
        logger.log("Failed to add product to cart:", result);
      }
      
      // // If onContinue is provided (ED flow), trigger add to cart immediately
      // if (onContinue) {
      //   // Small delay to ensure state updates
      //   setTimeout(() => onContinue(), 100);
      // }
    }
  };

  // If no pill options available, show simplified version
  const hasCompleteData = 
    pillOptions && 
    Object.keys(pillOptions).length > 0 &&
    preferences && 
    preferences.length > 0 &&
    frequencies && 
    Object.keys(frequencies).length > 0;

  if (!hasCompleteData) {
    return (
      <div
        className={`border-[0.5px] bg-white border-solid ${
          isSelected ? "border-[#A55255] border-2" : "border-[#E2E2E1]"
        } shadow-[0px_1px_1px_0px_#E2E2E1] rounded-[16px] p-[16px] md:p-[24px] text-center h-full w-full min-w-[280px] md:min-w-[380px] cursor-pointer`}
        onClick={handleCardSelect}
      >
        <div className="flex justify-between items-start">
          <p className="text-[18px] font-[500] leading-[115%] mb-[4px] text-left">
            {title || name}
          </p>
          {/* Radio button indicator */}
          <div className="w-6 h-6 rounded-full border-2 border-[#B0855B] flex items-center justify-center">
            {isSelected && (
              <div className="w-4 h-4 rounded-full bg-[#B0855B]"></div>
            )}
          </div>
        </div>
        
        <p className="text-[14px] font-[400] leading-[140%] mb-[4px] text-[#212121] text-left">
          {tagline || product_tagline}
        </p>

        {image && (
          <div className="relative overflow-hidden rounded-[16px] w-[248px] h-[140px] md:h-[130px] mx-auto">
            <CustomContainImage src={image} fill alt={title || name} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`border-[0.5px] bg-white border-solid ${
          isSelected ? "border-[#A55255] border-2" : "border-[#E2E2E1]"
        } shadow-[0px_1px_1px_0px_#E2E2E1] rounded-[16px] p-[16px] md:p-[24px] text-center h-full w-full min-w-[280px] md:min-w-[380px] ${
          isRecommended
            ? "pt-[32px] md:shadow-[0px_0px_16px_0px_#00000040]"
            : ""
        } cursor-pointer`}
       
      >
        <div className="flex justify-center items-center mb-4">
          <p className="text-[18px] font-[500] leading-[115%] mb-[4px] text-left">
            {title}
            {isPack && (
              <span className="ml-2 text-[12px] bg-[#A55255] text-white px-2 py-1 rounded-md">COMBO</span>
            )}
          </p>
          {/* Radio button indicator */}
          {/* <div className="w-6 h-6 rounded-full border-2 border-[#B0855B] flex items-center justify-center">
            {isSelected && (
              <div className="w-4 h-4 rounded-full bg-[#B0855B]"></div>
            )}
          </div> */}
        </div>

        {/* Rest of the component */}
        {/* <p className="text-[14px] font-[400] leading-[140%] mb-[4px] text-[#212121] text-left">
          {tagline || product_tagline}
        </p> */}

        {image && (
          <div className="relative overflow-hidden rounded-[16px] w-[248px] h-[112px] md:h-[130px] mx-auto ">
            <CustomContainImage src={image} fill alt={title} />
          </div>
        )}

        <div className="min-h-[80px] md:min-h-[60px]">
          {activeIngredient && (
            <p className="text-sm font-semibold text-[#212121] mt-6">
              Active ingredient:{" "}
              <span className="font-base font-normal">{activeIngredient}</span>
            </p>
          )}
          {strengths && strengths.length > 0 && (
            <p className="text-sm font-semibold text-[#212121]">
              Available in:{" "}
              <span className="font-base font-normal">
                {strengths.join(" & ")}
              </span>
            </p>
          )}
        </div>

        <p className="mt-[24px] text-[14px] leading-[140%] font-[500] text-left">
          Select preference
        </p>
        <p className="text-[10px] md:text-[12px] font-[400] leading-[140%] tracking-[-0.01em] md:tracking-[0] text-left mb-[12px] md:mb-[16px]">
          Generic is as effective as Brand, but costs less.
        </p>
        <div className="flex gap-[4px] md:gap-2">
          {preferences.map((pref) => {
            const isAvailable = isPreferenceAvailable(pref);
            return (
              <p
                key={pref}
                className={`border-[1.5px] border-solid ${
                  selectedPreference === pref
                    ? "border-[#A55255]"
                    : isAvailable
                    ? "border-[#CECECE]"
                    : "border-[#E2E2E1] opacity-50"
                } text-black text-center py-[6px] leading-[140%] rounded-[8px] w-full h-[32px] text-[14px] ${
                  isAvailable ? "cursor-pointer" : "cursor-not-allowed"
                } shadow-[0px_1px_1px_0px_#E2E2E1] relative`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card selection when clicking preference
                  if (isAvailable) {
                    setSelectedPreference(pref);
                  }
                }}
                title={!isAvailable ? `${pref.charAt(0).toUpperCase() + pref.slice(1)} not available for selected options` : ""}
              >
                {pref.charAt(0).toUpperCase() + pref.slice(1)}
                {!isAvailable && (
                  <span className="text-[9px] absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center">!</span>
                )}
              </p>
            );
          })}
        </div>

        <p className="mt-[12px] md:mt-[16px] mb-[8px] text-[14px] leading-[140%] font-[500] text-left">
          Select frequency
        </p>
        <div className="flex gap-[4px] md:gap-2">
          {Object.keys(frequencies).map((freq) => (
            <p
              key={freq}
              className={`border-[1.5px] border-solid ${
                selectedFrequency === freq
                  ? "border-[#A55255]"
                  : "border-[#CECECE]"
              } text-black text-center py-[6px] leading-[140%] rounded-[8px] w-full h-[32px] text-[14px] cursor-pointer shadow-[0px_1px_1px_0px_#E2E2E1]`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card selection when clicking frequency
                setSelectedFrequency(freq);
              }}
            >
              {frequencies[freq]}
            </p>
          ))}
        </div>

        <p className="mt-[12px] md:mt-[16px] mb-[8px] text-[14px] leading-[140%] font-[500] text-left">
          {isPack ? "How many pills per medication?" : "How many pills?"}
        </p>
        <div className="flex gap-[4px] md:gap-2 flex-wrap">
          {getAvailablePillOptions().map((pill) => (
            <p
              key={pill.count}
              className={`border-[1.5px] border-solid ${
                selectedPills?.count === pill.count
                  ? "border-[#A55255]"
                  : "border-[#CECECE]"
              } text-black text-center py-[6px] leading-[140%] rounded-[8px] flex-1 h-[32px] text-[14px] cursor-pointer shadow-[0px_1px_1px_0px_#E2E2E1]`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card selection when clicking pill count
                setSelectedPills(pill);
              }}
            >
              {pill.count}
            </p>
          ))}
          {getAvailablePillOptions().length === 0 && (
            <p className="text-[12px] text-gray-500 italic">
              No {selectedPreference} options available for {frequencies[selectedFrequency]}
            </p>
          )}
        </div>

        <button
          className="bg-black transition hover:bg-gray-900 text-white font-semibold text-center py-3 rounded-full mt-[16px] md:mt-[24px] cursor-pointer w-full"
          onClick={(e) => {
            e.stopPropagation(); // Prevent double handling
            handleCardSelect();
          }}
        >
          {(() => {
            const currentPrice = selectedPreference === "generic"
              ? selectedPills?.genericPrice
              : selectedPills?.brandPrice;
            
            const priceText = currentPrice ? `$${currentPrice}/month` : "Price unavailable";
            
            if (onContinue) {
              return `Add to cart - ${priceText}`;
            } else if (isSelected) {
              return `Selected - ${priceText}`;
            } else {
              return `Select - ${priceText}`;
            }
          })()}
        </button>
      </div>
    </div>
  );
};

export default EDProductCard;
