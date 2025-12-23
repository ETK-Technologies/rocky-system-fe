"use client";

import { useState, useEffect } from "react";
import { logger } from "@/utils/devLogger";
import CustomImage from "../utils/CustomImage";
import CustomContainImage from "../utils/CustomContainImage";
import {
  FaInfoCircle,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoIosCloseCircleOutline } from "react-icons/io";
import LidocaineInfoPopup from "./LidocaineInfoPopup";
import CrossSellCartDisplay from "../Quiz/CrossSellPopup/CrossSellCartDisplay";
import { useCrossSellCart } from "@/lib/hooks/useCrossSellCart";

const CrossSellModal = ({
  isOpen,
  onClose,
  selectedProduct,
  onCheckout,
  isLoading,
  initialCartData = null,
}) => {
  // Early validation - don't even try to initialize the modal with invalid product data
  if (
    isOpen &&
    (!selectedProduct ||
      !selectedProduct.productIds ||
      selectedProduct.price === 0)
  ) {
    logger.error(
      "Invalid product data provided to CrossSellModal:",
      selectedProduct
    );
    // Close the modal if it was somehow opened with invalid data
    if (typeof onClose === "function") {
      setTimeout(() => onClose(), 0);
    }
    return null;
  }

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
  } = useCrossSellCart("ed", selectedProduct, initialCartData, onClose);

  const [addedProducts, setAddedProducts] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [deliveryDate, setDeliveryDate] = useState("Thursday");

  const [openDescriptions, setOpenDescriptions] = useState({});
  const [showLidocainePopup, setShowLidocainePopup] = useState(false);
  const [pendingLidocaineAddon, setPendingLidocaineAddon] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // Cleanup in case modal is unmounted
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Create the countdown effect using localStorage
  useEffect(() => {
    if (!isOpen) return;

    // Initialize or update the delivery time
    const initializeDeliveryTime = () => {
      // Check if there's a stored time
      const storageTime =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("testTime"))
          : null;
      let deliveryTime = storageTime;
      const compareTime = new Date().getTime() + 4 * 60 * 60 * 1000; // 4 hours from now

      // Logic for setting/updating delivery time
      if (storageTime) {
        if (deliveryTime < compareTime) {
          // If less than 4 hours left, reset to 16 hours from now
          const newDeliveryTime = new Date().getTime() + 16 * 60 * 60 * 1000;
          if (typeof window !== "undefined") {
            localStorage.setItem("testTime", JSON.stringify(newDeliveryTime));
          }
          deliveryTime = newDeliveryTime;
        }
      } else {
        // If no stored time, set to 16 hours from now
        const newDeliveryTime = new Date().getTime() + 16 * 60 * 60 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("testTime", JSON.stringify(newDeliveryTime));
        }
        deliveryTime = newDeliveryTime;
      }

      return deliveryTime;
    };

    // Calculate and set delivery day of week
    const calculateDeliveryDay = () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 2); // Delivery in 2 days

      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return days[deliveryDate.getDay()];
    };

    const deliveryTime = initializeDeliveryTime();
    setDeliveryDate(calculateDeliveryDay());

    // Update countdown every second
    const updateRemainingTime = () => {
      const currentTime = new Date().getTime();
      const timeDifference = deliveryTime - currentTime;

      if (timeDifference <= 0) {
        // Time expired, reset
        const newDeliveryTime = new Date().getTime() + 16 * 60 * 60 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("testTime", JSON.stringify(newDeliveryTime));
        }

        // Recalculate with new time
        const newTimeDifference = newDeliveryTime - currentTime;

        const hours = Math.floor(newTimeDifference / (1000 * 60 * 60));
        const minutes = Math.floor(
          (newTimeDifference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((newTimeDifference % (1000 * 60)) / 1000);

        setTimeRemaining({ hours, minutes, seconds });
      } else {
        // Calculate remaining time
        const hours = Math.floor(timeDifference / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        setTimeRemaining({ hours, minutes, seconds });
      }
    };

    // Initial update
    updateRemainingTime();

    // Set interval for countdown
    const intervalId = setInterval(updateRemainingTime, 1000);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [isOpen]);

  const addOnProducts = [
    // {
    //   id: "262914",
    //   title: "Essential T-Boost",
    //   price: 35,
    //   quantity: "60 Capsules",
    //   frequency: "30-days supply",
    //   image:
    //     "https://mycdn.myrocky.com/wp-content/uploads/20250908134137/t-boost.png",
    //   description:
    //     "Helps improve overall testosterone levels, enhance libido, and promote a sense of well-being.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "262914",
    // },
    // {
    //   id: "276",
    //   title: "Lidocaine Cream",
    //   price: 35,
    //   quantity: "(30 applications-30g)",
    //   frequency: "One time purchase",
    //   image:
    //     "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/webp-images/RockyHealth-HQ-113-scaled-300x300.webp",
    //   description:
    //     "- Last 6-8x longer in bed\n- Works in 5-10 mins\n- 20-30 uses",
    //   dataType: "subscription",
    //   dataVar: "1_month_1",
    //   dataAddToCart:
    //     "276&convert_to_sub_276=1_month_1&quantity=1&add-product-subscription=276",
    // },
    {
      id: "52162",
      title: "Lidocaine Spray",
      price: 35,
      quantity: "(30 applications-30g)",
      frequency: "One time purchase",
      image:
        "https://mycdn.myrocky.com/wp-content/uploads/20250908133843/lidocaine.png",
      description:
        "- Last 6-8x longer in bed\n- Works in 2-5 mins\n- Easy spray on\n- 20-30 uses",
      dataType: "subscription",
      dataVar: "1_month_1",
      dataAddToCart:
        "52162&convert_to_sub_52162=1_month_1&quantity=1&add-product-subscription=52162",
    },
    // {
    //   id: "13534",
    //   title: "Durex Condoms",
    //   price: 10,
    //   quantity: "(Pack of 10)",
    //   frequency: "One time purchase",
    //   image:
    //     "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/RockyHealth-August-2022-HQ-14-300x300.jpeg",
    //   description:
    //     "- Fitted shape for exceptional sensitivity and feel\n- 20% thinner than standard condoms",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "13534",
    // },
    // {
    //   id: "353755",
    //   title: "Rocky Dad Hat",
    //   price: 30,
    //   quantity: "",
    //   frequency: "One time purchase",
    //   image:
    //     "https://mycdn.myrocky.com/wp-content/uploads/20241211132726/Copy-of-RockyHealth-15-scaled.webp",
    //   description: "",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "353755",
    // },
    // {
    //   id: "490612",
    //   title: "Essential Night Boost",
    //   price: "30.00",
    //   image: "/supplements/night-boost.webp",
    //   description:
    //     "Night boost is a natural sleep support supplement made with gentle, effective ingredients like L-theanine, magnesium bisglycinate, GABA, glycine, and inositol—formulated to help your body relax and ease into a deep, restful sleep.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "490612",
    // },
    // {
    //   id: "490621",
    //   title: "Essential Mood Balance",
    //   price: "36.00",
    //   image: "/supplements/mood.webp",
    //   description:
    //     "Ashwagandha is a traditional herb used in Ayurvedic medicine, known for its adaptogenic properties that help the body manage stress. It supports emotional well-being by helping to reduce anxiety, balance mood, and promote a sense of calm—making it a natural way to cope with daily mental and emotional stressors.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "490621",
    // },
    // {
    //   id: "490636",
    //   title: "Essential Gut Relief",
    //   price: "36.00",
    //   image: "/supplements/gut.webp",
    //   description:
    //     "Bloat Relief is a potent blend of natural extracts, including sweet fennel, turmeric, and milk thistle, designed to aid digestion and alleviate symptoms like bloating, gas, and indigestion.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "490636",
    // },
    // {
    //   id: "368051",
    //   title: "DHM Blend",
    //   price: 39,
    //   quantity: "(10 pack)",
    //   frequency: "One time purchase",
    //   image: "https://myrocky.b-cdn.net/WP%20Images/dhm/dhm.png",
    //   description:
    //     "DHM Blend is a science-backed formulation featuring Dihydromyricetin (DHM), L-Cysteine, Milk Thistle, Prickly Pear, and a Vitamin B Complex.\nPortable & Convenient: Compact packaging makes it easy to carry in your pocket or purse.\nAffordable: Just a few dollars per serving.\nTrusted Worldwide: Over 300,000 customers globally have made DHM Blend their go-to choice.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "368051",
    // },

    // {
    //   id: "93366",
    //   title: "Essential Follicle Support",
    //   price: "39.00",
    //   image:
    //     "https://myrocky.com/wp-content/uploads/RockyHealth-Proofs-HQ-111-Hair-1-500x500.jpg",
    //   description:
    //     "Essential Follicle Support is designed to support healthy growth, strengthen strands, and nourish follicles from within. Formulated with essential vitamins, minerals, and plant-based extracts, it helps improve hair resilience, scalp health, and overall vitality for stronger, fuller-looking hair.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "93366",
    // },
  ];

  // Function to get full addon product details from its ID
  const getAddonById = (addonId) => {
    return addOnProducts.find((addon) => addon.id === addonId);
  };

  // Toggle addon - now adds to cart immediately
  const toggleAddon = async (addonId) => {
    // Check if this is a lidocaine addon (cream or spray)
    const isLidocaineAddon = addonId === "276" || addonId === "52162";

    if (isLidocaineAddon) {
      // Show lidocaine info popup first
      setShowLidocainePopup(true);
      // Store the addon ID to add after popup is confirmed
      setPendingLidocaineAddon(addonId);
    } else {
      // Get the addon details
      const addon = getAddonById(addonId);
      if (!addon) return;

      // Add to cart immediately
      const success = await addAddon(addon);
      if (success) {
        // Track locally for UI state
        setAddedProducts([...addedProducts, addonId]);
      }
    }
  };

  const toggleDescription = (addonId) => {
    setOpenDescriptions({
      ...openDescriptions,
      [addonId]: !openDescriptions[addonId],
    });
  };

  const handleLidocainePopupContinue = async () => {
    // Add the pending lidocaine addon to the cart
    if (pendingLidocaineAddon) {
      const addon = getAddonById(pendingLidocaineAddon);
      if (addon) {
        const success = await addAddon(addon);
        if (success) {
          setAddedProducts([...addedProducts, pendingLidocaineAddon]);
        }
      }
      setPendingLidocaineAddon(null);
    }

    // Save the questionnaire answer automatically
    savePrematureEjaculationAnswer();
  };

  const savePrematureEjaculationAnswer = () => {
    try {
      if (typeof window !== "undefined") {
        const answerData = {
          98: "Yes",
          timestamp: new Date().toISOString(),
          source: "lidocaine_addon_selection",
        };
        if (answerData["98"] && answerData.source && answerData.timestamp) {
          localStorage.setItem(
            "premature_ejaculation_answer",
            JSON.stringify(answerData)
          );
          logger.log(
            "Saved premature ejaculation answer for lidocaine addon:",
            answerData
          );
        } else {
          logger.error("Invalid lidocaine answer data structure:", answerData);
        }
      }
    } catch (error) {
      logger.error("Error saving premature ejaculation answer:", error);
      try {
        localStorage.removeItem("premature_ejaculation_answer");
      } catch (clearError) {
        logger.error("Error clearing corrupted lidocaine data:", clearError);
      }
    }
  };

  // Handle the checkout process - Cart already populated, just redirect
  const handleCheckout = async () => {
    try {
      logger.log("🎯 ED CrossSell - Proceeding to checkout");

      // Get checkout URL from hook
      const checkoutUrl = checkout();

      if (checkoutUrl) {
        // Call parent onCheckout to trigger redirect
        if (onCheckout) {
          onCheckout();
        }
      } else {
        // Cart is empty or error occurred
        alert("Your cart is empty. Please add products to continue.");
      }
    } catch (error) {
      logger.error("Error during ED checkout:", error);
      alert("There was an issue processing your checkout. Please try again.");
    }
  };

  /// Handle slider arrows for mobile scrolling
  const handleSliderArrow = (direction) => {
    const slider = document.querySelector(".addons-slider");
    if (slider) {
      const scrollAmount = direction === "left" ? -250 : 250;
      slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Return null if modal is not open, but only after all state hooks have been declared
  if (!isOpen) return null;

  return (
    <div className="new-cross-sell-popup fixed w-screen m-auto bg-[#FFFFFF] z-[9999] top-[0] left-[0] flex flex-col headers-font tracking-tight h-[100vh] overflow-auto">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg p-8 text-center shadow-xl">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-800 font-semibold text-lg mb-2">
              Adding to Cart
            </p>
            <p className="text-gray-600">This may take a few seconds...</p>
          </div>
        </div>
      )}

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
            flowType="ed"
          />
        </div>

        <div className="flex justify-end pt-2 static checkout-btn-new w-auto bg-transparent p-0 max-w-7xl mx-auto px-5 md:px-10">
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className={`block border-0 rounded-full text-white p-2 px-10 mt-2 md:mt-4 w-full text-center md:w-fit flex items-center justify-center gap-2 ${isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-gray-800"
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
            {timeRemaining.hours}h{" "}
            {String(timeRemaining.minutes).padStart(2, "0")}m{" "}
            {String(timeRemaining.seconds).padStart(2, "0")}s{" "}
          </span>
          for delivery on {deliveryDate}
        </div>
      </div>
      <style jsx>{`
        .addons-slider {
          -ms-overflow-style: none; /* For Internet Explorer and Edge */
          scrollbar-width: none; /* For Firefox */
        }

        .addons-slider::-webkit-scrollbar {
          display: none; /* For Chrome, Safari, and Opera */
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
      <div className="bg-[#f9f9f9]">
        <div className="new-cross-sell-popup-addons-section p-[2%] pt-5 max-w-7xl mx-auto">
          <h3 className="text-center text-[#000000] text-[22px] md:text-[24px] leading-[115%] headers-font mt-4">
            Our recommended Add-ons
          </h3>
          <p className="text-center text-[14px] md:text-[16px] font-[400] text-black leading-[140%] max-w-[257px] md:max-w-full mx-auto mt-2">
            Get exclusive savings on our most popular products
          </p>

          {/* Slider arrows hidden for single item display */}
          <div className="slider-arrows relative hidden">
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

          <div className="flex justify-center w-[100%] mt-10 pb-1">
            {addOnProducts.map((addon) => (
              <div
                key={addon.id}
                className="w-full max-w-[300px] md:max-w-[350px]"
              >
                <div className="relative shadow-lg rounded-[12px] overflow-hidden bg-[#FFFFFF] border-solid min-h-[280px] flex flex-col">
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
                      <p className="font-[500] text-[16px] text-black text-center">
                        ${addon.price}
                      </p>
                      {/* <button
                        onClick={() => toggleAddon(addon.id)}
                        className={`data-addon-id-${
                          addon.id
                        } add-to-cart-addon-product cursor-pointer border ${
                          addedProducts.includes(addon.id)
                            ? "border-[#814B00] text-[#814B00]"
                            : "border-[#D8D8D8] text-black"
                        } border-solid rounded-full w-full text-center font-[500] text-[14px] block py-2 mt-2`}
                        data-addon-id={addon.id}
                        data-title={addon.title}
                        data-price={addon.price}
                        data-addtocart={addon.id}
                        data-quantity={addon.quantity}
                        data-frequency={addon.frequency}
                        data-image={addon.image}
                      >
                        {addedProducts.includes(addon.id)
                          ? "Added to Cart"
                          : "Add To Cart"}
                      </button> */}
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => toggleAddon(addon.id)}
                          className={`data-addon-id-${addon.id
                            } add-to-cart-addon-product cursor-pointer border ${isAddonInCart(addon.id) || isAddingAddon(addon.id)
                              ? "border-[#814B00] text-[#814B00]"
                              : "border-[#D8D8D8] text-black"
                            } border-solid rounded-full w-full text-center font-[500] text-[16px] flex items-center justify-center gap-2 py-3 mt-2`}
                          data-addon-id={addon.id}
                          data-title={addon.title}
                          data-price={addon.price}
                          data-addtocart={addon.id}
                          data-quantity={addon.quantity}
                          data-frequency={addon.frequency}
                          data-image={addon.image}
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
                        {addon.frequency}
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
        onClick={isLoading ? undefined : onClose}
        disabled={isLoading}
        className={`cross-sell-close-popup new-popup-dialog-close-button dialog-lightbox-close-button absolute top-3 md:top-5 right-3 md:right-10 z-[99999] ${isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
      >
        <IoIosCloseCircleOutline className="text-2xl md:text-4xl" />
      </button>

      {/* Lidocaine Info Popup */}
      <LidocaineInfoPopup
        isOpen={showLidocainePopup}
        onClose={() => {
          setShowLidocainePopup(false);
          setPendingLidocaineAddon(null);
        }}
        onContinue={handleLidocainePopupContinue}
      />
    </div>
  );
};

export default CrossSellModal;
