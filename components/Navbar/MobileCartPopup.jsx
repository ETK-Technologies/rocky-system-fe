import Link from "next/link";
import { IoClose } from "react-icons/io5";
import { useState, useEffect } from "react";
import { formatPrice } from "@/utils/priceFormatter";
import CustomImage from "@/components/utils/CustomImage";

export default function MobileCartPopup({
  open,
  onClose,
  cartItems,
  isLocalCart,
  onRemoveItem,
  onEmptyCart,
  isEmptyingCart,
  handleToggle,
}) {
  const [isRemoving, setIsRemoving] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setCartVisible(true);
    } else {
      setTimeout(() => setCartVisible(false), 500); // Match transition duration
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 768;
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Only unmount when both open and cartVisible are false
  if (!open && !cartVisible) return null;

  const isLoading = cartItems === undefined || cartItems === null;

  return (
    <>
      <div
        className={` fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-500 ease-in-out will-change-opacity ${open && cartVisible ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        onClick={onClose}
      ></div>
      <div
        className={`cursor-auto fixed top-0 right-0 w-full h-full bg-white shadow-lg z-[9999] flex flex-col transition-transform duration-500 ease-in-out transform will-change-transform ${open && cartVisible ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-6 md:p-10">
          <span className="headers-font md:text-[32px]">CART</span>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 hover:bg-[#F5F4EF] hover:rounded-full"
          >
            <IoClose size={32} />
          </button>
        </div>
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 md:px-10">
          {isLoading ? (
            <>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 mb-4 animate-pulse"
                >
                  <div className="min-w-[60px] min-h-[60px] w-[60px] h-[60px] bg-gray-200 rounded-md" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-9 h-9 bg-gray-200 rounded-full" />
                </div>
              ))}
            </>
          ) : cartItems && cartItems.length > 0 ? (
            cartItems.map((item) => {
              // Support both new API structure and legacy structure
              const itemKey = item.id || item.key;

              // New API has nested product and variant objects
              const itemName = item.product?.name || item.name || item.productName || "Product";
              const variantName = item.variant?.name || null;
              const quantity = item.quantity || 1;

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

              // Helper function to format subscription period
              const formatSubscriptionPeriod = (period, interval) => {
                if (!period) return "";
                
                const periodMap = {
                  "DAY": "daily",
                  "WEEK": "weekly",
                  "MONTH": "monthly",
                  "YEAR": "yearly"
                };
                
                // Special case: 3 months = quarterly
                if (period.toUpperCase() === "MONTH" && interval === 3) {
                  return "quarterly";
                }
                
                const periodText = periodMap[period.toUpperCase()] || period.toLowerCase();
                
                if (interval && interval > 1) {
                  return `every ${interval} ${periodText.replace("ly", "")}s`;
                }
                
                return periodText;
              };

              // Build the display text
              let frequencyText = "";
              if (tabsFrequency && subscriptionType) {
                // Format: "3 tabs monthly supply"
                frequencyText = `${tabsFrequency} ${subscriptionType}`;
              } else if (hasSubscriptionPeriod) {
                // If variant.name doesn't exist or doesn't contain the expected pattern,
                // construct from subscriptionPeriod and subscriptionInterval
                const periodText = formatSubscriptionPeriod(hasSubscriptionPeriod, hasSubscriptionInterval);
                frequencyText = periodText ? `${periodText} supply` : "subscription";
              } else if (isSubscription) {
                // Fallback to legacy format
                frequencyText = "subscription";
              } else {
                // One time purchase
                frequencyText = "one time purchase";
              }

              const isOneTimePurchase = !isSubscription && !tabsFrequency;
              const currencySymbol = item.prices?.currency_symbol || "$";

              // Handle prices - new API has unitPrice and totalPrice as numbers
              let unitPrice = 0;
              let totalPrice = 0;

              if (item.unitPrice !== undefined) {
                // New API structure - prices can be numbers or strings
                unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice) || 0;
                totalPrice = item.totalPrice
                  ? (typeof item.totalPrice === 'number' ? item.totalPrice : parseFloat(item.totalPrice) || 0)
                  : unitPrice * quantity;
              } else if (item.prices?.sale_price) {
                // Legacy structure with sale_price (in cents)
                unitPrice = item.prices.sale_price / 100;
                totalPrice = (item.prices.sale_price / 100) * quantity;
              } else if (item.prices?.regular_price) {
                // Legacy structure with regular_price (in cents)
                unitPrice = item.prices.regular_price / 100;
                totalPrice = (item.prices.regular_price / 100) * quantity;
              } else if (item.price !== undefined) {
                // Legacy structure with direct price
                unitPrice = typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
                totalPrice = unitPrice * quantity;
              }

              // Handle images - Priority: variant image > product featured image > product first image > legacy images
              const imageUrl =
                item.variant?.imageUrl ||
                item.product?.images?.find(img => img.featured)?.url ||
                item.product?.images?.[0]?.url ||
                item.images?.[0]?.thumbnail ||
                item.images?.[0]?.src ||
                item.images?.[0]?.url ||
                item.image ||
                item.productImage ||
                null;

              return (
                <div key={itemKey} className="flex items-center gap-3 mb-4">
                  <div className="relative min-w-[60px] min-h-[60px] w-[60px] h-[60px] bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <CustomImage
                        src={imageUrl}
                        alt={itemName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-[#212121] text-sm font-medium mb-1">
                      <span
                        dangerouslySetInnerHTML={{ __html: itemName }}
                      ></span>
                      {isOneTimePurchase && variantName && variantName !== itemName && (
                        <span className="text-xs text-gray-600">
                          {" "}({variantName})
                        </span>
                      )}
                    </div>
                    <div className="text-[#212121] text-xs opacity-85">
                      {currencySymbol}
                      {formatPrice(unitPrice)}
                      {frequencyText && (
                        <span> / {frequencyText}</span>
                      )}
                    </div>
                    <div className="text-[#212121] text-sm font-semibold mt-1">
                      Total: {currencySymbol}{formatPrice(totalPrice)}
                    </div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsRemoving(itemKey);
                      await onRemoveItem(item);
                      setIsRemoving(null);
                    }}
                    className="bg-[#EBEBEB] rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    title="Remove item"
                    disabled={isRemoving === itemKey || isEmptyingCart}
                  >
                    {isRemoving === itemKey ? (
                      <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <IoClose size={22} />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Your cart is empty
            </div>
          )}
        </div>
        {/* Buttons */}
        <div className="px-5 md:px-10 py-4 flex flex-col gap-3">
          <Link
            href="/cart"
            className="w-full py-3 rounded-full bg-black text-white text-center font-medium text-sm disabled:opacity-60"
            onClick={() => {
              onClose();
              if (handleToggle) {
                handleToggle();
              }
            }}
          >
            <button disabled={isEmptyingCart || !!isRemoving}>View Cart</button>
          </Link>
          <button
            className="w-full py-3 rounded-full border border-black text-black text-center font-semibold text-sm flex items-center justify-center disabled:opacity-60"
            onClick={onEmptyCart}
            disabled={
              isEmptyingCart ||
              !!isRemoving ||
              !cartItems ||
              cartItems.length === 0
            }
          >
            {isEmptyingCart ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                Emptying...
              </>
            ) : (
              "Empty Cart"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
