import { CiTrash } from "react-icons/ci";
import CustomImage from "../utils/CustomImage";
import { logger } from "@/utils/devLogger";
import { DotsLoader } from "react-loaders-kit";
import { useState } from "react";
import { useEmptyCart } from "@/lib/cart/cartHooks";
import { toast } from "react-toastify";
import { canRemoveItem } from "@/lib/cart/cartService";
import { analyticsService } from "@/utils/analytics/analyticsService";
import { formatPrice } from "@/utils/priceFormatter";

const CartItems = ({ items, setCartItems }) => {
  const emptyCart = useEmptyCart();
  const [isEmptyingCart, setIsEmptyingCart] = useState(false);

  const handleEmptyCart = async () => {
    try {
      setIsEmptyingCart(true);
      await emptyCart();

      // Create a synthetic cart update event to refresh the cart
      document.dispatchEvent(new Event("cart-updated"));

      // Alternatively, if you have a cart refresher element:
      const refresherElement = document.getElementById("cart-refresher");
      if (refresherElement) {
        refresherElement.setAttribute("data-refreshed", Date.now().toString());
      }
    } catch (error) {
      logger.error("Error emptying cart:", error);
    } finally {
      setIsEmptyingCart(false);
    }
  };

  return (
    <div className="w-full lg:max-w-[640px] h-full justify-self-end px-4 mt-8 lg:mt-0 lg:pr-[40px] lg:pt-[50px]">
      <h1 className="text-[24px] md:text-[32px] leading-[33.6px] md:leading-[44.8px] tracking-[-0.01em] md:tracking-[-0.02em] text-[#251F20] font-[450] pb-[16px] headers-font border-b border-[#E2E2E1] md:border-none">
        My Cart
      </h1>
      <div className="hidden md:grid grid-cols-4 items-center justify-between border-b border-[#E2E2E1] py-4 pl-8 text-[12px] font-[500] pr-[16px]">
        <div className="col-span-2">PRODUCT</div>
        <div className="justify-self-end pr-7">QUANTITY</div>
        <div className="justify-self-end">TOTAL</div>
      </div>

      {items.map((item) => {
        // Support both new API structure (item.id) and legacy (item.key)
        const itemKey = item.id || item.key;
        return (
          <div key={itemKey}>
            <CartItem item={item} setCartItems={setCartItems} allItems={items} />
            <hr />
          </div>
        );
      })}

      {/* Empty Cart Button */}
      <div className="my-6">
        <button
          onClick={handleEmptyCart}
          disabled={isEmptyingCart}
          className="flex items-center justify-center gap-3 bg-gray-200 text-black px-5 py-[12px] h-[44px] md:h-[52px] rounded-[64px] hover:bg-gray-300 transition w-full md:w-auto"
        >
          <span className="text-[14px] font-[500] leading-[19.6px] poppins-font">
            {isEmptyingCart ? "Emptying..." : "Empty Cart"}
          </span>
          {isEmptyingCart ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 4H3.33333H14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.33331 4.00004V2.66671C5.33331 2.31309 5.47379 1.97395 5.7238 1.72391C5.97381 1.4739 6.31296 1.33337 6.66665 1.33337H9.33331C9.687 1.33337 10.0261 1.4739 10.2762 1.72391C10.5262 1.97395 10.6666 2.31309 10.6666 2.66671V4.00004M12.6666 4.00004V13.3334C12.6666 13.687 12.5262 14.0261 12.2761 14.2762C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66665C4.31302 14.6667 3.97388 14.5262 3.72384 14.2762C3.47379 14.0261 3.33331 13.687 3.33331 13.3334V4.00004H12.6666Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.66669 7.33337V11.3334"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.33331 7.33337V11.3334"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default CartItems;

const CartItem = ({ item, setCartItems, allItems }) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Support both new API structure and legacy structure
  const itemKey = item.id || item.key;
  const itemName = item.product?.name || item.name || "Product";
  const variantName = item.variant?.name || null;
  const quantity = item.quantity || 1;

  // Handle prices - new API has unitPrice and totalPrice as numbers
  let itemPrice = 0;
  let itemTotalPrice = 0;

  if (item.unitPrice !== undefined) {
    // New API structure - prices can be numbers or strings
    itemPrice = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice) || 0;
    itemTotalPrice = item.totalPrice
      ? (typeof item.totalPrice === 'number' ? item.totalPrice : parseFloat(item.totalPrice) || 0)
      : itemPrice * quantity;
  } else if (item.prices?.sale_price) {
    // Legacy structure
    itemPrice = item.prices.sale_price / 100;
    itemTotalPrice = item.totals?.line_subtotal ? item.totals.line_subtotal / 100 : itemPrice * quantity;
  } else if (item.prices?.regular_price) {
    // Legacy structure
    itemPrice = item.prices.regular_price / 100;
    itemTotalPrice = item.totals?.line_subtotal ? item.totals.line_subtotal / 100 : itemPrice * quantity;
  }

  const currencySymbol = item.prices?.currency_symbol || "$";

  // Parse variant name to extract tabs frequency and subscription type
  // Format: "Tabs frequency: 3 Tabs | Subscription Type: Monthly Supply"
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
  const legacySubscription = item.extensions?.subscriptions;
  const isSubscription = variantSubscription || (legacySubscription && legacySubscription.billing_interval);

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

  const isOneTimePurchase = !isSubscription && !tabsFrequency;

  // Check if this item can be removed (for UI purposes)
  const itemCanBeRemoved = canRemoveItem(allItems || [], itemKey);

  // Handle quantity updates (increment/decrement)
  const handleQuantityEdit = async (quantity) => {
    if (loading) return; // Prevent multiple concurrent requests

    // Validate quantity
    if (quantity < 0) {
      logger.warn("Cannot set quantity to negative value");
      return;
    }

    try {
      setLoading(true);
      // Track delta before updating
      const prevQty = item.quantity;
      const newQty = quantity;
      const delta = (newQty || 0) - (prevQty || 0);
      const productForTracking = {
        id: item.productId || item.product?.id || item.product_id || item.id,
        sku: item.variant?.sku || item.sku,
        name: itemName,
        price: itemPrice,
        attributes: item.variation?.length
          ? item.variation.map((v) => ({
            name: v.attribute || v.name,
            options: [v.value],
          }))
          : variantName ? [{ name: "Variant", options: [variantName] }] : [],
      };
      if (delta > 0) {
        analyticsService.trackAddToCart(productForTracking, delta);
      } else if (delta < 0) {
        analyticsService.trackRemoveFromCart(
          productForTracking,
          Math.abs(delta)
        );
      }

      // Use cart item ID (item.id) for the new API endpoint
      // Support both new API structure (item.id) and legacy (item.key)
      const cartItemId = item.id || itemKey;

      if (!cartItemId) {
        logger.error("Cannot update quantity: cart item ID is missing");
        toast.error("Unable to update item quantity. Please refresh the page.");
        return;
      }

      // Build URL with sessionId for guest users
      let url = `/api/cart/items/${cartItemId}`;
      const { isAuthenticated } = await import("@/lib/cart/cartService");
      const isAuth = isAuthenticated();

      if (!isAuth) {
        // For guest users, get sessionId from localStorage
        try {
          const { getSessionId } = await import("@/services/sessionService");
          const sessionId = getSessionId();
          if (sessionId) {
            url += `?sessionId=${encodeURIComponent(sessionId)}`;
          }
        } catch (error) {
          logger.warn("Could not get sessionId for guest cart update:", error);
        }
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
        body: JSON.stringify({
          quantity,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update item quantity");
      }

      const data = await res.json();
      setCartItems(data);

      // Trigger cart refresh event
      document.dispatchEvent(new CustomEvent("cart-updated"));
    } catch (error) {
      logger.error("Error updating item quantity:", error);
      toast.error(error.message || "Failed to update item quantity. Please try again.");
    } finally {
      setLoading(false);
      document.getElementById("cart-refresher")?.click();
    }
  };

  // Handle item deletion - now uses the proper DELETE endpoint
  const handleDeleteItem = async () => {
    if (deleteLoading) return; // Prevent multiple clicks

    try {
      setDeleteLoading(true);
      // Track full removal
      try {
        const productForTracking = {
          id: item.productId || item.product?.id || item.product_id || item.id,
          sku: item.variant?.sku || item.sku,
          name: itemName,
          price: itemPrice,
          attributes: item.variation?.length
            ? item.variation.map((v) => ({
              name: v.attribute || v.name,
              options: [v.value],
            }))
            : variantName ? [{ name: "Variant", options: [variantName] }] : [],
        };
        analyticsService.trackRemoveFromCart(
          productForTracking,
          item.quantity || 1
        );
      } catch (e) {
        logger.warn("[Analytics] remove_from_cart tracking skipped:", e);
      }

      // Use cart item ID (item.id) for the new API endpoint
      // Support both new API structure (item.id) and legacy (item.key)
      const cartItemId = item.id || itemKey;

      if (!cartItemId) {
        logger.error("Cannot delete item: cart item ID is missing");
        toast.error("Unable to remove item. Please refresh the page.");
        return;
      }

      // Build URL with sessionId for guest users
      let url = `/api/cart/items/${cartItemId}`;
      const { isAuthenticated } = await import("@/lib/cart/cartService");
      const isAuth = isAuthenticated();

      if (!isAuth) {
        // For guest users, get sessionId from localStorage
        try {
          const { getSessionId } = await import("@/services/sessionService");
          const sessionId = getSessionId();
          if (sessionId) {
            url += `?sessionId=${encodeURIComponent(sessionId)}`;
          }
        } catch (error) {
          logger.warn("Could not get sessionId for guest cart delete:", error);
        }
      }

      // Item-specific loading state allows other items to be deleted in parallel
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE", // Use DELETE method to properly remove the item
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to remove item from cart");
      }

      const data = await res.json();

      // Check if there was an error (like Body Optimization Program restriction)
      if (data.error) {
        // Show error message to user using toast
        toast.error(data.error);
        return;
      }

      setCartItems(data);

      // Trigger cart refresh event
      document.dispatchEvent(new CustomEvent("cart-updated"));
    } catch (error) {
      logger.error("Error removing item from cart:", error);
      toast.error("Failed to remove item from cart. Please try again.");
    } finally {
      setDeleteLoading(false);
      document.getElementById("cart-refresher")?.click();
    }
  };

  return (
    <>
      <div className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_2fr_auto_auto] items-center border-b border-[#E2E2E1] py-4 md:py-[24px] md:pr-[16px] md:pl-8 relative gap-4">
        {loading && (
          <div className="absolute backdrop-blur-[2px] flex items-center justify-center left-0 right-0 top-0 bottom-0 z-50">
            <DotsLoader size={25} loading={loading} color={"#000000"} />
          </div>
        )}

        {/* Trash Icon - Far Left */}
        <div className="hidden md:flex items-center">
          {itemCanBeRemoved ? (
            <>
              <CiTrash
                size={20}
                className={`cursor-pointer ${deleteLoading ? "opacity-50" : ""}`}
                onClick={handleDeleteItem}
              />
              {deleteLoading && (
                <span className="w-3 h-3 border-t-2 border-r-2 border-black rounded-full animate-spin absolute ml-1 mt-[-12px]"></span>
              )}
            </>
          ) : (
            <div
              className="w-[20px] h-[20px] flex items-center justify-center"
              title="This item cannot be removed while Weight Loss products are in your cart"
            >
              <CiTrash
                size={20}
                className="text-gray-300 cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* PRODUCT Column - Image + Name + Price */}
        <div className="flex items-center gap-3 col-span-2 md:col-span-1">
          {/* Product Image */}
          <div className="relative min-w-[60px] min-h-[60px] md:min-w-[70px] md:min-h-[70px] object-cover rounded-[12px] bg-[#F3F3F3] overflow-hidden flex-shrink-0">
            {(() => {
              // Priority: variant image > product featured image > product first image > legacy images
              const imageUrl =
                item.variant?.imageUrl ||
                item.product?.images?.find(img => img.featured)?.url ||
                item.product?.images?.[0]?.url ||
                item.images?.[0]?.thumbnail ||
                item.images?.[0]?.url;

              return imageUrl ? (
                <CustomImage
                  src={imageUrl}
                  alt={itemName}
                  fill
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              );
            })()}
          </div>

          {/* Product Name and Price/Subscription Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] md:text-[16px] font-[500] md:font-[600] leading-[19.6px] mb-[2px] text-[#251F20]">
              <span dangerouslySetInnerHTML={{ __html: itemName }}></span>
              {isOneTimePurchase && variantName && variantName !== itemName && (
                <span className="text-[12px] font-[400] text-[#212121]">
                  {" "}({variantName})
                </span>
              )}
            </p>

            {itemName != "Body Optimization Program" && (
              <p className="text-[12px] font-[400] text-[#212121] opacity-85">
                {currencySymbol}
                {formatPrice(itemPrice)}
                {frequencyText && (
                  <span> / {frequencyText}</span>
                )}
                {itemName?.toLowerCase().includes("zonnic") &&
                  item.variation?.find(
                    (v) => v.attribute?.toLowerCase() === "flavors"
                  )?.value && (
                    <span className="text-[12px] font-[400] text-[#212121]">
                      {" / "}
                      {
                        item.variation.find(
                          (v) => v.attribute?.toLowerCase() === "flavors"
                        )?.value
                      }
                    </span>
                  )}
              </p>
            )}
            {itemName === "Body Optimization Program" && (
              <div className="flex flex-col">
                <p className="text-sm md:text-base font-[500] text-[#212121] underline text-nowrap">
                  Monthly membership:
                </p>
                <p className="text-sm md:text-base text-[#212121]">
                  Initial fee $99 | <br className="hidden md:block" /> Monthly
                  fee $99
                </p>
                <p className="text-sm md:text-base font-[500] text-[#212121] mt-2 underline">
                  Includes:
                </p>
                <ul className="text-sm md:text-base text-[#212121] list-none pl-5">
                  <li className="text-nowrap">- Monthly prescription</li>
                  <li className="text-nowrap">
                    - Follow-ups with clinicians
                  </li>
                  <li className="text-nowrap">- Pharmacist counselling</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* QUANTITY Column */}
        <div className="hidden md:flex justify-self-end items-center justify-between p-2 w-[104px] h-[40px] rounded-full border border-[#E2E2E1] flex-shrink-0">
          <button
            className={`quantity-minus w-[20px] h-[20px] flex items-center justify-center ${item.quantity === 1 ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={item.quantity === 1 || loading}
            onClick={() => handleQuantityEdit(item.quantity - 1)}
          >
            -
          </button>
          <span className="quantity-value font-medium">{quantity}</span>
          <button
            className="quantity-plus w-[20px] h-[20px] relative flex items-center justify-center"
            disabled={loading}
            onClick={() => handleQuantityEdit(item.quantity + 1)}
          >
            +
          </button>
        </div>

        {/* TOTAL Column */}
        <div className="text-[14px] md:text-[16px] font-[500] md:font-[600] leading-[19.6px] text-[#251F20] justify-self-end flex-shrink-0">
          <span className="woocommerce-Price-amount amount">
            <bdi>
              <span className="woocommerce-Price-currencySymbol">
                {currencySymbol}
              </span>
              {formatPrice(itemTotalPrice)}
            </bdi>
          </span>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex items-center gap-2 mt-4 w-full">
          <div className="flex items-center justify-between p-2 w-[104px] h-[40px] rounded-full border border-[#E2E2E1] flex-shrink-0">
            <button
              className={`quantity-minus w-[20px] h-[20px] flex items-center justify-center ${item.quantity === 1 ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={item.quantity === 1 || loading}
              onClick={() => handleQuantityEdit(item.quantity - 1)}
            >
              -
            </button>
            <span className="quantity-value font-medium">{quantity}</span>
            <button
              className="quantity-plus w-[20px] h-[20px] relative flex items-center justify-center"
              disabled={loading}
              onClick={() => handleQuantityEdit(item.quantity + 1)}
            >
              +
            </button>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center">
            {itemCanBeRemoved ? (
              <>
                <CiTrash
                  size={20}
                  className={`cursor-pointer ${deleteLoading ? "opacity-50" : ""}`}
                  onClick={handleDeleteItem}
                />
                {deleteLoading && (
                  <span className="w-3 h-3 border-t-2 border-r-2 border-black rounded-full animate-spin absolute ml-1 mt-[-12px]"></span>
                )}
              </>
            ) : (
              <div
                className="w-[20px] h-[20px] flex items-center justify-center"
                title="This item cannot be removed while Weight Loss products are in your cart"
              >
                <CiTrash
                  size={20}
                  className="text-gray-300 cursor-not-allowed"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
