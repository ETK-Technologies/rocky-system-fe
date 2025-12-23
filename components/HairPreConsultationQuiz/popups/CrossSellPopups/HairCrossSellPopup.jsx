import React, { useState, useEffect } from "react";
import Image from "next/image";
import { logger } from "@/utils/devLogger";
import { analyticsService } from "@/utils/analytics/analyticsService";

import {
  FaInfoCircle,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoIosCloseCircleOutline } from "react-icons/io";
import CrossSellCartDisplay from "../../../Quiz/CrossSellPopup/CrossSellCartDisplay";
import { useCrossSellCart } from "@/lib/hooks/useCrossSellCart";

const HairCrossSellPopup = ({
  isOpen,
  onClose,
  mainProduct,
  onCheckout,
  isLoading,
  initialCartData = null,
}) => {
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
  } = useCrossSellCart("hair", mainProduct, initialCartData, onClose);

  const [addedProducts, setAddedProducts] = useState([]);
  const [openDescriptions, setOpenDescriptions] = useState({});

  const [showTooltip, setShowTooltip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 15,
    minutes: 38,
    seconds: 19,
  });
  const [deliveryDate, setDeliveryDate] = useState("Thursday");

  // Define hair add-on products
  const addOnProducts = [
    // {
    //   id: "271",
    //   title: "Essential IX Shampoo",
    //   price: "23",
    //   quantity: "240ml",
    //   frequency: "One month supply",
    //   image:
    //     "https://myrocky.com/wp-content/uploads/2021/08/RockyHealth-HQ-78-scaled-500x500.jpg",
    //   description:
    //     "Organic and infused with essential oils to improve hair growth.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "463",
    // },
    {
      id: "93366",
      title: "Essential Follicle Support",
      price: "34.99",
      quantity: "60 Caps",
      frequency: "One month supply",
      image:
        "https://myrocky.com/wp-content/uploads/RockyHealth-Proofs-HQ-111-Hair-1-500x500.jpg",
      description:
        "Meticulously crafted to address male pattern baldness. Packed with nutraceuticals and botanicals, this supplement supports hair growth by targeting root causes of androgenic alopecia.",
      dataType: "simple",
      dataVar: "",
      dataAddToCart: "426522",
    },
    {
      id: "262914",
      title: "Essential T-Boost",
      price: 35,
      quantity: "60 Capsules",
      frequency: "30-days supply",
      image:
        "https://mycdn.myrocky.com/wp-content/uploads/20250908134137/t-boost.png",
      description:
        "Helps improve overall testosterone levels, enhance libido, and promote a sense of well-being.",
      dataType: "simple",
      dataVar: "",
      dataAddToCart: "262914",
    },
    {
      id: "490612",
      title: "Essential Night Boost",
      price: "30.00",
      image: "/supplements/night-boost.webp",
      bulletPoints: [
        "Made in Canada",
        "Non GMO - no fillers or chemicals",
        "Third party tested for purity",
      ],
      showInfoIcon: true,
      dataType: "simple",
      dataVar: "",
      dataAddToCart: "490612",
    },
    {
      id: "490621",
      title: "Essential Mood Balance",
      price: "36.00",
      image: "/supplements/mood.webp",
      bulletPoints: [
        "Made in Canada",
        "Non GMO - no fillers or chemicals",
        "Third party tested for purity",
      ],
      showInfoIcon: true,
      dataType: "simple",
      dataVar: "",
      dataAddToCart: "490621",
    },
    {
      id: "490636",
      title: "Essential Gut Relief",
      price: "36.00",
      image: "/supplements/gut.webp",
      bulletPoints: [
        "Made in Canada",
        "Non GMO - no fillers or chemicals",
        "Third party tested for purity",
      ],
      showInfoIcon: true,
      dataType: "simple",
      dataVar: "",
      dataAddToCart: "490636",
    },

    // {
    //   id: "1241",
    //   title: "Essential V Oil",
    //   price: "35",
    //   quantity: "60ml",
    //   frequency: "One month supply",
    //   image:
    //     "https://myrocky.com/wp-content/uploads/2021/10/RockyHealth-HQ-85-scaled-500x500.jpg",
    //   description:
    //     "Protect your hair with this conditioning hair mask made from 5 organic oils- this combination is great for thinning hair or maintaining a full scalp.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "1242",
    // },
    // {
    //   id: "2294",
    //   title: "Union Matte Clay",
    //   price: "25",
    //   quantity: "4oz",
    //   frequency: "One time purchase",
    //   image:
    //     "https://myrocky.com/wp-content/uploads/2022/02/RockyHealth-Valentines-PROOFS-HQ-117-500x500.jpg",
    //   description:
    //     "Union Matte Clay is designed to deliver a true matte, strong, and pliable hold.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "2294",
    // },
    {
      id: "353755",
      title: "Rocky Essential Cap",
      price: "25",
      quantity: "Adjustable",
      frequency: "One time purchase",
      image:
        "https://mycdn.myrocky.com/wp-content/uploads/20250918120236/rocky-hat.png",
      description:
        " Everyday headwear, refined. Designed with premium fabrics, a timeless shape, and an effortless fit.",
      dataType: "simple",
      dataVar: "",
      dataAddToCart: "353755",
    },
    // {
    //   id: "368051",
    //   title: "DHM Blend",
    //   price: 39,
    //   quantity: "(10 pack)",
    //   frequency: "One time purchase",
    //   image: "https://myrocky.b-cdn.net/WP%20Images/dhm/dhm.png",
    //   description:
    //     "A Smarter Way to Celebrate. DHM Blend is a science-backed formulation featuring Dihydromyricetin (DHM), L-Cysteine, Milk Thistle, Prickly Pear, and a Vitamin B Complex.",
    //   dataType: "simple",
    //   dataVar: "",
    //   dataAddToCart: "368051",
    // },
  ];

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

  // Function to get full addon product details from its ID
  const getAddonById = (addonId) => {
    return addOnProducts.find((addon) => addon.id === addonId);
  };

  // Toggle adding/removing an addon - now adds to cart immediately
  const toggleAddon = async (addonId) => {
    // Get the addon details
    const addon = getAddonById(addonId);
    if (!addon) return;

    // Add to cart immediately
    const success = await addAddon(addon);
    if (success) {
      // Track locally for UI state
      setAddedProducts([...addedProducts, addonId]);
      logger.log(`Added addon ${addonId} to cart`);
    }
  };

  // Toggle description visibility
  const toggleDescription = (addonId, event) => {
    event.preventDefault();

    setOpenDescriptions({
      ...openDescriptions,
      [addonId]: !openDescriptions[addonId],
    });
  };

  // Handle the checkout process - Cart already populated, just redirect
  const handleCheckout = async () => {
    try {
      logger.log("🎯 Hair CrossSell - Proceeding to checkout");

      // Track begin_checkout with cart items
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
        // non-blocking
        logger.warn("[Analytics] begin_checkout (hair cross-sell) skipped:", e);
      }

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
      logger.error("Error during checkout:", error);
      alert("There was an issue processing your checkout. Please try again.");
    }
  };

  // Handle slider arrows for mobile scrolling
  const handleSliderArrow = (direction) => {
    const slider = document.querySelector(".addons-slider");
    if (slider) {
      const scrollAmount = direction === "left" ? -250 : 250;
      slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Return null if modal is not open
  if (!isOpen) return null;

  return (
    <div className="new-cross-sell-popup fixed w-screen h-screen m-auto bg-[#FFFFFF] z-[9999] top-[0] left-[0] flex flex-col headers-font tracking-tight h-[100vh] overflow-auto">
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
            flowType="hair"
          />
        </div>

        <div className="flex justify-end pt-2 popup_cart_url_outer static checkout-btn-new w-auto bg-transparent p-0 max-w-7xl mx-auto px-5 md:px-10">
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className={`popup-cart-checkout-url add_to_cart_btn block border-0 rounded-full text-white p-2 px-10 mt-2 md:mt-4 w-full text-center md:w-fit ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {isLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding to Cart...
              </>
            ) : (
              "Checkout"
            )}
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
            {addOnProducts.map((addon) => (
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
                          src={addon.image}
                          alt={addon.title}
                        />
                      </div>
                      <div className="text-center mb-2 border-b border-gray-200 border-solid border-1 flex-grow">
                        <h4 className="text-center font-semibold text-[14px] leading-[19px] min-h-[38px] flex items-center justify-center">
                          {addon.title}
                        </h4>
                        <small className="text-center text-[#212121] font-[400] text-[12px] mb-2 inline-block">
                          {addon.quantity}
                        </small>
                      </div>
                      <p className="font-[500] text-[14px] text-black text-center">
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
                          className={`data-addon-id-${
                            addon.id
                          } add-to-cart-addon-product cursor-pointer border ${
                            isAddonInCart(addon.id) || isAddingAddon(addon.id)
                              ? "border-[#814B00] text-[#814B00]"
                              : "border-[#D8D8D8] text-black"
                          } border-solid rounded-full w-full text-center font-[500] text-[14px] flex items-center justify-center gap-2 py-2 mt-2`}
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
        onClick={onClose}
        disabled={isLoading}
        className={`cross-sell-close-popup new-popup-dialog-close-button dialog-lightbox-close-button absolute top-3 md:top-5 right-3 md:right-10 z-[99999] ${
          isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <IoIosCloseCircleOutline className="text-2xl md:text-4xl" />
      </button>

      {/* Full-screen loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
            <p className="text-lg font-medium">Adding items to cart...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HairCrossSellPopup;
