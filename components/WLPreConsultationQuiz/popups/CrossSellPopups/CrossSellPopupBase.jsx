import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/utils/devLogger";
import { addRequiredConsultation } from "@/utils/requiredConsultation";
import { analyticsService } from "@/utils/analytics/analyticsService";
import { FaChevronLeft, FaChevronRight, FaSpinner } from "react-icons/fa6";
import { FaInfoCircle } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoIosCloseCircleOutline } from "react-icons/io";
import CrossSellCartDisplay from "../../../Quiz/CrossSellPopup/CrossSellCartDisplay";
import { useCrossSellCart } from "@/lib/hooks/useCrossSellCart";

// Weight loss product IDs that require consultation
const WEIGHT_LOSS_PRODUCT_IDS = [
  //"490537", // ORAL_SEMAGLUTIDE
  "142975", // OZEMPIC
  "160468", // MOUNJARO
  "250827", // WEGOVY
  "369618", // RYBELSUS
];

const CrossSellPopup = ({
  isOpen,
  onClose,
  mainProduct,
  addOnProducts,
  onCheckout,
  selectedProductId,
  initialCartData = null,
}) => {
  const router = useRouter();

  // Use the new cross-sell cart hook
  const {
    cartData,
    cartItems,
    cartSubtotal,
    cartLoading,
    addingAddonId,
    removingItemKey,
    error: cartError,
    addAddon,
    removeItem,
    checkout,
    isAddingAddon,
    isRemovingItem,
    isAddonInCart,
  } = useCrossSellCart("wl", mainProduct, initialCartData, onClose);

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 15,
    minutes: 38,
    seconds: 19,
  });
  const [deliveryDate, setDeliveryDate] = useState("Thursday");
  const [openDescriptions, setOpenDescriptions] = useState({});
  const [addedProducts, setAddedProducts] = useState([]);

  // Toggle description visibility
  const toggleDescription = (addonId, event) => {
    event.preventDefault();
    setOpenDescriptions({
      ...openDescriptions,
      [addonId]: !openDescriptions[addonId],
    });
  };

  // Handle adding an add-on product - now adds to cart immediately
  const handleAddProduct = async (addon) => {
    // Add to cart immediately
    const success = await addAddon(addon);
    if (success) {
      // Track locally for UI state
      setAddedProducts((prevProducts) => {
        const newProducts = [...prevProducts, addon.id];
        logger.log(`Added WL addon ${addon.id} (${addon.name}) to cart`);
        logger.log("Updated WL added products:", newProducts);
        return newProducts;
      });
      // Only add required consultation for specified products
      if (WEIGHT_LOSS_PRODUCT_IDS.includes(String(addon.id))) {
        addRequiredConsultation(addon.id, "wl-flow");
      }
    } else {
      logger.log(`Failed to add WL addon ${addon.id} (${addon.name}) to cart`);
    }
  };

  // Handle removing an addon from cart
  const handleRemoveAddon = (addonId) => {
    setAddedProducts((prevProducts) => {
      const newProducts = prevProducts.filter((id) => id !== addonId);
      logger.log(`Removed WL addon ${addonId} from selection`);
      logger.log("Updated WL added products:", newProducts);
      return newProducts;
    });
  };

  // Handle slider arrows for mobile scrolling
  const handleSliderArrow = (direction) => {
    const slider = document.querySelector(".addons-slider");
    if (slider) {
      const scrollAmount = direction === "left" ? -250 : 250;
      slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // ALL useEffect hooks must be called before any conditional returns
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";

      // Set up timer for countdown
      const timerInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newSeconds = prev.seconds - 1;

          if (newSeconds < 0) {
            const newMinutes = prev.minutes - 1;

            if (newMinutes < 0) {
              const newHours = prev.hours - 1;

              if (newHours < 0) {
                // Timer expired, reset to some default value or handle as needed
                return { hours: 0, minutes: 0, seconds: 0 };
              }

              return { hours: newHours, minutes: 59, seconds: 59 };
            }

            return { ...prev, minutes: newMinutes, seconds: 59 };
          }

          return { ...prev, seconds: newSeconds };
        });
      }, 1000);

      return () => {
        clearInterval(timerInterval);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Conditional returns AFTER all hooks
  if (!isOpen) return null;

  // Loading overlay
  if (isCheckoutLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
        <div className="bg-white p-8 rounded-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg font-medium">Adding to Cart...</p>
          <p className="text-sm text-gray-600">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="new-cross-sell-popup fixed w-screen m-auto bg-[#FFFFFF] z-[9999] top-[0] left-[0] flex flex-col headers-font tracking-tight h-[100vh] overflow-auto">
      <div className="new-cross-sell-popup-cart-section w-[100%] max-w-7xl p-5 md:px-10 pb-6 md:pb-12 py-12 min-h-fit mx-auto">
        <div className="popup-cart-product-row-wrapper">
          {/* Congratulations Banner */}
          <div className="congratulations relative bg-[#f5f5f0] rounded-xl text-sm px-2 p-2 md:px-4 md:p-4 border border-solid border-[#E2E2E1] mb-6">
            <p className="text-left">
              Congrats! You get <span className="font-bold">FREE 2-day</span>{" "}
              express shipping.
              <FaInfoCircle
                className="ml-1 inline-block cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />
            </p>
            {showTooltip && (
              <div className="absolute bg-white text-[#444] py-[10px] px-[20px] rounded-md border border-solid border-[#757575] top-12 left-4">
                2 day shipping applies from the date the prescription is issued.
              </div>
            )}
          </div>

          {/* Cart Display Component */}
          <CrossSellCartDisplay
            cartItems={cartItems}
            subtotal={cartSubtotal}
            onRemoveItem={removeItem}
            isLoading={cartLoading}
            removingItemKey={removingItemKey}
            isRemovingItem={isRemovingItem}
            flowType="wl"
            requiredItemIds={["148515"]}
          />
        </div>

        <div className="flex justify-end pt-2 popup_cart_url_outer static checkout-btn-new w-auto bg-transparent p-0 max-w-7xl mx-auto px-5 md:px-10">
          <button
            className="popup-cart-checkout-url add_to_cart_btn block bg-black border-0 rounded-full text-white p-2 px-10 mt-2 md:mt-4 w-full text-center md:w-fit"
            onClick={async (e) => {
              e.preventDefault();

              try {
                setIsCheckoutLoading(true);

                // Create a consistent format for the main product
                const mainProductForCheckout = {
                  id: selectedProductId,
                  name: mainProduct.name,
                  price: mainProduct.price,
                  quantity: 1,
                  isSubscription: mainProduct.isSubscription || false,
                };

                // Add required consultation for main product if needed
                if (
                  WEIGHT_LOSS_PRODUCT_IDS.includes(String(selectedProductId))
                ) {
                  addRequiredConsultation(selectedProductId, "wl-flow");
                }

                // Get all selected addon products
                const selectedAddons = addedProducts
                  .map((addonId) => {
                    const addon = addOnProducts.find((p) => p.id === addonId);
                    if (addon) {
                      return {
                        id: addon.dataAddToCart || addon.id,
                        name: addon.name,
                        price: addon.price,
                        quantity: 1,
                        isSubscription: addon.dataType === "subscription",
                      };
                    }
                    return null;
                  })
                  .filter(Boolean);

                logger.log("WL main product:", mainProductForCheckout);
                logger.log("WL addons:", selectedAddons);

                // Use the new direct cart handler
                // Cart already has all products, just get checkout URL
                const checkoutUrl = checkout();
                const result = {
                  success: !!checkoutUrl,
                  redirectUrl: checkoutUrl,
                };

                if (result.success) {
                  // Track analytics with cart items
                  try {
                    const itemsForAnalytics = cartItems.map((item) => ({
                      product: {
                        id: item.id,
                        name: item.name,
                        price: parseFloat(item.price) || 0,
                      },
                      quantity: item.quantity || 1,
                    }));
                    analyticsService.trackBeginCheckout(itemsForAnalytics);
                  } catch (e) {
                    logger.warn(
                      "[Analytics] begin_checkout (WL cross-sell) skipped:",
                      e
                    );
                  }

                  // Close popup and navigate on success
                  onClose();
                  setIsCheckoutLoading(false);
                  window.location.href = result.redirectUrl;

                  if (typeof onCheckout === "function") {
                    onCheckout();
                  }
                } else {
                  logger.error("WL checkout failed:", result.error);
                  setIsCheckoutLoading(false);
                  alert(
                    "There was an issue processing your checkout. Please try again."
                  );
                }
              } catch (error) {
                logger.error("Error in WL checkout process:", error);
                setIsCheckoutLoading(false);
                alert(
                  "There was an issue processing your checkout. Please try again."
                );
              }
            }}
            disabled={isCheckoutLoading}
          >
            {isCheckoutLoading ? "Adding to Cart..." : "Checkout"}
          </button>
        </div>

        <div
          id="delivery-hint"
          className="text-center md:text-end mt-[12px] md:mt-[24px] text-[14px] font-[400]"
        >
          Order within{" "}
          <span className="text-[#814B00]">
            {timeRemaining.hours}h{" "}
            {String(timeRemaining.minutes).padStart(2, "0")}m{" "}
            {String(timeRemaining.seconds).padStart(2, "0")}s
          </span>{" "}
          for delivery on {deliveryDate}
        </div>
      </div>

      <div className="bg-[#f9f9f9]">
        <div className="new-cross-sell-popup-addons-section p-[2%] pt-5 max-w-7xl mx-auto">
          <h3 className="text-center text-gray-800 text-[22px] headers-font mt-4">
            Our recommended Add-ons
          </h3>
          <p className="text-center text-sm font-normal text-black px-12">
            Get exclusive savings on our most popular products
          </p>

          <div className="slider-arrows relative hidden md:block">
            <span
              className="slider-arrow left-arrow shadow-md"
              onClick={() => handleSliderArrow("left")}
            >
              <FaChevronLeft size="1em" />
            </span>

            <span
              className="slider-arrow right-arrow shadow-md"
              onClick={() => handleSliderArrow("right")}
            >
              <FaChevronRight size="1em" />
            </span>
          </div>

          <div className="grid grid-cols-2 md:flex w-[100%] mt-10 overflow-x-auto addons-slider gap-4 pb-1">
            {addOnProducts &&
              addOnProducts.map((addon) => (
                <div
                  key={addon.id}
                  className="basis-1/2 md:basis-1/4 md:min-w-[220px]"
                >
                  <div className="relative shadow rounded-[12px] overflow-hidden bg-[#FFFFFF] border-solid min-h-[220px] flex flex-col">
                    <div className={`addon${addon.id}-box-top relative`}>
                      <a
                        data-addon-class={`addon${addon.id}-box-body-alt-text`}
                        href="#"
                        className="addon-toggle absolute top-[10px] right-[10px] cursor-pointer border border-gray-400 text-xs text-gray-500 border-solid rounded-[25px] w-[15px] h-[15px] text-center leading-[14px] z-[9999]"
                        onClick={(e) => toggleDescription(addon.id, e)}
                      >
                        !
                      </a>
                    </div>

                    {!openDescriptions[addon.id] ? (
                      <div
                        className={`addon${addon.id}-box-body relative my-[20px] mx-4 flex flex-col flex-grow`}
                      >
                        <div className="text-center">
                          <img
                            loading="lazy"
                            className="w-[135px] h-[135px] mx-auto mb-4 block rounded object-cover"
                            src={addon.imageUrl}
                            alt={addon.name}
                          />
                        </div>
                        <div className="text-center mb-2 border-b border-gray-200 border-solid border-1 flex-grow">
                          <h4 className="text-center font-semibold text-[14px] leading-[19px] min-h-[38px] flex items-center justify-center">
                            {addon.name}
                          </h4>
                          <small className="text-center text-[#212121] font-[400] text-[12px] mb-2 inline-block">
                            {addon.quantity || "1-time purchase"}
                          </small>
                        </div>
                        <p className="font-[500] text-[14px] text-black text-center">
                          ${addon.price}
                        </p>
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddProduct(addon);
                            }}
                            className={`data-addon-id-${addon.id
                              } add-to-cart-addon-product cursor-pointer border ${isAddonInCart(addon.id) || isAddingAddon(addon.id)
                                ? "border-[#814B00] text-[#814B00]"
                                : "border-[#D8D8D8] text-black"
                              } border-solid rounded-full w-full text-center font-[500] text-[14px] flex items-center justify-center gap-2 py-2 mt-2`}
                            data-addon-id={addon.id}
                            data-title={addon.name}
                            data-price={addon.price}
                            data-addtocart={addon.dataAddToCart || addon.id}
                            data-quantity={addon.quantity}
                            data-frequency={addon.frequency}
                            data-image={addon.imageUrl}
                            style={{ position: "relative", zIndex: 20 }}
                            disabled={
                              isAddonInCart(addon.id) || isAddingAddon(addon.id)
                            }
                          >
                            {isAddingAddon(addon.id) && (
                              <FaSpinner className="animate-spin" />
                            )}
                            {isAddingAddon(addon.id)
                              ? "Adding..."
                              : isAddonInCart(addon.id)
                                ? "Added ✓"
                                : "Add To Cart"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`addon${addon.id}-box-body-alt-text absolute bg-[#FFFFFF] px-3 py-2 top-[0] z-[999] h-[100%] w-[100%]`}
                      >
                        <p className="text-gray-600 text-[11px] md:text-[13px] border-b border-gray-200 border-solid border-1 my-2 mt-4">
                          {addon.description}
                        </p>
                        <p className="font-semibold text-sm text-gray-800">
                          ${addon.price}
                        </p>
                        <p className="font-normal text-[12px] text-gray-500">
                          {addon.frequency || "1-time purchase"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="my-2 border-b border-gray-300 border-solid border-1">
            &nbsp;
          </div>
          <p className="text-center text-[12px] font-normal text-gray-600">
            Subscription plan auto renews
          </p>
          <p className="text-center text-[12px] font-normal text-gray-600">
            Subscription can be cancelled anytime
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="cross-sell-close-popup new-popup-dialog-close-button dialog-lightbox-close-button absolute top-3 md:top-5 right-3 md:right-10 z-[99999] cursor-pointer"
      >
        <IoIosCloseCircleOutline className="text-2xl md:text-4xl" />
      </button>

      <style jsx>{`
        .addons-slider {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .addons-slider::-webkit-scrollbar {
          display: none;
        }

        .right-arrow {
          right: calc(25% - 300px);
        }

        .left-arrow {
          left: calc(25% - 300px);
        }

        .slider-arrow {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: white;
          color: black;
          font-weight: bolder;
          top: 180px;
          position: absolute;
          cursor: pointer;
          z-index: 100000;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default CrossSellPopup;
