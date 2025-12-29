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
  // Extract product properties from the new structure
  const {
    id,
    name,
    image,
    tagline,
    activeIngredient,
    strengths = [],
    preferences = [],
    pillOptions = [],
  } = product;

  // State management
  const [selectedPreference, setSelectedPreference] = useState(preferences[0] || "generic");
  const [selectedFrequency, setSelectedFrequency] = useState("monthly-supply");
  const [selectedPills, setSelectedPills] = useState(null);

  // Frequency labels - can come from product or use defaults
  const frequencies = product.frequencies || {
    "monthly-supply": "Monthly",
    "quarterly-supply": "Quarterly",
  };

  // Helper function to get pill options array based on structure
  const getPillOptionsArray = () => {
    if (!pillOptions) return [];
    
    // Check if pillOptions is an object (variety pack format)
    if (typeof pillOptions === 'object' && !Array.isArray(pillOptions)) {
      return pillOptions[selectedFrequency] || [];
    }
    
    // Otherwise it's an array (regular product format)
    return pillOptions;
  };

  // Helper function to get available pill options based on current selections
  const getAvailablePillOptions = () => {
    const optionsArray = getPillOptionsArray();
    if (optionsArray.length === 0) return [];
    
    // For object structure (variety pack), options are already filtered by frequency
    if (typeof pillOptions === 'object' && !Array.isArray(pillOptions)) {
      return optionsArray.filter((option) => {
        const hasPrice = selectedPreference === "generic" 
          ? option.genericPrice != null 
          : option.brandPrice != null;
        return hasPrice;
      });
    }
    
    // For array structure (regular product), filter by frequency
    return optionsArray.filter((option) => {
      if (option.type !== selectedFrequency) return false;
      
      const hasPrice = selectedPreference === "generic" 
        ? option.genericPrice != null 
        : option.brandPrice != null;
      
      return hasPrice;
    });
  };

  // Helper function to check if a preference is available
  const isPreferenceAvailable = (preference) => {
    const optionsArray = getPillOptionsArray();
    if (optionsArray.length === 0) return false;
    
    // For object structure (variety pack), options are already filtered by frequency
    if (typeof pillOptions === 'object' && !Array.isArray(pillOptions)) {
      return optionsArray.some((option) => {
        return preference === "generic" 
          ? option.genericPrice != null 
          : option.brandPrice != null;
      });
    }
    
    // For array structure (regular product), filter by frequency
    return optionsArray.some((option) => {
      if (option.type !== selectedFrequency) return false;
      return preference === "generic" 
        ? option.genericPrice != null 
        : option.brandPrice != null;
    });
  };

  // Initialize selected pills when component mounts or when frequency/preference changes
  useEffect(() => {
    const availableOptions = getAvailablePillOptions();
    if (availableOptions.length > 0 && !selectedPills) {
      setSelectedPills(availableOptions[0]);
    }
  }, []);

  // Update selected pills when frequency or preference changes
  useEffect(() => {
    const availableOptions = getAvailablePillOptions();
    if (availableOptions.length > 0) {
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
  }, [selectedFrequency, selectedPreference]);

  // Auto-update parent component when selection changes
  useEffect(() => {
    if (isSelected && onSelect && selectedPills) {
      const price =
        selectedPreference === "generic"
          ? selectedPills.genericPrice
          : selectedPills.brandPrice;

      const variationId =
        selectedPreference === "generic"
          ? selectedPills.variationId
          : selectedPills.brandVariationId;

      if (price && variationId) {
        onSelect(product, {
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

  // Handle card selection and add to cart
  const handleCardSelect = async () => {
    if (!selectedPills) {
      logger.log("No pill option selected");
      return;
    }

    const price =
      selectedPreference === "generic"
        ? selectedPills.genericPrice
        : selectedPills.brandPrice;

    const variationId =
      selectedPreference === "generic"
        ? selectedPills.variationId
        : selectedPills.brandVariationId;

    if (!price) {
      console.error("Price is null for selected preference:", {
        selectedPreference,
        selectedPills,
        product: name
      });
      return;
    }

    if (!variationId) {
      logger.log("Variation ID is null for selected preference:", {
        selectedPreference,
        selectedPills,
        product: name
      });
      return;
    }

    logger.log("✅ Selecting product with options:", {
      preference: selectedPreference,
      frequency: selectedFrequency,
      pills: selectedPills,
      pillCount: selectedPills.count,
      price: price,
      variationId: variationId,
      productId: id,
      productName: name,
    });

    // Prepare product data in the format expected by addToCartDirectly
    const mainProduct = {
      id: id,
      name: name,
      price: price,
      quantity: 1,
      variationId: variationId,
      isSubscription: selectedFrequency === "quarterly-supply",
      subscriptionPeriod: selectedFrequency === "quarterly-supply" ? "3_month" : "1_month",
    };

    const result = await addToCartDirectly(mainProduct, [], "ed");

    if (result.success) {
      logger.log("Product added to cart successfully:", result);
      window.location.href = result.redirectUrl;
    } else {
      logger.log("Failed to add product to cart:", result);
    }
  };


  return (
    <div className="relative">
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-[#A55255] text-white px-4 py-1 rounded-full text-sm font-medium shadow-md">
            Recommended
          </div>
        </div>
      )}
      
      <div
        className={`border-[0.5px] bg-white border-solid ${
          isSelected ? "border-[#A55255] border-2" : "border-[#E2E2E1]"
        } shadow-[0px_1px_1px_0px_#E2E2E1] rounded-[16px] p-[16px] md:p-[24px] text-center h-full w-full min-w-[280px] md:min-w-[380px] ${
          isRecommended
            ? "pt-[32px] md:shadow-[0px_0px_16px_0px_#00000040]"
            : ""
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-[18px] font-[500] leading-[115%] mb-[4px] text-left">
            {name}
          </p>
        </div>

        {tagline && (
          <p className="text-[14px] font-[400] leading-[140%] mb-[12px] text-[#212121] text-left">
            {tagline}
          </p>
        )}

        {image && (
          <div className="relative overflow-hidden rounded-[16px] w-[248px] h-[112px] md:h-[130px] mx-auto mb-4">
            <CustomContainImage src={image} fill alt={name} />
          </div>
        )}

        <div className="min-h-[80px] md:min-h-[60px]">
          {activeIngredient && (
            <p className="text-sm font-semibold text-[#212121] mt-2">
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
                  e.stopPropagation();
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
                e.stopPropagation();
                setSelectedFrequency(freq);
              }}
            >
              {frequencies[freq]}
            </p>
          ))}
        </div>

        <p className="mt-[12px] md:mt-[16px] mb-[8px] text-[14px] leading-[140%] font-[500] text-left">
          How many pills?
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
                e.stopPropagation();
                setSelectedPills(pill);
              }}
            >
              {pill.count.replace(/-tabs/g, '')}
            </p>
          ))}
          {getAvailablePillOptions().length === 0 && (
            <p className="text-[12px] text-gray-500 italic">
              No {selectedPreference} options available for {frequencies[selectedFrequency]}
            </p>
          )}
        </div>

        <button
          className="bg-black transition hover:bg-gray-900 text-white font-semibold text-center py-3 rounded-full mt-[16px] md:mt-[24px] cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={(e) => {
            e.stopPropagation();
            handleCardSelect();
          }}
          disabled={!selectedPills}
        >
          {(() => {
            if (!selectedPills) {
              return "Select options";
            }
            
            const currentPrice = selectedPreference === "generic"
              ? selectedPills?.genericPrice
              : selectedPills?.brandPrice;
            
            const priceText = currentPrice ? `$${currentPrice}/month` : "Price unavailable";
            
            return `Add to cart - ${priceText}`;
          })()}
        </button>
      </div>
    </div>
  );
};

export default EDProductCard;
