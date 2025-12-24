"use client";

import { useState, useEffect } from "react";
import { logger } from "@/utils/devLogger";
import { FaInfoCircle, FaSpinner } from "react-icons/fa";
import { IoIosCloseCircleOutline } from "react-icons/io";
import CrossSellCartDisplay from "../../shared/CrossSellCartDisplay";
import { useCrossSellCart } from "@/lib/hooks/useCrossSellCart";
import { getCart } from "@/lib/cart/cartService";

/**
 * General Cross-Sell Modal for Quiz Builder
 * Works with any flow type (ED, Hair, WL, MH, Skincare)
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {object} selectedProduct - Main product with variant info
 * @param {array} addonProducts - Array of addon products from result.productsData
 * @param {string} flowType - Flow type (ed, hair, wl, mh, skincare)
 * @param {function} onCheckout - Checkout handler
 * @param {boolean} isLoading - Loading state
 * @param {object} initialCartData - Initial cart data after main product addition
 */
const CrossSellModal = ({
  isOpen,
  onClose,
  selectedProduct,
  addonProducts = [],
  flowType = "ed",
  onCheckout,
  isLoading,
  initialCartData = null,
}) => {
  // Validate product data
  if (
    isOpen &&
    (!selectedProduct || !selectedProduct.productId || selectedProduct.price === 0)
  ) {
    logger.error("Invalid product data provided to CrossSellModal:", selectedProduct);
    if (typeof onClose === "function") {
      setTimeout(() => onClose(), 0);
    }
    return null;
  }

  // State for fresh cart data
  const [freshCartItems, setFreshCartItems] = useState([]);
  const [freshCartSubtotal, setFreshCartSubtotal] = useState(0);

  // Use the cross-sell cart hook
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
  } = useCrossSellCart(flowType, selectedProduct, initialCartData, onClose);

  // Fetch fresh cart data when modal opens (similar to CartPageContent)
  useEffect(() => {
    const fetchFreshCartData = async () => {
      if (!isOpen) return;

      try {
        logger.log("🔄 CrossSellModal - Fetching fresh cart data...");
        const data = await getCart();
        logger.log("🛒 CrossSellModal - Cart data received:", data);

        // Ensure data has the expected structure before using
        if (data && typeof data === "object") {
          // If items is missing or not an array, initialize it as an empty array
          if (!data.items || !Array.isArray(data.items)) {
            logger.warn("Cart data missing items array, initializing empty cart");
            data.items = [];
          }
          
          // Format items for display
          const formattedItems = data.items.map((item) => {
            const productName = item.product?.name || item.variant?.name || item.name || "Product";
            const unitPrice = item.unitPrice || item.price || 0;
            const quantity = item.quantity || 1;
            const totalPrice = item.totalPrice || (unitPrice * quantity) || 0;
            const imageUrl = item.product?.images?.[0]?.url || item.variant?.imageUrl || item.images?.[0]?.src || item.image || "";
            
            // Display unit price, not total price
            // Use total price for subtotal calculation
            const priceInDollars = unitPrice;
            const totalInDollars = totalPrice;
            
            return {
              key: item.id || item.key,
              id: item.id || item.productId,
              name: productName,
              price: priceInDollars,  // Unit price for display
              quantity: quantity,
              total: totalInDollars,   // Total price for subtotal calculation
              image: imageUrl,
              variation: item.variation || null,
              variant: item.variant || null, // Pass variant object for subscription info
              product: item.product || null, // Pass product object for type checking
            };
          });

          // Calculate subtotal
          const subtotal = formattedItems.reduce((sum, item) => sum + item.total, 0);
          
          setFreshCartItems(formattedItems);
          setFreshCartSubtotal(subtotal);
          
          logger.log("✅ CrossSellModal - Cart items formatted:", {
            itemCount: formattedItems.length,
            items: formattedItems.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.total,
              image: item.image ? "Present" : "Missing"
            })),
            subtotal
          });
        } else {
          logger.error("Invalid cart data structure:", data);
        }
      } catch (error) {
        logger.error("❌ Error fetching cart data in CrossSellModal:", error);
      }
    };

    fetchFreshCartData();
  }, [isOpen]);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      logger.log("📊 CrossSellModal - Cart Data:", {
        cartItems,
        cartSubtotal,
        cartLoading,
        selectedProduct,
        flowType,
      });
    }
  }, [isOpen, cartItems, cartSubtotal, cartLoading, selectedProduct, flowType]);

  const [showTooltip, setShowTooltip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [deliveryDate, setDeliveryDate] = useState("Thursday");
  const [openDescriptions, setOpenDescriptions] = useState({});

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen) return;

    const initializeDeliveryTime = () => {
      const storageTime =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("testTime"))
          : null;
      let deliveryTime = storageTime;
      const compareTime = new Date().getTime() + 4 * 60 * 60 * 1000;

      if (storageTime) {
        if (deliveryTime < compareTime) {
          const newDeliveryTime = new Date().getTime() + 16 * 60 * 60 * 1000;
          if (typeof window !== "undefined") {
            localStorage.setItem("testTime", JSON.stringify(newDeliveryTime));
          }
          deliveryTime = newDeliveryTime;
        }
      } else {
        const newDeliveryTime = new Date().getTime() + 16 * 60 * 60 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("testTime", JSON.stringify(newDeliveryTime));
        }
        deliveryTime = newDeliveryTime;
      }

      return deliveryTime;
    };

    const calculateDeliveryDay = () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 2);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[deliveryDate.getDay()];
    };

    const deliveryTime = initializeDeliveryTime();
    setDeliveryDate(calculateDeliveryDay());

    const updateRemainingTime = () => {
      const currentTime = new Date().getTime();
      const timeDifference = deliveryTime - currentTime;

      if (timeDifference <= 0) {
        const newDeliveryTime = new Date().getTime() + 16 * 60 * 60 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("testTime", JSON.stringify(newDeliveryTime));
        }
        const newTimeDifference = newDeliveryTime - currentTime;
        const hours = Math.floor(newTimeDifference / (1000 * 60 * 60));
        const minutes = Math.floor((newTimeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((newTimeDifference % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      } else {
        const hours = Math.floor(timeDifference / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      }
    };

    updateRemainingTime();
    const intervalId = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(intervalId);
  }, [isOpen]);

  // Transform addon products from API format to component format
  const transformedAddons = addonProducts.map((product) => ({
    id: product.id,
    title: product.name,
    price: product.basePrice,
    quantity: product.shortDescription || "",
    frequency: "Monthly supply",
    image: product.images?.[0]?.url || "",
    description: product.description || "",
    dataType: product.type === "SIMPLE" ? "simple" : "subscription",
    dataVar: "1_month",
    dataAddToCart: product.id,
  }));

  const toggleDescription = (addonId) => {
    setOpenDescriptions({
      ...openDescriptions,
      [addonId]: !openDescriptions[addonId],
    });
  };

  const handleAddAddon = async (addon) => {
    logger.log(`🛒 Adding addon to ${flowType} cart:`, addon);
    const success = await addAddon(addon);
    if (success) {
      logger.log(`✅ Addon added successfully`);
    }
  };

  const handleCheckout = async () => {
    try {
      logger.log(`🎯 ${flowType.toUpperCase()} CrossSell - Proceeding to checkout`);
      
      // Check if cart has items
      const hasItems = (freshCartItems.length > 0 ? freshCartItems : cartItems).length > 0;
      
      if (hasItems) {
        // Redirect to checkout page
        window.location.href = "/checkout";
      } else {
        alert("Your cart is empty. Please add products to continue.");
      }
    } catch (error) {
      logger.error(`Error during ${flowType} checkout:`, error);
      alert("There was an issue processing your checkout. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="new-cross-sell-popup fixed w-screen m-auto bg-[#FFFFFF] z-[9999] top-[0] left-[0] flex flex-col headers-font tracking-tight h-[100vh] overflow-auto">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg p-8 text-center shadow-xl">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-800 font-semibold text-lg mb-2">Adding to Cart</p>
            <p className="text-gray-600">This may take a few seconds...</p>
          </div>
        </div>
      )}

      <div className="new-cross-sell-popup-cart-section w-[100%] max-w-7xl p-5 md:px-10 pb-6 md:pb-12 py-12 min-h-fit mx-auto">
        <div className="popup-cart-product-row-wrapper">
          {/* Congratulations Banner */}
          <div className="congratulations relative bg-[#f5f5f0] rounded-xl text-sm px-2 p-2 md:px-4 md:p-4 border border-solid border-[#E2E2E1] mb-6">
            <p className="text-left">
              Congrats! You get <span className="font-bold">FREE 2-day</span> express shipping.
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
            cartItems={freshCartItems.length > 0 ? freshCartItems : cartItems}
            subtotal={freshCartItems.length > 0 ? freshCartSubtotal : cartSubtotal}
            onRemoveItem={removeItem}
            isLoading={cartLoading}
            removingItemKey={removingItemKey}
            isRemovingItem={isRemovingItem}
            flowType={flowType}
          />
          
          {/* Subtotal */}
          <div className="flex justify-between items-center py-4 px-5 md:px-10 border-t-2 border-gray-300 mt-4">
            <p className="text-[18px] font-semibold text-black">Subtotal:</p>
            <p className="text-[20px] font-bold text-black">${parseFloat(freshCartItems.length > 0 ? freshCartSubtotal : cartSubtotal || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex justify-end pt-2 static checkout-btn-new w-auto bg-transparent p-0 max-w-7xl mx-auto px-5 md:px-10">
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className={`block border-0 rounded-full text-white p-2 px-10 mt-2 md:mt-4 w-full text-center md:w-fit flex items-center justify-center gap-2 ${
              isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"
            }`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isLoading ? "Adding to Cart..." : "Checkout"}
          </button>
        </div>

        <div className="text-center md:text-end mt-[12px] md:mt-[24px] text-[14px] font-[400]">
          Order within{" "}
          <span className="text-[#814B00]">
            {timeRemaining.hours}h {String(timeRemaining.minutes).padStart(2, "0")}m{" "}
            {String(timeRemaining.seconds).padStart(2, "0")}s{" "}
          </span>
          for delivery on {deliveryDate}
        </div>
      </div>

      {/* Addons Section */}
      {transformedAddons.length > 0 && (
        <div className="bg-[#f9f9f9]">
          <div className="new-cross-sell-popup-addons-section p-[2%] pt-5 max-w-7xl mx-auto">
            <h3 className="text-center text-[#000000] text-[22px] md:text-[24px] leading-[115%] headers-font mt-4">
              Our recommended Add-ons
            </h3>
            <p className="text-center text-[14px] md:text-[16px] font-[400] text-black leading-[140%] max-w-[257px] md:max-w-full mx-auto mt-2">
              Get exclusive savings on our most popular products
            </p>

            <div className="flex flex-wrap justify-center gap-6 w-[100%] mt-10 pb-1">
              {transformedAddons.map((addon) => (
                <div key={addon.id} className="w-full max-w-[300px] md:max-w-[350px]">
                  <div className="relative shadow-lg rounded-[12px] overflow-hidden bg-[#FFFFFF] border-solid min-h-[280px] flex flex-col">
                    <div className={`addon${addon.id}-box-top relative`}>
                      <a
                        href="#"
                        className="addon-toggle absolute top-[10px] right-[10px] cursor-pointer border border-gray-400 text-xs text-gray-500 border-solid rounded-[25px] w-[15px] h-[15px] text-center leading-[14px] z-[9999]"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleDescription(addon.id);
                        }}
                      >
                        !
                      </a>
                    </div>

                    {!openDescriptions[addon.id] ? (
                      <div className={`addon${addon.id}-box-body relative my-[20px] mx-4 flex flex-col flex-grow`}>
                        <div className="text-center">
                          <img
                            loading="lazy"
                            className="w-[160px] h-[160px] mx-auto mb-4 block rounded object-cover"
                            src={addon.image}
                            alt={addon.title}
                          />
                        </div>
                        <div className="text-center mb-2 border-b border-gray-200 border-solid border-1 flex-grow">
                          <h4 className="text-center font-semibold text-[16px] leading-[22px] min-h-[44px] flex items-center justify-center">
                            {addon.title}
                          </h4>
                          <small className="text-center text-[#212121] font-[400] text-[14px] mb-2 inline-block">
                            {addon.quantity}
                          </small>
                        </div>
                        <p className="font-[500] text-[16px] text-black text-center">${addon.price}</p>
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => handleAddAddon(addon)}
                            className={`data-addon-id-${addon.id} add-to-cart-addon-product cursor-pointer border ${
                              isAddonInCart(addon.id) || isAddingAddon(addon.id)
                                ? "border-[#814B00] text-[#814B00]"
                                : "border-[#D8D8D8] text-black"
                            } border-solid rounded-full w-full text-center font-[500] text-[16px] flex items-center justify-center gap-2 py-3 mt-2`}
                            disabled={isAddonInCart(addon.id) || isAddingAddon(addon.id)}
                          >
                            {isAddingAddon(addon.id) && <FaSpinner className="animate-spin" />}
                            {isAddingAddon(addon.id)
                              ? "Adding..."
                              : isAddonInCart(addon.id)
                              ? "Added ✓"
                              : "Add To Cart"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`addon${addon.id}-box-body-alt-text absolute bg-[#FFFFFF] px-3 py-2 top-[0] z-[999] h-[100%] w-[100%]`}>
                        <p className="text-gray-600 text-[11px] md:text-[13px] border-b border-gray-200 border-solid border-1 my-2 mt-4">
                          {addon.description}
                        </p>
                        <p className="font-semibold text-sm text-gray-800">${addon.price}</p>
                        <p className="font-normal text-[12px] text-gray-500">{addon.frequency}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-2 border-b border-gray-300 border-solid border-1">&nbsp;</div>
            <p className="text-center text-[12px] font-normal text-gray-600">Subscription plan auto renews</p>
            <p className="text-center text-[12px] font-normal text-gray-600">
              Subscription can be cancelled anytime
            </p>
          </div>
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={isLoading ? undefined : onClose}
        disabled={isLoading}
        className={`cross-sell-close-popup new-popup-dialog-close-button dialog-lightbox-close-button absolute top-3 md:top-5 right-3 md:right-10 z-[99999] ${
          isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <IoIosCloseCircleOutline className="text-2xl md:text-4xl" />
      </button>
    </div>
  );
};

export default CrossSellModal;
