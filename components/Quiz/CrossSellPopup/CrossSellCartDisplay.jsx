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
        {cartItems.map((item) => {
          // Check if item is being removed (use new function if available, fallback to old approach)
          const isRemoving = isRemovingItem 
            ? isRemovingItem(item.key) 
            : removingItemKey === item.key;
          const isRequired = !canRemoveItem(item.id);

          return (
            <div
              key={item.key}
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

                  {/* Variation info if available - Show frequency/subscription period */}
                  {item.variation &&
                    Array.isArray(item.variation) &&
                    item.variation.length > 0 && (
                      <p className="text-[12px] text-[#212121] block text-left mt-1">
                        {item.variation
                          .filter((v, idx) => v.attribute && v.value)
                          .find((v) =>
                            v.attribute.toLowerCase().includes("subscription")
                          )?.value ||
                          item.variation[0]?.value ||
                          ""}
                      </p>
                    )}
                </div>
              </div>

              {/* Right side: Price + Details + Remove Button */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-end justify-start">
                  <p className="font-[500] text-[16px] text-black">
                    ${formatPrice(item.total)}{" "}
                    <span className="text-[14px] text-gray-500 ml-1">
                      x {item.quantity}
                    </span>
                  </p>
                  <p className="text-[12px] text-[#212121] block text-right mt-1">
                    {(() => {
                      if (
                        item.variation &&
                        Array.isArray(item.variation) &&
                        item.variation.length > 0
                      ) {
                        // Find the tabs/pills frequency
                        const tabsInfo = item.variation
                          .filter((v, idx) => v.attribute && v.value)
                          .find(
                            (v) =>
                              v.attribute.toLowerCase().includes("tabs") ||
                              v.attribute.toLowerCase().includes("frequency") ||
                              v.attribute.toLowerCase().includes("pills")
                          );

                        if (tabsInfo) {
                          // Check if value already contains "Generic" or "Brand"
                          const hasType =
                            tabsInfo.value.toLowerCase().includes("generic") ||
                            tabsInfo.value.toLowerCase().includes("brand");
                          return hasType
                            ? tabsInfo.value
                            : `${tabsInfo.value} (Generic)`;
                        }
                      }
                      return "Pills (Generic)";
                    })()}
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
