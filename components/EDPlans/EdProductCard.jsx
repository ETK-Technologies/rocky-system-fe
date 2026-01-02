"use client";

import { useState } from "react";
import { logger } from "@/utils/devLogger";
import { useRouter } from "next/navigation";
import CustomImage from "../utils/CustomImage";
import CustomContainImage from "../utils/CustomContainImage";
import DosageSelectionModal from "./DosageSelectionModal";
import BrandGenericModal from "./BrandGenericModal";
import CrossSellModal from "./CrossSellModal";
import { getDosageSelection } from "@/utils/dosageCookieManager";
import { addToCartEarly, finalizeFlowCheckout } from "@/utils/flowCartHandler";

const EdProductCard = ({ product }) => {
  const router = useRouter();

  // State management for user selections
  const [activePreference, setActivePreference] = useState(
    product.preferences[0]
  );
  const [activeFrequency, setActiveFrequency] = useState("monthly-supply");
  const [selectedPillOption, setSelectedPillOption] = useState(
    product.pillOptions["monthly-supply"][0]
  );

  // State for modals
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [dosageModalOpen, setDosageModalOpen] = useState(false);
  const [crossSellModalOpen, setCrossSellModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [initialCartData, setInitialCartData] = useState(null);

  // Initialize selectedDose from cookie if available
  const [selectedDose, setSelectedDose] = useState(() => {
    if (product?.id) {
      const savedDose = getDosageSelection(product.id.toString());
      if (savedDose) return savedDose;
    }
    // Default dose based on product name
    return product.name === "Viagra"
      ? "50mg"
      : product.name === "Cialis + Viagra"
        ? "10/50mg"
        : "10mg";
  });

  // Calculate current price based on preferences
  const currentPrice =
    activePreference === "brand"
      ? selectedPillOption.brandPrice
      : selectedPillOption.genericPrice;

  // Handle frequency change
  const handleFrequencyChange = (frequency) => {
    setActiveFrequency(frequency);
    // Select default pill option for new frequency (first option)
    setSelectedPillOption(product.pillOptions[frequency][0]);
  };

  // Handle pill option selection
  const handlePillOptionSelect = (option) => {
    setSelectedPillOption(option);
  };

  // Handle preference change (generic vs brand)
  const handlePreferenceChange = (preference) => {
    setActivePreference(preference);
  };

  // Product ID mapping based on product type and selections
  const getProductIDs = () => {
    // Get the variationId based on preference (generic or brand)
    const variationId =
      activePreference === "brand" && selectedPillOption.brandVariationId
        ? selectedPillOption.brandVariationId
        : selectedPillOption.variationId;

    // If the product is the variety pack, it might have multiple product IDs
    if (product.name === "Cialis + Viagra") {
      // Return the full variationId string for variety pack
      return variationId;
    }

    return variationId;
  };

  // Handle direct checkout for quick buy (without cross-sell)
  const handleDirectCheckout = async () => {
    try {
      const mainProduct = {
        id: getProductIDs(),
        name: product.name,
        price: currentPrice,
        isSubscription: selectedFrequency === "monthly-supply",
        variationId: getProductIDs(),
      };

      const result = await edFlowAddToCart(mainProduct, [], {
        requireConsultation: true,
      });

      if (result.success) {
        router.push(result.redirectUrl);
      } else {
        logger.error("Direct checkout failed:", result.error);
        alert("There was an issue processing your checkout. Please try again.");
      }
    } catch (error) {
      logger.error("Error in direct checkout:", error);
      alert("There was an issue processing your checkout. Please try again.");
    }
  };

  // Handle product selection
  const handleProductSelect = () => {
    // If brand is selected, show the brand modal first
    if (activePreference === "brand" && product.name !== "Chewalis") {
      setBrandModalOpen(true);
    } else {
      // Otherwise, go straight to dosage selection
      setDosageModalOpen(true);
    }
  };

  // Handle brand modal actions
  const handleSwitchToGeneric = () => {
    setActivePreference("generic");
    setBrandModalOpen(false);
    setDosageModalOpen(true);
  };

  const handleContinueWithBrand = () => {
    setBrandModalOpen(false);
    setDosageModalOpen(true);
  };

  // Handle dosage selection - add product to cart before showing cross-sell popup
  const handleDosageContinue = async () => {
    // Set loading state to show spinner in button
    setIsCheckoutLoading(true);

    // Small delay to ensure UI updates
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      // Check if this is a variety pack product (has comma-separated variation IDs)
      const productIds = getProductIDs();
      const isVarietyPack = productIds.includes(",");
      let varietyPackId = null;

      if (isVarietyPack) {
        // Generate a unique variety pack ID for this specific pack
        varietyPackId = `variety_pack_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        logger.log(`Detected variety pack product with ID: ${varietyPackId}`);
      }

      // Create main product data
      // For variety pack: productIds is comma-separated variation IDs (handled in prepareMultipleCartItems)
      // For single products: Need parent product ID + variation ID
      // 
      // CRITICAL: The backend API expects:
      // - productId: Parent/variable product ID
      // - variantId: Specific variation ID (only if different from productId)
      //
      // The transformed product.id should be the parent product ID
      // The variation ID comes from selectedPillOption (genericVariationId or brandVariationId)
      const variationId = productIds; // The selected variation ID
      
      // Get parent product ID - this should be the variable product ID, not the variation ID
      // For transformed products, product.id is the parent product ID from primaryProduct
      const parentProductId = product.id || product.productId;

      const mainProduct = {
        // Use parent product ID from transformed product
        // extractProductId will use this as the main productId
        id: parentProductId,
        productId: parentProductId,
        name: selectedProductData.name,
        price: selectedProductData.price,
        image: selectedProductData.image || product.image,
        isSubscription: selectedProductData.frequency === "monthly-supply",
        // Variation ID from selected pill option - this is the specific variation to add
        variationId: variationId,
        variantId: variationId, // Alternative field name for API
        isVarietyPack: isVarietyPack,
        varietyPackId: varietyPackId,
        // Add variation data for display
        variation: [
          {
            attribute: "Subscription Type",
            value:
              product.frequencies[selectedProductData.frequency] ||
              "Monthly Supply",
          },
          {
            attribute: "Tabs frequency",
            value: `${selectedProductData.pills} ${selectedProductData.preference === "brand"
                ? "(Brand)"
                : "(Generic)"
              }`,
          },
        ],
      };

      logger.log("🛒 ED Flow - Product data being sent to cart:", {
        parentProductId: parentProductId,
        productId: mainProduct.productId,
        variationId: mainProduct.variationId,
        variantId: mainProduct.variantId,
        isVarietyPack: mainProduct.isVarietyPack,
        originalProduct: { 
          id: product.id, 
          productId: product.productId,
          name: product.name 
        },
        selectedPillOption: {
          variationId: selectedPillOption.variationId,
          brandVariationId: selectedPillOption.brandVariationId,
          count: selectedPillOption.count,
        },
      });

      logger.log("🛒 ED Flow - Adding product to cart early:", mainProduct);

      // Add product to cart early (before checkout redirect)
      const result = await addToCartEarly(mainProduct, "ed", {
        requireConsultation: true,
        varietyPackId: varietyPackId,
      });

      if (result.success) {
        logger.log("✅ Product added to cart, redirecting to checkout");
        
        // Close dosage modal
        setDosageModalOpen(false);

        // Small delay for UI cleanup
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Generate checkout URL and redirect directly (skip cross-sell popup)
        // finalizeFlowCheckout will handle authentication check internally
        // For authenticated users, it goes to checkout; for guests, it goes to login
        // Check auth status from cartService (same as flowCartHandler uses)
        const { isAuthenticated } = await import("@/lib/cart/cartService");
        const isUserAuthenticated = isAuthenticated();
        const checkoutUrl = finalizeFlowCheckout("ed", isUserAuthenticated);
        logger.log("🎯 ED Flow - Redirecting to checkout:", checkoutUrl);
        router.push(checkoutUrl);
      } else {
        logger.error("❌ Failed to add product to cart:", result.error);
        alert(
          result.error || "Failed to add product to cart. Please try again."
        );
      }
    } catch (error) {
      logger.error("Error adding product to cart:", error);
      alert("There was an issue adding the product to cart. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Prepare selected product data for checkout
  const selectedProductData = {
    name: product.name,
    activeIngredient: product.activeIngredient,
    preference: activePreference,
    frequency: activeFrequency,
    pills: selectedPillOption.count,
    price: currentPrice,
    image: product.image,
    dosage: selectedDose,
    productIds: getProductIDs(),
  };

  // Handle checkout - Product already in cart, just redirect
  const handleCheckout = async () => {
    try {
      logger.log(
        "🎯 ED Flow - Proceeding to checkout (cart already populated)"
      );

      // Product and any addons are already in cart
      // Just generate checkout URL and redirect
      const checkoutUrl = finalizeFlowCheckout("ed", true);

      logger.log("Redirecting to:", checkoutUrl);

      // Close modal and navigate
      setCrossSellModalOpen(false);
      router.push(checkoutUrl);
    } catch (error) {
      logger.error("Error redirecting to checkout:", error);
      alert("There was an issue redirecting to checkout. Please try again.");
    }
  };

  return (
    <>
      <div className="bg-gradient-to-b from-[#ffffff00] to-[#f3f2ed] border-[0.5px] border-solid border-[#E2E2E1] shadow-[0px_1px_1px_0px_#E2E2E1] rounded-[16px] p-[16px] md:p-[24px] text-center h-full w-full min-w-[280px] md:min-w-[384px]">
        <p className="text-[18px] font-[500] leading-[115%] mb-[4px]">
          {product.name}
        </p>
        <p className="text-[14px] font-[400] leading-[140%] mb-[4px] text-[#212121]">
          {product.tagline}
        </p>

        <div className="relative overflow-hidden rounded-[16px] w-[248px] h-[112px] md:h-[130px] mx-auto ">
          <CustomContainImage
            src={product.image}
            fill
            alt={product.name}
            priority={true}
            sizes="(max-width: 768px) 248px, 248px"
          />
        </div>

        <div className="min-h-[80px] md:min-h-[60px] max-w-[300px]">
          <p className="text-sm font-semibold mt-6 text-[#212121]">
            Active ingredient:{" "}
            <span className="font-base font-normal">
              {product.activeIngredient}
            </span>
          </p>

          <p className="text-sm font-semibold text-[#212121]">
            Available in:{" "}
            <span className="font-base font-normal text-balance">
              {product.strengths.join(" & ")}
            </span>
          </p>
        </div>
        {/* Preference Selection */}
        {product.preferences.length > 1 ? (
          <>
            <p className="mt-[24px] text-[14px] leading-[140%] font-[500] text-left">
              Select preference
            </p>
            <p className="text-[10px] md:text-[12px] font-[400] leading-[140%] tracking-[-0.01em] md:tracking-[0]  text-left mb-[12px] md:mb-[16px]">
              Generic is as effective as Brand, but costs less.
            </p>
            <div className="flex gap-2">
              {product.preferences.map((preference) => (
                <button
                  key={preference}
                  onClick={() => handlePreferenceChange(preference)}
                  className={`border-2 border-solid ${activePreference === preference
                      ? "border-[#A55255]"
                      : "border-[#CECECE]"
                    } text-black text-center py-1 rounded-[8px] w-full text-sm`}
                >
                  {preference.charAt(0).toUpperCase() + preference.slice(1)}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* For Chewalis, show generic-only preference to maintain card height consistency */
          <>
            <p className="mt-[24px] text-[14px] leading-[140%] font-[500] text-left">
              Select preference
            </p>
            <p className="text-[10px] md:text-[12px] font-[400] leading-[140%] tracking-[-0.01em] md:tracking-[0]  text-left mb-[12px] md:mb-[16px]">
              Generic is as effective as Brand, but costs less.
            </p>
            <div className="flex gap-2">
              <button className="border-2 border-solid border-[#A55255] text-black text-center py-1 rounded-[8px] w-full text-sm">
                Generic
              </button>
            </div>
          </>
        )}

        {/* Frequency Selection */}
        <p className="mt-4 font-semibold text-left">Select frequency</p>
        <div className="flex gap-2">
          {Object.entries(product.frequencies).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleFrequencyChange(key)}
              className={`border-2 border-solid ${activeFrequency === key
                  ? "border-[#A55255]"
                  : "border-[#CECECE]"
                } text-black text-center py-1 rounded-[8px] w-full text-sm`}
            >
              {value}
            </button>
          ))}
        </div>

        {/* Pills Selection */}
        <p className="mt-[12px] md:mt-[16px] mb-[8px] text-[14px] leading-[140%] font-[500] text-left">
          How many pills?
        </p>
        {/* we have add class names to use in convert_test please do not remove it */}
        <div className="flex gap-2">
          {product.pillOptions[activeFrequency].map((option, index) => (
            <button
              key={index}
              onClick={() => handlePillOptionSelect(option)}
              className={`${index === 0 ? "ct-opt-1" : ""} ${index === product.pillOptions[activeFrequency].length - 1
                  ? "ct-opt-last relative"
                  : ""
                } relative border-2 border-solid ${selectedPillOption.count === option.count
                  ? "border-[#A55255]"
                  : "border-[#CECECE]"
                } text-black text-center py-1 rounded-[8px] w-full text-sm`}
            >
              {option.count}
            </button>
          ))}
        </div>

        {/* Buy Button */}
        <button
          onClick={handleProductSelect}
          className="bg-black text-white font-semibold text-center py-3 rounded-full mt-6 w-full"
        >
          ${currentPrice} - Select
        </button>

        <p className="text-[10px] md:text-[12px] leading-[140%] font-[400] mt-[8px]">
          *Dose request can be made during questionnaire
        </p>
      </div>

      {/* Modals */}
      <BrandGenericModal
        isOpen={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        onSwitchToGeneric={handleSwitchToGeneric}
        onContinueWithBrand={handleContinueWithBrand}
        genericPrice={selectedPillOption.genericPrice}
        brandPrice={selectedPillOption.brandPrice}
      />

      <DosageSelectionModal
        isOpen={dosageModalOpen}
        onClose={() => setDosageModalOpen(false)}
        product={{
          ...product,
          id: getProductIDs(),
        }}
        selectedDose={selectedDose}
        setSelectedDose={setSelectedDose}
        onContinue={handleDosageContinue}
        isLoading={isCheckoutLoading}
      />

      <CrossSellModal
        isOpen={crossSellModalOpen}
        onClose={() => setCrossSellModalOpen(false)}
        selectedProduct={selectedProductData}
        onCheckout={handleCheckout}
        isLoading={isCheckoutLoading}
        initialCartData={initialCartData}
      />

      {/* Loading overlay during transition between dosage modal and cross-sell */}
      {isCheckoutLoading && !dosageModalOpen && !crossSellModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4 max-w-sm mx-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#704e37] rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Preparing your order...
              </h3>
              <p className="text-sm text-gray-600">Just a moment</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EdProductCard;
