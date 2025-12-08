"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { logger } from "@/utils/devLogger";
import { IoCartOutline, IoClose } from "react-icons/io5";
import { CiTrash } from "react-icons/ci";
import { emptyCart } from "@/lib/cart/cartService";
import { toast } from "react-toastify";
import { canRemoveItem } from "@/lib/cart/cartService";
import MobileCartPopup from "./MobileCartPopup";
import { IoIosCart } from "react-icons/io";
import { formatPrice } from "@/utils/priceFormatter";

const CartIcon = ({ handleToggle }) => {
  const [cartItems, setCartItems] = useState({ items: [], totals: {} });
  const [isLocalCart, setIsLocalCart] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isEmptyingCart, setIsEmptyingCart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getCartItems = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      
      // Check if user is authenticated - authenticated users should NOT send sessionId
      const { isAuthenticated } = await import("@/lib/cart/cartService");
      const authenticated = isAuthenticated();
      
      let url = "/api/cart";
      
      // Only add sessionId for guest users (not authenticated)
      if (!authenticated) {
        try {
          const { getSessionId } = await import("@/services/sessionService");
          const sessionId = getSessionId();
          if (sessionId) {
            url = `/api/cart?sessionId=${sessionId}`;
          }
        } catch (error) {
          // If sessionService fails, continue without sessionId
          logger.log("Could not get sessionId, fetching cart without it");
        }
      }

      const res = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const data = await res.json();

      // Handle both new API structure (data.items) and legacy structure
      // Ensure items is always an array
      const items = data.items || [];
      setCartItems({
        ...data,
        items: Array.isArray(items) ? items : [],
      });
      setIsLocalCart(data.is_local_cart || false);
    } catch (error) {
      logger.error("Error fetching cart items:", error);
      // Set empty cart on error
      setCartItems({ items: [], total_items: 0, total_price: "0.00" });
      setIsLocalCart(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load of cart items
  useEffect(() => {
    getCartItems();

    // Add event listener for cart refresher element
    const handleCartRefresh = () => {
      logger.log("Cart refresh event received in CartIcon");
      getCartItems();
    };

    // Listen for user logout to immediately refresh cart
    const handleUserLoggedOut = () => {
      logger.log("User logged out event received in CartIcon, refreshing cart");
      // Immediately refresh cart to show guest cart state
      getCartItems();
    };

    document.addEventListener("cart-updated", handleCartRefresh);
    document.addEventListener("user-logged-out", handleUserLoggedOut);

    // Create a MutationObserver to watch for cart refresh clicks
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-refreshed"
        ) {
          logger.log("Cart refresher attribute changed in CartIcon");
          getCartItems();
        }
      });
    });

    const refresherElement = document.getElementById("cart-refresher");
    if (refresherElement) {
      observer.observe(refresherElement, { attributes: true });
    }

    return () => {
      document.removeEventListener("cart-updated", handleCartRefresh);
      document.removeEventListener("user-logged-out", handleUserLoggedOut);
      observer.disconnect();
    };
  }, [getCartItems]);

  const handleRefreshCart = () => {
    getCartItems();
    const refresher = document.getElementById("cart-refresher");
    if (refresher) {
      refresher.setAttribute("data-refreshed", Date.now().toString());
    }
  };

  // Remove item handler for mobile popup
  const handleRemoveItemMobile = async (item) => {
    try {
      if (isLocalCart) {
        const { removeItemFromLocalCart } = require("@/lib/cart/cartService");
        const result = removeItemFromLocalCart(item.key);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        getCartItems();
      } else {
        // Use new backend API for removing items
        // Support both new API structure (item.id) and legacy (item.key)
        const cartItemId = item.id || item.key;

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

        const res = await fetch(url, {
          headers: { "Content-Type": "application/json" },
          method: "DELETE",
        });

        if (!res.ok) {
          const errorData = await res.json();
          toast.error(errorData.error || "Failed to remove item from cart");
          return;
        }

        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          return;
        }

        if (res.ok) {
          getCartItems();
          // Trigger cart refresh event
          document.dispatchEvent(new CustomEvent("cart-updated"));
        }
      }
    } catch (error) {
      logger.error("Error removing item from cart:", error);
      toast.error("Failed to remove item from cart. Please try again.");
    }
  };

  // Empty cart handler for mobile popup
  const handleEmptyCartMobile = async () => {
    if (isEmptyingCart) return;
    try {
      setIsEmptyingCart(true);
      await emptyCart();

      // Immediately update UI to show empty cart
      setCartItems({ items: [], total_items: 0, total_price: "0.00" });

      // Refresh cart from server to ensure consistency
      await getCartItems();

      // Trigger cart refresh event for other components
      document.dispatchEvent(new CustomEvent("cart-updated"));

      // Trigger cart refresher for other components
      const refresher = document.getElementById("cart-refresher");
      if (refresher) {
        refresher.setAttribute("data-refreshed", Date.now().toString());
        refresher.click();
      }

      toast.success("Cart emptied successfully");
    } catch (error) {
      logger.error("Error emptying cart:", error);
      toast.error(error.message || "Failed to empty cart. Please try again.");
    } finally {
      setIsEmptyingCart(false);
    }
  };

  return (
    <>
      {/* <div className="relative group hidden md:block">
        <span
          id="cart-refresher"
          className="hidden"
          onClick={handleRefreshCart}
        ></span>
        <Link href="/cart" className="block relative">
          <IoIosCart size={24} />
          {cartItems.items && (
            <span className="absolute top-[-40%] right-[-40%] text-[10px] bg-[#A55255] flex items-center justify-center w-5 h-5 text-white rounded-full">
              {cartItems.items?.length}
            </span>
          )}
        </Link>
        {cartItems.items && (
          <div className="hidden group-hover:flex absolute top-[24px] right-[-13px] md:right-0 bg-white rounded-md min-w-[395px] md:min-w-[450px] min-h-[80px] shadow-md p-4 px-8 w-full z-50">
            <CartItems
              items={cartItems.items}
              refreshCart={getCartItems}
              isLocalCart={isLocalCart}
            />
          </div>
        )}
      </div> */}
      <div className="relative group block cursor-pointer p-2 hover:bg-[#F5F4EF] hover:rounded-full">
        <span
          id="cart-refresher"
          className="hidden"
          onClick={handleRefreshCart}
        ></span>
        <div
          className="block relative"
          onClick={() => setIsMobileCartOpen(true)}
        >
          <IoIosCart size={24} />
          {cartItems.items && cartItems.items.length > 0 && (
            <span className="absolute top-[-40%] right-[-40%] text-[10px] bg-[#A55255] flex items-center justify-center w-5 h-5 text-white rounded-full">
              {cartItems.items.length}
            </span>
          )}
        </div>
        <MobileCartPopup
          open={isMobileCartOpen}
          onClose={() => setIsMobileCartOpen(false)}
          cartItems={cartItems.items || []}
          isLocalCart={isLocalCart}
          onRemoveItem={handleRemoveItemMobile}
          onEmptyCart={handleEmptyCartMobile}
          isEmptyingCart={isEmptyingCart}
          handleToggle={handleToggle}
        />
      </div>
    </>
  );
};

