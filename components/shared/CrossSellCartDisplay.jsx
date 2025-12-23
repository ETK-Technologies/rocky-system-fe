/**
 * Reusable Cart Display Component for Cross-Sell Popups
 * Shows current cart items with ability to remove items
 * Used across all flow cross-sell popups (ED, Hair, WL, etc.)
 */

"use client";

import React from "react";
import Image from "next/image";
import { FaTrash, FaSpinner } from "react-icons/fa";
import { logger } from "@/utils/devLogger";

const CrossSellCartDisplay = ({
  cartItems = [],
  subtotal = 0,
  onRemoveItem,
  isLoading = false,
  removingItemKey = null, // Deprecated: use isRemovingItem instead
  isRemovingItem = null, // New: function to check if item is being removed
  flowType = "ed",
  requiredItemIds = [], // Items that can't be removed (e.g., WL Body Optimization Program)
}) => {
  /**
   * Check if item can be removed
   */
  const canRemoveItem = (itemId) => {
    return !requiredItemIds.includes(String(itemId));
  };

  /**
   * Handle remove button click
   */
  const handleRemove = (item) => {
    if (!canRemoveItem(item.id)) {
      logger.log(`⚠️ Cannot remove required item: ${item.name}`);
      return;
    }

    if (onRemoveItem) {
      onRemoveItem(item.key);
    }
  };

  /**
   * Format price for display
   */
  const formatPrice = (price) => {
    return parseFloat(price || 0).toFixed(2);
  };

  // Debug logging
  React.useEffect(() => {
    logger.log("🛒 CrossSellCartDisplay - Received data:", {
      cartItems,
      cartItemsLength: cartItems?.length || 0,
      subtotal,
      isLoading,
      flowType,
    });
  }, [cartItems, subtotal, isLoading, flowType]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-gray-400 text-2xl mr-3" />
          <span className="text-gray-600">Loading cart...</span>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="flex border-b border-gray-200 py-[12px] px-0 md:px-10 justify-between">
        <div>
          <p className="font-[500] text-[14px] text-black">Product</p>
        </div>
        <div className="flex flex-col items-end justify-center">
          <p className="font-[500] text-[14px] text-black">
            <span>Total</span>
          </p>
        </div>
      </div>

      {/* Cart Items */}
      <div className="space-y-0">
        {cartItems.map((item, index) => {
          // Debug logging
          if (index === 0) {
            logger.log("🛒 Cart Item Structure:", {
              key: item.key,
              id: item.id,
              name: item.name,
              image: item.image,
              total: item.total,
              quantity: item.quantity,
              variation: item.variation,
            });
          }
          
          // Check if item is being removed (use new function if available, fallback to old approach)
          const isRemoving = isRemovingItem 
            ? isRemovingItem(item.key) 
            : removingItemKey === item.key;
          const isRequired = !canRemoveItem(item.id);

          return (
            <div
              key={item.key || `cart-item-${item.id || index}`}
              className={`flex border-b border-gray-200 py-[24px] px-0 md:px-10 justify-between items-center transition-opacity ${
                isRemoving ? "opacity-50" : "opacity-100"
              }`}
            >
              {/* Left side: Image + Product Info */}
              <div className="flex items-start gap-3 flex-1">
                {/* Product Image */}
                {item.image && (
                  <div className="flex-shrink-0 min-w-[70px] w-[70px] h-[70px] relative rounded-xl overflow-hidden bg-[#f3f3f3] p-1">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-[16px] text-black text-left">
                    {item.name}
                  </p>

                  {/* Price per unit / frequency - matching CartItem format */}
                  {item.name !== "Body Optimization Program" && (
                    <p className="text-[12px] font-[400] text-[#212121] opacity-85 mt-1">
                      ${formatPrice(item.price)}
                      {(() => {
                        // Check if this is a subscription product (matching CartItem logic)
                        const productType = item.product?.type;
                        const hasSubscriptionInterval = item.variant?.subscriptionInterval;
                        const hasSubscriptionPeriod = item.variant?.subscriptionPeriod;
                        const variantSubscription = (productType === "VARIABLE_SUBSCRIPTION" && hasSubscriptionInterval) || (hasSubscriptionInterval && hasSubscriptionPeriod);
                        const isSubscription = variantSubscription;
                        
                        // Helper function to format subscription period (matching CartItem)
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
                        
                        // Parse variant name for tabs frequency and subscription type
                        let tabsFrequency = "";
                        let subscriptionType = "";
                        
                        if (item.variation && Array.isArray(item.variation) && item.variation.length > 0) {
                          const variantName = item.variation
                            .map((v) => `${v.attribute}: ${v.value}`)
                            .join(" | ");
                          
                          const parts = variantName.split("|");
                          
                          // Extract tabs frequency
                          const tabsPart = parts.find(p => p.toLowerCase().includes("tabs frequency:"));
                          if (tabsPart) {
                            const match = tabsPart.match(/:\s*(.+)/);
                            if (match) {
                              tabsFrequency = match[1].trim().toLowerCase();
                            }
                          }
                          
                          // Extract subscription type
                          const subscriptionPart = parts.find(p => p.toLowerCase().includes("subscription type:"));
                          if (subscriptionPart) {
                            const match = subscriptionPart.match(/:\s*(.+)/);
                            if (match) {
                              subscriptionType = match[1].trim().toLowerCase();
                            }
                          }
                        }
                        
                        // Build the display text (matching CartItem logic)
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
                          // Fallback to subscription
                          frequencyText = "subscription";
                        } else {
                          // One time purchase
                          frequencyText = "one time purchase";
                        }
                        
                        return frequencyText ? ` / ${frequencyText}` : "";
                      })()}
                    </p>
                  )}

                  {/* Special handling for Body Optimization Program */}
                  {item.name === "Body Optimization Program" && (
                    <div className="flex flex-col mt-1">
                      <p className="text-[12px] font-[500] text-[#212121] underline">
                        Monthly membership:
                      </p>
                      <p className="text-[12px] text-[#212121]">
                        Initial fee $99 | Monthly fee $99
                      </p>
                    </div>
                  )}

                  {/* Flavor info for Zonnic products */}
                  {item.name?.toLowerCase().includes("zonnic") && 
                    item.variation?.find(v => v.attribute?.toLowerCase() === "flavors")?.value && (
                    <p className="text-[12px] font-[400] text-[#212121] mt-1">
                      {item.variation.find(v => v.attribute?.toLowerCase() === "flavors")?.value}
                    </p>
                  )}
                </div>
              </div>

              {/* Right side: Quantity + Total + Remove Button */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-end justify-start min-w-[80px]">
                  {/* Quantity */}
                  <p className="text-[14px] text-gray-500">
                    x {item.quantity}
                  </p>
                  {/* Total Price */}
                  <p className="font-[500] text-[16px] text-black mt-1">
                    ${formatPrice(item.total)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item)}
                  disabled={isRemoving || isRequired}
                  className={`w-6 h-6 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRequired
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-400 hover:text-red-500"
                  }`}
                  title={
                    isRequired ? "This item is required" : "Remove from cart"
                  }
                >
                  {isRemoving ? (
                    <FaSpinner className="animate-spin text-sm" />
                  ) : (
                    <FaTrash className="text-sm" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrossSellCartDisplay;
