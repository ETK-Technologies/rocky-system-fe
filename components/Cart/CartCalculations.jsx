import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logger } from "@/utils/devLogger";
import CouponApply from "../CartCheckoutShared/CouponApply";
import InitialShipping from "../CartCheckoutShared/InitialShipping";
import { analyticsService } from "@/utils/analytics/analyticsService";
import { formatPrice } from "@/utils/priceFormatter";
import { validateCart } from "@/lib/api/cartValidation";
import { toast } from "react-toastify";
import { isUserAuthenticated } from "@/utils/crossSellCheckout";

const CartCalculations = ({ cartItems, setCartItems }) => {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);

  // Support both new API structure and legacy structure
  const currencySymbol =
    cartItems.totals?.currency_symbol || cartItems.currency || "$";

  const handleProceedToCheckout = async (e) => {
    e.preventDefault();

    // Check if user is authenticated - guests need to login before checkout
    const authenticated = isUserAuthenticated();
    if (!authenticated) {
      logger.log("Guest user attempting checkout, redirecting to login");
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = encodeURIComponent(`${origin}/checkout`);
      const loginUrl = `${origin}/login-register?redirect_to=${redirectTo}&viewshow=login`;
      window.location.href = loginUrl;
      return;
    }

    // Check if cart has items
    if (
      !cartItems ||
      !Array.isArray(cartItems.items) ||
      cartItems.items.length === 0
    ) {
      toast.error("Your cart is empty");
      return;
    }

    setIsValidating(true);
    try {
      // Validate cart before proceeding to checkout
      logger.log("Validating cart before proceeding to checkout...");
      const { getSessionId } = await import("@/services/sessionService");
      const sessionId = getSessionId();

      const cartValidation = await validateCart(sessionId);

      if (!cartValidation.success || !cartValidation.valid) {
        logger.error("Cart validation failed:", cartValidation);

        // Show detailed error message
        let errorMessage =
          cartValidation.error ||
          cartValidation.message ||
          "Cart validation failed. Please check your cart and try again.";
        
        // If there are multiple errors, show them in a more readable format
        if (cartValidation.errorList && cartValidation.errorList.length > 0) {
          if (cartValidation.errorList.length === 1) {
            // Single error - show it directly
            toast.error(cartValidation.errorList[0], { autoClose: 7000 });
          } else {
            // Multiple errors - show a friendly summary
            toast.error("Some items in your cart are currently unavailable. Please remove them to continue.", { autoClose: 5000 });
            
            // Show each specific error
            cartValidation.errorList.forEach((err, idx) => {
              setTimeout(() => toast.error(err, { autoClose: 6000 }), (idx + 1) * 200);
            });
            
            // Log detailed errors for debugging
            logger.warn("Cart validation errors:", cartValidation.errorList);
          }
        } else {
          // No specific error list, show the general message
          toast.error(errorMessage, { autoClose: 7000 });
        }

        // If cart data is returned, update cart state (cart might have changed)
        if (cartValidation.cart && setCartItems) {
          logger.log("Updating cart with validated cart data");
          setCartItems(cartValidation.cart);
        }

        setIsValidating(false);
        return;
      }

      logger.log("Cart validation passed, proceeding to checkout");

      // Update cart state with validated cart data if available (ensures latest state)
      if (cartValidation.cart && setCartItems) {
        logger.log("Updating cart with validated cart data");
        setCartItems(cartValidation.cart);
      }

      // Track analytics
      try {
        const itemsForAnalytics = cartItems.items.map((it) => {
          // Support both new API structure and legacy structure
          const itemName = it.product?.name || it.name || "Product";
          const itemPrice =
            it.unitPrice !== undefined
              ? parseFloat(it.unitPrice) || 0
              : (it.prices?.sale_price || it.prices?.regular_price || 0) / 100;

          return {
            product: {
              id: it.productId || it.product?.id || it.product_id || it.id,
              sku: it.variant?.sku || it.sku,
              name: itemName,
              price: itemPrice,
              attributes: it.variation?.length
                ? it.variation.map((v) => ({
                    name: v.attribute || v.name,
                    options: [v.value],
                  }))
                : it.variant?.name
                ? [{ name: "Variant", options: [it.variant.name] }]
                : [],
            },
            quantity: it.quantity || 1,
          };
        });
        analyticsService.trackBeginCheckout(itemsForAnalytics);
      } catch (e) {
        logger.warn("[Analytics] begin_checkout tracking skipped:", e);
      }

      // Navigate to checkout
      router.push("/checkout");
    } catch (error) {
      logger.error("Error validating cart:", error);
      toast.error("Failed to validate cart. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  // Check if subscriptions data exists before rendering RecurringShipping
  const hasSubscriptions =
    cartItems.extensions &&
    cartItems.extensions.subscriptions &&
    cartItems.extensions.subscriptions.length > 0;

  return (
    <div className="bg-[#f7f7f7] h-full justify-self-start w-full px-4 mt-8 lg:mt-0 lg:pl-[80px] lg:pt-[50px] pb-10">
      <div className="bg-white lg:w-[384px] p-4 md:p-6 rounded-[16px] shadow-[0px_1px_1px_0px_#E2E2E1] border border-[#E2E2E1] mt-8 lg:mt-0 ">
        <h2 className="border-b border-[#E2E2E1] text-[18px] md:text-[20px] font-[500] pb-[12px] text-[#251F20] leading-[21.6px] md:leading-[24px]">
          Cart Totals
        </h2>

        <CouponApply setCartItems={setCartItems} />

        <InitialShipping
          currencySymbol={currencySymbol}
          cartItems={cartItems}
          setCartItems={setCartItems}
          formData={null}
        />

        {hasSubscriptions && (
          <RecurringShipping
            currencySymbol={currencySymbol}
            cartItems={cartItems}
          />
        )}

        <button
          onClick={handleProceedToCheckout}
          disabled={isValidating}
          className="flex items-center justify-center gap-3 bg-black text-white px-5 py-[12px] md:py-4 h-[44px] md:h-[52px] rounded-[64px] hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed w-full"
        >
          <span className="text-[14px] font-[500] text-[#FFFFFF] leading-[19.6px] poppins-font">
            {isValidating ? "Validating..." : "Proceed to checkout"}
          </span>
          {!isValidating && (
            <svg
              width="12"
              height="11"
              viewBox="0 0 12 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 0.5L6.285 1.1965L10.075 5H0V6H10.075L6.285 9.7865L7 10.5L12 5.5L7 0.5Z"
                fill="white"
              ></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default CartCalculations;

const RecurringShipping = ({ currencySymbol, cartItems }) => {
  // Add safety checks to prevent errors if subscriptions data is incomplete
  const subscriptions = cartItems.extensions?.subscriptions || [];

  const subTotalPrice =
    subscriptions.reduce((acc, sub) => {
      return acc + Number(sub.totals?.total_items || 0);
    }, 0) / 100;

  const totalPrice =
    subscriptions.reduce((acc, sub) => {
      return acc + Number(sub.totals?.total_price || 0);
    }, 0) / 100;

  const totalTax =
    subscriptions.reduce((acc, sub) => {
      return acc + Number(sub.totals?.total_tax || 0);
    }, 0) / 100;

  // If no shipping rates exist, don't try to render them
  const hasShippingRates =
    Array.isArray(cartItems.shipping_rates) &&
    cartItems.shipping_rates.length > 0;

  return (
    <div>
      <h3 className="text-[20px] font-[500] leading-[24px] text-[#251F20] border-b border-[#E2E2E1] pb-3">
        Recurring Totals
      </h3>
      <hr className="pb-4" />
      <div className="flex justify-between items-start py-[6px] md:py-0 mb-3">
        <p className="font-[500] text-[#4E4E4E] leading-[19.6px]">Subtotal</p>
        <p className="leading-[19.6px] text-[#000000]">
          {currencySymbol}
          {formatPrice(subTotalPrice)}
        </p>
      </div>
      <div className="flex justify-between items-start cart-discount coupon-"></div>
      {hasShippingRates &&
        cartItems.shipping_rates.map((shipping) => {
          const selectedShipping = shipping.shipping_rates?.find(
            (rate) => rate.selected
          );

          if (!selectedShipping) return null;

          return (
            <div
              key={shipping.name}
              className="flex justify-between items-start mb-3 mt-2"
            >
              <p className="font-[500] text-[#4E4E4E] leading-[19.6px]">
                Shipping
              </p>
              <div className="flex flex-col items-end gap-[2px]">
                <p className="leading-[19.6px]">
                  {selectedShipping.name}
                  {selectedShipping && selectedShipping.price && (
                    <span>
                      {" "}
                      ({currencySymbol}
                      {formatPrice(Number(selectedShipping.price) / 100)})
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}

      <div className="flex justify-between items-start mb-3">
        <p className="font-[500] text-[#4E4E4E] leading-[19.6px]">Tax</p>
        <p className="leading-[19.6px]">
          {currencySymbol}
          {formatPrice(totalTax)}
        </p>
      </div>
      <div className="flex justify-between items-start mb-[24px]">
        <p className="font-[500] text-[#000000] leading-[19.6px]">
          Recurring Total
        </p>
        <p className="font-[500] text-[#000000] leading-[22px]">
          {currencySymbol}
          {formatPrice(totalPrice)}
        </p>
      </div>
    </div>
  );
};