export default CartIcon;

const CartItems = ({ items, refreshCart, isLocalCart }) => {
  const [isEmptyingCart, setIsEmptyingCart] = useState(false);

  const handleEmptyCart = async () => {
    if (isEmptyingCart) return; // Prevent multiple clicks

    try {
      setIsEmptyingCart(true);
      await emptyCart();

      // Refresh cart after emptying
      refreshCart();

      // Trigger cart refresh event for other components
      document.dispatchEvent(new CustomEvent("cart-updated"));

      // Trigger cart refresher for other components
      const refresher = document.getElementById("cart-refresher");
      if (refresher) {
        refresher.setAttribute("data-refreshed", Date.now().toString());
        refresher.click();
      }
    } catch (error) {
      logger.error("Error emptying cart:", error);
      toast.error("Failed to empty cart. Please try again.");
    } finally {
      setIsEmptyingCart(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center w-full">
        <p>Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isLocalCart && (
        <div className="mb-3 text-sm bg-blue-50 p-2 rounded">
          <p>Sign in to save your cart items and complete checkout.</p>
        </div>
      )}
      <div className="max-h-[300px] overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.key}>
            <CartItem
              item={item}
              refreshCart={refreshCart}
              isLocalCart={isLocalCart}
              allItems={items}
            />
            <hr />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Link
          className="flex-1 py-2 text-center bg-gray-200 rounded-full text-sm font-semibold"
          href="/cart"
          onClick={handleToggle}
        >
          View Cart
        </Link>
        <button
          onClick={handleEmptyCart}
          disabled={isEmptyingCart}
          className="flex-1 py-2 text-center bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors rounded-full text-sm font-semibold flex items-center justify-center"
        >
          {isEmptyingCart ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              Emptying...
            </>
          ) : (
            <>
              <CiTrash className="mr-1" /> Empty Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const CartItem = ({ item, refreshCart, isLocalCart, allItems }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  // Handle local cart items which have a different structure
  const itemPrice = isLocalCart
    ? item.price
    : (item.prices?.sale_price || item.prices?.regular_price) / 100;

  const quantity = item.quantity;
  const currencySymbol = item.prices?.currency_symbol || "$"; // Default to $

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
  const subscription = !isLocalCart ? item.extensions?.subscriptions : null;
  const isSubscription = variantSubscription || (subscription && subscription.billing_period);

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

  // Check if this item can be removed (for UI purposes)
  const itemCanBeRemoved = canRemoveItem(allItems || [], item.key);

  const handleRemoveItem = async () => {
    try {
      setIsRemoving(true);

      if (isLocalCart) {
        // Import directly to avoid dynamic import error
        const { removeItemFromLocalCart } = require("@/lib/cart/cartService");

        // Remove the item from local cart
        const result = removeItemFromLocalCart(item.key);

        // Check if there was an error (like Body Optimization Program restriction)
        if (result.error) {
          toast.error(result.error);
          return;
        }

        // Refresh cart display
        refreshCart();
      } else {
        // For server cart, use the DELETE API endpoint (which uses new backend API)
        const res = await fetch("/api/cart", {
          headers: {
            "Content-Type": "application/json",
          },
          method: "DELETE",
          body: JSON.stringify({
            itemKey: item.key,
          }),
        });

        const data = await res.json();

        // Check if there was an error (like Body Optimization Program restriction)
        if (data.error) {
          toast.error(data.error);
          return;
        }

        if (res.ok) {
          // Refresh cart after successful removal
          refreshCart();
          // Trigger cart refresh event for other components
          document.dispatchEvent(new CustomEvent("cart-updated"));
        }
      }

      // Trigger cart refresher for other components
      const refresher = document.getElementById("cart-refresher");
      if (refresher) {
        refresher.click();
      }
    } catch (error) {
      logger.error("Error removing item from cart:", error);
      toast.error("Failed to remove item from cart. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex gap-4 py-4 w-full relative">
      <div className="min-w-[65px] min-h-[65px] w-[65px] h-[65px] bg-gray-100 rounded-md flex items-center justify-center">
        {item.images && item.images[0]?.thumbnail ? (
          <Image
            width={65}
            height={65}
            src={item.images[0]?.thumbnail}
            alt={item.name}
            className="rounded-md"
          />
        ) : (
          <div className="text-gray-400">No Image</div>
        )}
      </div>
      <div className="text-sm font-semibold flex-grow">
        <h5 className="text-wrap max-w-[150px]">
          <span dangerouslySetInnerHTML={{ __html: item.name }}></span>{" "}
          {isOneTimePurchase &&
            !isLocalCart &&
            item.variation &&
            item.variation[0] &&
            `(${item.variation[0]?.value})`}
        </h5>
        <p className="text-[12px] font-normal">
          {frequencyText}
        </p>
        <p className="mt-1 text-xs">
          {quantity} × {currencySymbol}
          {typeof itemPrice === "number"
            ? formatPrice(itemPrice)
            : formatPrice(itemPrice)}
        </p>
        <p className="mt-1 text-xs font-semibold">
          Total: {currencySymbol}
          {typeof itemPrice === "number"
            ? formatPrice(itemPrice * quantity)
            : formatPrice(parseFloat(itemPrice || 0) * quantity)}
        </p>
        {item.name === "Body Optimization Program" && (
          <div className="flex flex-col">
            <p className="text-sm font-[500] text-[#212121] underline text-nowrap">
              Monthly membership:
            </p>
            <p className="text-sm text-[#212121]">
              Initial fee $99 | Monthly fee $99
            </p>
            <p className="text-sm font-[500] text-[#212121] mt-2 underline">
              Includes:
            </p>
            <ul className="text-sm text-[#212121] list-none pl-5">
              <li className="text-nowrap">- Monthly prescription</li>
              <li className="text-nowrap">- Follow-ups with clinicians</li>
              <li className="text-nowrap">- Pharmacist counselling</li>
            </ul>
          </div>
        )}
      </div>
      {itemCanBeRemoved ? (
        <button
          onClick={handleRemoveItem}
          disabled={isRemoving}
          className="self-start hover:text-red-700 transition-colors"
          title="Remove item"
        >
          <CiTrash size={18} />
        </button>
      ) : (
        <div
          className="w-[18px] h-[18px] self-start flex items-center justify-center"
          title="This item cannot be removed while Weight Loss products are in your cart"
        >
          <CiTrash size={18} className="text-gray-300 cursor-not-allowed" />
        </div>
      )}
      {isRemoving && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};
