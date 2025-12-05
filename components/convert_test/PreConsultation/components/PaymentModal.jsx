"use client";

import { useEffect, useState, useCallback } from "react";
import CustomImage from "@/components/utils/CustomImage";
import { GiCheckMark } from "react-icons/gi";

import QuestionnaireNavbar from "@/components/EdQuestionnaire/QuestionnaireNavbar";
import Link from "next/link";
import NewPayment from "../../Payment";
import { logger } from "@/utils/devLogger";
import { toast } from "react-toastify";
import {
  processUrlCartParameters,
  cleanupCartUrlParameters,
} from "@/utils/urlCartHandler";
import {
  isPaymentMethodValid,
  getPaymentValidationMessage,
} from "@/utils/cardValidation";

const PaymentModal = ({
  product = {},
  billingAndShippingDetails = null,
  onPay = () => {},
  // Payment props forwarded from page
  setFormData,
  cardNumber,
  setCardNumber,
  expiry,
  setExpiry,
  cvc,
  setCvc,
  cardType,
  setCardType,
  savedCards,
  setSavedCards,
  selectedCard,
  setSelectedCard,
  isLoadingSavedCards = false,
}) => {
  //if (!isOpen) return null;

  // Client-only billing state to avoid SSR/CSR HTML mismatches
  const [resolvedBilling, setResolvedBilling] = useState(
    billingAndShippingDetails || null
  );

  // Local state used by checkout logic
  const [shouldUseDirectPayment, setShouldUseDirectPayment] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState("");
  const [savedOrderKey, setSavedOrderKey] = useState("");
  const [cartItemsState, setCartItemsState] = useState(null);
  const [isProcessingUrlParams, setIsProcessingUrlParams] = useState(false);
  const [totalDue, setTotalDue] = useState(0);

  // Payment validation state
  const [isPaymentValid, setIsPaymentValid] = useState(false);
  const [paymentValidationMessage, setPaymentValidationMessage] = useState("");

  // useSearchParams is a Next client hook that can cause build/SSR issues
  // when imported in code paths that run during build. Use a safe,
  // client-only URLSearchParams fallback so the component can be
  // rendered during SSR without relying on next/navigation.
  const getSearchParams = () => {
    try {
      if (typeof window !== "undefined" && window.location) {
        return new URLSearchParams(window.location.search || "");
      }
    } catch (e) {
      // ignore and fall through to empty
    }
    return new URLSearchParams("");
  };

  const searchParams = getSearchParams();

  const onboardingAddToCart = searchParams.get("onboarding-add-to-cart");
  const isEdFlow = searchParams.get("ed-flow") === "1";

  const flowParams = {
    "ed-flow": searchParams.get("ed-flow"),
    "wl-flow": searchParams.get("wl-flow"),
    "hair-flow": searchParams.get("hair-flow"),
    "mh-flow": searchParams.get("mh-flow"),
    "smoking-flow": searchParams.get("smoking-flow"),
    "skincare-flow": searchParams.get("skincare-flow"),
  };

  const setCartItems = (data) => {
    setCartItemsState(data);
    // compute cart total similar to other components
    if (!data) {
      setCart(null);
      setCartTotal(null);
      return;
    }

    setCart(data);
    // detect totals in multiple shapes
    let total = null;
    if (data.totals && data.totals.total_price) {
      // cents
      total = Number(data.totals.total_price);
      if (total > 1000 && total % 100 === 0) {
        total = total / 100;
      }
    } else if (data.totals && data.totals.total) {
      const parsed = parseFloat(
        String(data.totals.total).replace(/[^0-9.]/g, "")
      );
      total = isNaN(parsed) ? null : parsed;
    }

    setCartTotal(total);
  };

  // Move cart state declarations above any functions that reference them to avoid TDZ errors
  const [cart, setCart] = useState(null);
  const [cartTotal, setCartTotal] = useState(null);

  // Minimal local helpers so this modal can load data independently
  const fetchCartItems = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      return data;
    } catch (e) {
      logger.error("fetchCartItems error:", e);
      return null;
    }
  };

  const fetchSavedCards = async () => {
    try {
      const res = await fetch("/api/payment-methods", {
        method: "GET",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.cards) {
        setSavedCards(data.cards);
      }
      return data;
    } catch (e) {
      logger.error("fetchSavedCards error:", e);
      try {
        setSavedCards([]);
      } catch {}
      return null;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      return data;
    } catch (e) {
      logger.error("fetchUserProfile error:", e);
      return null;
    }
  };

  useEffect(() => {
    if (billingAndShippingDetails) {
      setResolvedBilling(billingAndShippingDetails);
      return;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("ed_billing_and_shipping");
        if (raw) setResolvedBilling(JSON.parse(raw));
      } catch (e) {
        // ignore
      }
    }
  }, [billingAndShippingDetails]);

  // Compute totalDue when cart or cartItemsState changes (avoid setting state during render)
  useEffect(() => {
    try {
      const items = cartItemsState?.items || cart?.items || [];
      let total = 0;
      if (items && items.length > 0) {
        items.forEach((it) => {
          if (it.name == "Body Optimization Program") {
            let linePrice = null;
            try {
              if (
                it.totals &&
                (it.totals.line_total || it.totals.line_total === 0)
              ) {
                linePrice = Number(it.totals.line_total);
                if (linePrice > 1000 && linePrice % 100 === 0)
                  linePrice = linePrice / 100;
              } else if (it.prices && it.prices.price) {
                linePrice = Number(it.prices.price);
                if (linePrice > 1000 && linePrice % 100 === 0)
                  linePrice = linePrice / 100;
              } else if (it.price) {
                linePrice = Number(it.price);
                if (linePrice > 1000 && linePrice % 100 === 0)
                  linePrice = linePrice / 100;
              }
            } catch (e) {}
            if (linePrice != null) total += linePrice;
          }
        });
      }
      setTotalDue(total);
    } catch (e) {
      logger.error("compute totalDue error:", e);
    }
  }, [cartItemsState, cart]);

  // Support payload shapes: full product or onboarding payload
  const productName = product.name || product.productName || "";
  const productDose = product.dosage || product.selectedDose || "";
  const productImage =
    product.image || product.img || "/convert_test/payment.png";
  const productPrice = product.price || product.amount || 0;

  useEffect(() => {
    // Reset retry mechanism state on page load/refresh
    setShouldUseDirectPayment(false);
    setSavedOrderId("");
    setSavedOrderKey("");

    // Initialize loading
    const loadCheckoutData = async () => {
      try {
        // Start all data loading operations in parallel
        const cartPromise = fetchCartItems();

        // Process URL parameters if needed
        if (onboardingAddToCart) {
          setIsProcessingUrlParams(true);
          const urlParamsPromise = processUrlCartParameters(searchParams);

          // Wait for cart to load first as we need it for proper display
          const cartData = await cartPromise;
          setCartItems(cartData);

          // Then process the URL parameters in parallel with other data loading
          urlParamsPromise
            .then((result) => {
              if (result.status === "success") {
                // Refresh cart after adding products
                fetchCartItems().then((updatedCart) => {
                  setCartItems(updatedCart);
                  toast.success("Products added to your cart!");
                });

                // Clean up URL parameters - use the detected flow type from result
                cleanupCartUrlParameters(
                  result.flowType ||
                    (isEdFlow
                      ? "ed"
                      : flowParams["hair-flow"]
                      ? "hair"
                      : flowParams["wl-flow"]
                      ? "wl"
                      : flowParams["mh-flow"]
                      ? "mh"
                      : flowParams["skincare-flow"]
                      ? "skincare"
                      : "general")
                );
              } else if (result.status === "error") {
                toast.error(
                  result.message || "Failed to add products to cart."
                );
              }
            })
            .finally(() => {
              setIsProcessingUrlParams(false);
            });
        } else {
          // If no URL parameters to process, just set the cart items
          const cartData = await cartPromise;
          setCartItems(cartData);
        }

        // Start other data loading operations in parallel
        // These don't depend on the cart or URL processing
        Promise.all([fetchSavedCards(), fetchUserProfile()]);
      } catch (error) {
        logger.error("Error loading checkout data:", error);
        toast.error(
          "There was an issue loading your checkout data. Please refresh the page."
        );
      }
    };

    loadCheckoutData();

    logger.log("Checkout Cart ", cart);
  }, []);

  // Validate payment method whenever payment state changes
  useEffect(() => {
    const paymentState = {
      selectedCard,
      cardNumber,
      expiry,
      cvc,
    };

    const isValid = isPaymentMethodValid(paymentState);
    const message = getPaymentValidationMessage(paymentState);

    setIsPaymentValid(isValid);
    setPaymentValidationMessage(message);
  }, [selectedCard, cardNumber, expiry, cvc]);

  const firstName = resolvedBilling
    ? resolvedBilling.firstName ||
      resolvedBilling.first_name ||
      resolvedBilling.billing_address?.first_name ||
      ""
    : "";

  // Cart state and fetchin

  const formatPrice = (n) => {
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="bg-[#F9F9F9] flex flex-col tracking-tight">
      <div className="flex justify-center items-center">
        <QuestionnaireNavbar />
      </div>
      <div className="w-[100%] md:p-5 mt-5 min-h-fit mx-auto pb-4 flex flex-col items-center lg:max-w-[512px] h-full">
        <div className="w-full p-2">
          <CustomImage
            src="/convert_test/Upayment_w.png"
            className="mb-[30px] w-[336px] h-[120px]"
            width="1000"
            height="1000"
          />

          <div className="mb-[32px]">
            <p className="subheaders-font text-[24px] md:text-[32px] leading-[120%] tracking-tight mb-[20px]">
              Almost done{firstName ? `, ${firstName}` : ""}
            </p>
            <p className="text-[16px] leading-[140%] text-[#AE7E56] font-medium">
              Add your payment details. Next up, complete your medical
              questionnaire for our clinical team to review.
            </p>
          </div>

          <div className="shadow-lg rounded-2xl p-4 mb-[32px] bg-white">
            <p className="subheaders-font text-[20px] md:text-[24px] leading-[120%] tracking-tight font-[450] mb-[16px]">
              Your plan includes:
            </p>
            <div className="bg-[#F6F6F6] mb-[12px] rounded-lg min-h-[100px] px-[16px]">
              {/* product Card(s) - render cart items if available, otherwise fallback to single product prop */}
              {(cartItemsState &&
              cartItemsState.items &&
              cartItemsState.items.length > 0
                ? cartItemsState.items
                : cart && cart.items && cart.items.length > 0
                ? cart.items
                : product
                ? [product]
                : []
              ).map((item, idx) => {
                logger.log("item -> ", item);

                // Normalize name
                const name =
                  item.name ||
                  item.productName ||
                  item.title ||
                  item.short_description ||
                  "";

                // Image: prefer images[0].src, then thumbnail, then known fields, otherwise fallback
                let image = productImage;
                try {
                  if (
                    item.images &&
                    Array.isArray(item.images) &&
                    item.images.length > 0
                  ) {
                    image =
                      item.images[0].src || item.images[0].thumbnail || image;
                  } else if (item.image) {
                    image = item.image;
                  } else if (item.img) {
                    image = item.img;
                  } else if (item.product_image) {
                    image = item.product_image;
                  }
                } catch (e) {
                  image = productImage;
                }

                // Variation attributes: dose, brand, DIN
                let dose = productDose;
                let brand = null;
                let din = null;
                try {
                  if (Array.isArray(item.variation)) {
                    item.variation.forEach((v) => {
                      const key = String(v.attribute || "").toLowerCase();
                      const val = v.value || "";
                      if (key.includes("dose") || key.includes("strength"))
                        dose = val;
                      if (key.includes("brand")) brand = val;
                      if (key.includes("din")) din = val;
                    });
                  }
                } catch (e) {}

                // Active ingredient
                const activeIngredient =
                  item.activeIngredient ||
                  item.active_ingredient ||
                  item.attributes?.activeIngredient ||
                  product.activeIngredient;

                // Quantity
                const quantity =
                  item.quantity != null
                    ? Number(item.quantity)
                    : item.qty != null
                    ? Number(item.qty)
                    : 1;

                // Line / unit price extraction
                let linePrice = null;
                try {
                  if (
                    item.totals &&
                    (item.totals.line_total || item.totals.line_total === 0)
                  ) {
                    linePrice = Number(item.totals.line_total);
                    if (linePrice > 1000 && linePrice % 100 === 0)
                      linePrice = linePrice / 100;
                  } else if (item.prices && item.prices.price) {
                    linePrice = Number(item.prices.price);
                    if (linePrice > 1000 && linePrice % 100 === 0)
                      linePrice = linePrice / 100;
                  } else if (item.price) {
                    linePrice = Number(item.price);
                    if (linePrice > 1000 && linePrice % 100 === 0)
                      linePrice = linePrice / 100;
                  }
                } catch (e) {
                  linePrice = null;
                }

                // Don't set state during render. totalDue will be computed in a useEffect below.

                // If linePrice seems to be total for qty, compute per-unit
                let displayPrice = linePrice;
                if (displayPrice != null && quantity > 1)
                  displayPrice = displayPrice / quantity;

                // Parse variant name to extract tabs frequency and subscription type
                // Format: "Tabs frequency: 3 Tabs | Subscription Type: Monthly Supply"
                const variantName = item.variant?.name || null;
                let tabsFrequency = "";
                let subscriptionType = "";
                
                if (variantName) {
                  const parts = variantName.split("|");
                  
                  // Extract tabs frequency
                  const tabsPart = parts.find(p => p.includes("Tabs frequency:"));
                  if (tabsPart) {
                    const match = tabsPart.match(/:\s*(.+)/);
                    if (match) {
                      tabsFrequency = match[1].trim().toLowerCase();
                    }
                  }
                  
                  // Extract subscription type
                  const subscriptionPart = parts.find(p => p.includes("Subscription Type:"));
                  if (subscriptionPart) {
                    const match = subscriptionPart.match(/:\s*(.+)/);
                    if (match) {
                      subscriptionType = match[1].trim().toLowerCase();
                    }
                  }
                }

                // Check if this is a subscription product
                const productType = item.product?.type;
                const hasSubscriptionInterval = item.variant?.subscriptionInterval;
                const hasSubscriptionPeriod = item.variant?.subscriptionPeriod;
                const variantSubscription = (productType === "VARIABLE_SUBSCRIPTION" && hasSubscriptionInterval) || (hasSubscriptionInterval && hasSubscriptionPeriod);
                const subscription = item.extensions?.subscriptions;
                const isSubscription = variantSubscription || (subscription && subscription.billing_interval);

                // Build the display text
                let frequencyText = "";
                if (tabsFrequency && subscriptionType) {
                  // Format: "3 tabs monthly supply"
                  frequencyText = `${tabsFrequency} ${subscriptionType}`;
                } else if (isSubscription) {
                  // Fallback to legacy format
                  frequencyText = "subscription";
                } else {
                  // One time purchase
                  frequencyText = "one time purchase";
                }

                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-3 border-b last:border-b-0"
                  >
                    <div>
                      <p className="text-[16px] leading-[140%] font-medium">
                        {name}
                      </p>

                      {activeIngredient || activeIngredient === 0 ? (
                        <p className="text-[14px] leading-[140%] font-[500] text-[#757575]">
                          {activeIngredient}
                        </p>
                      ) : null}
                      {dose ? (
                        <p className="text-[12px] leading-[140%] font-[500] text-[#757575]">
                          {dose}
                        </p>
                      ) : null}

                      {displayPrice != null ? (
                        <p className="text-[14px] font-medium">
                          {formatPrice(displayPrice)}
                          {frequencyText && (
                            <span className="text-[12px] font-normal"> / {frequencyText}</span>
                          )}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <CustomImage
                        src={image}
                        className="w-auto h-[50px]"
                        alt={name || "Pill"}
                        width="50"
                        height="50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* derive totalDue from cart items (avoid setting state during render) */}

            <div className="flex flex-col gap-[12px] mb-[22px]">
              <div className="flex justify-start items-center gap-[8px]">
                <GiCheckMark className="text-[#AE7E56] text-[14px] w-[14px] h-[14px]" />
                <p className="text-[14px] leading-[140%]">
                  Provider evaluation
                </p>
              </div>
              <div className="flex justify-start items-center gap-[8px]">
                <GiCheckMark className="text-[#AE7E56] text-[14px] w-[14px] h-[14px]" />
                <p className="text-[14px] leading-[140%]">
                  Unlimited online medical support
                </p>
              </div>
              <div className="flex justify-start items-center gap-[8px]">
                <GiCheckMark className="text-[#AE7E56] text-[14px] w-[14px] h-[14px]" />
                <p className="text-[14px] leading-[140%]">
                  Free & discreet shipping
                </p>
              </div>
            </div>

            <hr />
            <div className="flex justify-between items-center mt-[22px] mb-[20px]">
              <p className="headers-font text-[20px] leading-[120%] tracking-tight font-[450]">
                Total
              </p>
              <p className="headers-font text-[20px] leading-[120%] tracking-tight font-[450]">
                {formatPrice(cartTotal ?? productPrice)}
              </p>
            </div>

            <div className="bg-[#F8F8F8] flex justify-center h-[41px] mb-[20px] rounded-lg mt-[14px] items-center text-[#00000099] font-medium leading-[140%] text-[12px]">
              Refills every 3 months. Pause or cancel anytime.
            </div>

            <hr />

            <div className="flex justify-between items-center mt-[22px] mb-[14px]">
              <p className="headers-font text-[20px] leading-[120%] tracking-tight font-[450]">
                Due now
              </p>
              <p className="headers-font text-[20px] leading-[120%] tracking-tight font-[450]">
                {formatPrice(totalDue || 0)}
              </p>
            </div>

            <p className="text-[#757575] text-[12px] font-medium leading-[140%] ">
              You’ll only be charged if prescribed
            </p>
          </div>

          <p className="headers-font font-medium text-[20px] leading-[120%] tracking-tight mb-[16px]">
            Payment information
          </p>

          <p className="font-medium text-[16px] leading-[140%] text-[#AE7E56] mb-[16px]">
            Transactions are secure and encrypted.
          </p>

          <div className="card-payment mb-[12px]">
            <NewPayment
              setFormData={setFormData}
              cardNumber={cardNumber}
              setCardNumber={setCardNumber}
              expiry={expiry}
              setExpiry={setExpiry}
              cvc={cvc}
              setCvc={setCvc}
              cardType={cardType}
              setCardType={setCardType}
              savedCards={savedCards}
              setSavedCards={setSavedCards}
              selectedCard={selectedCard}
              setSelectedCard={setSelectedCard}
              isLoadingSavedCards={isLoadingSavedCards}
            />

            {/* Keep the Pay button here and call parent onPay */}
            <button
              onClick={onPay}
              disabled={!isPaymentValid}
              className={`w-full mt-[24px] mb-[24px] h-[44px] rounded-full text-[14px] font-medium transition ${
                !isPaymentValid
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-900"
              }`}
            >
              Pay $0 today
            </button>

            {/* Show validation message when payment is invalid */}
            {!isPaymentValid && (
              <div className="mt-2 text-center">
                <p className="text-sm text-gray-600">
                  {paymentValidationMessage ||
                    "Please complete your payment information"}
                </p>
              </div>
            )}

            <p className="text-center text-[#00000080] leading-[150%] text-[12px] mb-[12px]">
              This transaction is a pre-authorization. Your credit card will
              only be charged if your prescription is approved.
            </p>
            <p className="text-center text-[#00000080] leading-[150%] text-[12px] mb-[12px]">
              Please refer to our{" "}
              <span className="underline">
                <Link href="/terms-of-use"> T&Cs </Link>
              </span>{" "}
              for full details on our payment policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
