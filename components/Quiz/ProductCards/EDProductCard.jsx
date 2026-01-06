import React, { useState, useEffect } from "react";
import CustomContainImage from "../../utils/CustomContainImage";
import { logger } from "@/utils/devLogger";
import { addToCartDirectly } from "@/utils/flowCartHandler";
import DosageSelectionPopup from "../DosageSelectionPopup/DosageSelectionPopup";

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
  const [selectedPreference, setSelectedPreference] = useState(
    product.selectedPreference || "generic"
  );
  const [selectedFrequency, setSelectedFrequency] = useState("monthly-supply");
  const [selectedPills, setSelectedPills] = useState(
    pillOptions["monthly-supply"]?.[0] || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDosage, setSelectedDosage] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Frequency labels - can come from product or use defaults
  const frequencies = product.frequencies || {
    "monthly-supply": "Monthly",
    "quarterly-supply": "Quarterly",
  };

  // Helper function to get pill options array based on structure
  const getPillOptionsArray = () => {
    if (!pillOptions) return [];

    // Check if pillOptions is an object (variety pack format)
    if (typeof pillOptions === "object" && !Array.isArray(pillOptions)) {
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
    if (typeof pillOptions === "object" && !Array.isArray(pillOptions)) {
      const filtered = optionsArray.filter((option) => {
        const hasPrice =
          selectedPreference === "generic"
            ? option.genericPrice != null
            : option.brandPrice != null;
        return hasPrice;
      });
      
      // Remove duplicates based on count
      const seen = new Set();
      return filtered.filter(option => {
        const duplicate = seen.has(option.count);
        seen.add(option.count);
        return !duplicate;
      });
    }

    // For array structure (regular product), filter by frequency
    const filtered = optionsArray.filter((option) => {
      if (option.type !== selectedFrequency) return false;

      const hasPrice =
        selectedPreference === "generic"
          ? option.genericPrice != null
          : option.brandPrice != null;

      return hasPrice;
    });
    
    // Remove duplicates based on count
    const seen = new Set();
    return filtered.filter(option => {
      const duplicate = seen.has(option.count);
      seen.add(option.count);
      return !duplicate;
    });
  };

  // Helper function to check if a preference is available
  const isPreferenceAvailable = (preference) => {
    const optionsArray = getPillOptionsArray();
    if (optionsArray.length === 0) return false;

    // For object structure (variety pack), options are already filtered by frequency
    if (typeof pillOptions === "object" && !Array.isArray(pillOptions)) {
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

  // Initialize selected pills when component mounts
  useEffect(() => {
    if (pillOptions[selectedFrequency] && pillOptions[selectedFrequency][0]) {
      setSelectedPills(pillOptions[selectedFrequency][0]);
    }
  }, []);

  // Set default dosage based on product strengths
  useEffect(() => {
    if (strengths && strengths.length > 0 && !selectedDosage) {
      setSelectedDosage(strengths[0]);
    }
  }, [strengths]);

  // Update selected pills when frequency changes
  useEffect(() => {
    if (pillOptions[selectedFrequency] && pillOptions[selectedFrequency][0]) {
      setSelectedPills(pillOptions[selectedFrequency][0]);
    }
  }, [selectedFrequency, pillOptions]);

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

  // Handle card selection and open dosage modal
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
        product: name,
      });
      return;
    }

    if (!variationId) {
      logger.log("Variation ID is null for selected preference:", {
        selectedPreference,
        selectedPills,
        product: name,
      });
      return;
    }

    logger.log("✅ Opening dosage selection modal with options:", {
      preference: selectedPreference,
      frequency: selectedFrequency,
      pills: selectedPills,
      pillCount: selectedPills.count,
      price: price,
      variationId: variationId,
      productId: id,
      productName: name,
    });

    // Open the dosage selection modal
    setIsModalOpen(true);
  };

  // Handle continue from dosage modal - add to cart
  const handleContinueFromModal = async () => {
    if (!selectedPills || !selectedDosage) {
      logger.log("No pill option or dosage selected");
      return;
    }

    setIsAddingToCart(true);

    const price =
      selectedPreference === "generic"
        ? selectedPills.genericPrice
        : selectedPills.brandPrice;

    const variationId =
      selectedPreference === "generic"
        ? selectedPills.variationId
        : selectedPills.brandVariationId;

    const Id =
      selectedPreference === "generic" ? product.genericId : product.id;

    logger.log("✅ Adding product to cart with dosage:", {
      preference: selectedPreference,
      frequency: selectedFrequency,
      pills: selectedPills,
      pillCount: selectedPills.count,
      price: price,
      variationId: variationId,
      productId: id,
      productName: name,
      selectedDosage: selectedDosage,
    });

    // Prepare product data in the format expected by addToCartDirectly
    const mainProduct = {
      id: Id,
      name: name,
      price: price,
      quantity: 1,
      variationId: variationId,
      isSubscription: selectedFrequency === "quarterly-supply",
      subscriptionPeriod:
        selectedFrequency === "quarterly-supply" ? "3_month" : "1_month",
    };

    logger.log("Adding product to cart:", mainProduct);

    const result = await addToCartDirectly(mainProduct, [], "ed");

    setIsAddingToCart(false);

    if (result.success) {
      logger.log("Product added to cart successfully:", result);
      window.location.href = result.redirectUrl;
    } else {
      logger.log("Failed to add product to cart:", result);
    }
  };

  return (
    <div className="w-full  mt-4 relative">
      {isRecommended && (
        <div className="bg-[#AE7E56] absolute top-[-20px] right-0 left-0 h-10 md:py-1 text-white  rounded-t-xl text-center z-0">
          <span className="-translate-y-1 inline-block text-[12px] leading-[140%]">
            Recommended
          </span>
        </div>
      )}

      <div className="w-full mt-[20px] rounded-lg relative z-10">
        <div className="relative">
          <div
            className={`border-[0.5px] bg-white border-solid ${
              isSelected ? "border-[#A55255] border-2" : "border-[#E2E2E1]"
            } shadow-[0px_1px_1px_0px_#E2E2E1] rounded-[16px] p-[16px] md:p-[24px] text-center h-full w-full min-w-[280px] md:min-w-[380px] ${
              isRecommended
                ? " md:shadow-[0px_0px_16px_0px_#00000040]"
                : ""
            } cursor-pointer`}
            onClick={handleCardSelect}
          >
            <div className="flex justify-between items-start">
              <p className="text-[18px] font-[500] leading-[115%] mb-[4px] text-left">
                {name}
              </p>
              {/* Radio button indicator */}
              <div className="w-6 h-6 rounded-full border-2 border-[#B0855B] flex items-center justify-center">
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-[#B0855B]"></div>
                )}
              </div>
            </div>

            {/* Rest of the component remains the same */}
            <p className="text-[14px] font-[400] leading-[140%] mb-[4px] text-[#212121] text-left">
              {tagline}
            </p>

            <div className="relative overflow-hidden rounded-[16px] w-[248px] h-[140px] md:h-[130px] mx-auto  mt-4 mb-4">
              <CustomContainImage src={image} fill alt={name} />
            </div>

            <div className="min-h-[80px] md:min-h-[60px]">
              <p className="text-sm font-semibold text-[#212121] mb-2">
                Active ingredient:{" "}
                <span className="font-base font-normal">
                  {activeIngredient}
                </span>
              </p>
              <p className="text-sm font-semibold text-[#212121]">
                Available in:{" "}
                <span className="font-base font-normal">
                  {strengths.join(" & ")}
                </span>
              </p>
            </div>

            <p className="mt-[24px] text-[14px] leading-[140%] font-[500] text-left">
              Select preference
            </p>
            <p className="text-[10px] md:text-[12px] font-[400] leading-[140%] tracking-[-0.01em] md:tracking-[0] text-left mb-[12px] md:mb-[16px]">
              Generic is as effective as Brand, but costs less.
            </p>
            <div className="flex gap-[4px] md:gap-2">
              {preferences.map((pref) => (
                <p
                  key={pref}
                  className={`border-[1.5px] border-solid ${
                    selectedPreference === pref
                      ? "border-[#A55255]"
                      : "border-[#CECECE]"
                  } text-black text-center py-[6px] leading-[140%] rounded-[8px] w-full h-[32px] text-[14px] cursor-pointer shadow-[0px_1px_1px_0px_#E2E2E1]`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card selection when clicking preference
                    setSelectedPreference(pref);
                  }}
                >
                  {pref.charAt(0).toUpperCase() + pref.slice(1)}
                </p>
              ))}
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
              How many pills?
            </p>
            <div className="flex gap-[4px] md:gap-2">
              {getAvailablePillOptions()?.map((pill, index) => (
                <p
                  key={`${pill.count}-${index}`}
                  className={`border-[1.5px] border-solid ${
                    selectedPills?.count === pill.count
                      ? "border-[#A55255]"
                      : "border-[#CECECE]"
                  } text-black text-center py-[6px] leading-[140%] rounded-[8px] w-full h-[32px] text-[14px] cursor-pointer shadow-[0px_1px_1px_0px_#E2E2E1]`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card selection when clicking pill count
                    setSelectedPills(pill);
                  }}
                >
                  {String(pill.count).replace(/-tabs/g, '')}
                </p>
              ))}
            </div>

            <button
              className="bg-black transition hover:bg-gray-900 text-white font-semibold text-center py-3 rounded-full mt-[16px] md:mt-[24px] cursor-pointer w-full"
              onClick={(e) => {
                e.stopPropagation(); // Prevent double handling
                handleCardSelect();
              }}
            >
              {isSelected
                ? `Selected - $${
                    selectedPreference === "generic"
                      ? selectedPills?.genericPrice
                      : selectedPills?.brandPrice
                  }`
                : `Select - $${
                    selectedPreference === "generic"
                      ? selectedPills?.genericPrice
                      : selectedPills?.brandPrice
                  }`}
            </button>
            <p className="text-[10px] md:text-[12px] leading-[140%] font-[400] mt-[8px]">
              *Dose request can be made during questionnaire
            </p>
          </div>
        </div>
      </div>

      <DosageSelectionPopup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        availableDosages={strengths}
        selectedDose={selectedDosage}
        setSelectedDose={setSelectedDosage}
        onContinue={handleContinueFromModal}
        isLoading={isAddingToCart}
      />
    </div>
  );
};

export default EDProductCard;
