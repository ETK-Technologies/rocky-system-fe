"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/utils/devLogger";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import { analyticsService } from "@/utils/analytics/analyticsService";
import { isUserAuthenticated } from "@/utils/crossSellCheckout";
import { formatPrice } from "@/utils/priceFormatter";
import { validateCart } from "@/lib/api/cartValidation";

const CartPopup = ({ isOpen, onClose, productType, onContinueShopping }) => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [isRemoving, setIsRemoving] = useState(null); // item key being removed
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleProceedToCheckout = async (e, checkoutUrl) => {
    e.preventDefault();

    // Check if user is authenticated - guests need to login before checkout
    const authenticated = isUserAuthenticated();
    if (!authenticated) {
      logger.log("Guest user attempting checkout, redirecting to login");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = encodeURIComponent(`${origin}${checkoutUrl}`);
      // Get sessionId to pass to login for cart merging
      const { getSessionId } = await import("@/services/sessionService");
      const sessionId = getSessionId();
      let loginUrl = `${origin}/login-register?redirect_to=${redirectTo}&viewshow=login`;
      if (sessionId) {
        loginUrl += `&sessionId=${encodeURIComponent(sessionId)}`;
      }
      window.location.href = loginUrl;
      return;
    }

    // If user is not authenticated and this is merch, redirect to login-register with redirect_to
    if (productType === "merch") {
      try {
        if (!authenticated) {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const redirectTo = encodeURIComponent(`${origin}${checkoutUrl}`);
          window.location.href = `${origin}/login-register?redirect_to=${redirectTo}&viewshow=register`;
          return;
        }
      } catch (_) { }
    }

    // Check if cart has items
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
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
        let errorMessage = cartValidation.error ||
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

        // If cart data is returned, refresh cart items (cart might have changed)
        if (cartValidation.cart?.items) {
          logger.log("Updating cart items with validated cart data");
          setCartItems(cartValidation.cart.items);
        }

        setIsValidating(false);
        return;
      }

      logger.log("Cart validation passed, proceeding to checkout");

      // Update cart items with validated cart data if available (ensures latest state)
      if (cartValidation.cart?.items) {
        logger.log("Updating cart items with validated cart data");
        setCartItems(cartValidation.cart.items);
      }

      // Track analytics
      try {
        if (Array.isArray(cartItems) && cartItems.length > 0) {
          const itemsForAnalytics = cartItems.map((it) => ({
            product: {
              id: it.product_id || it.id,
              sku: it.sku,
              name: it.name,
              price:
                (it.prices?.sale_price ||
                  it.prices?.regular_price ||
                  0) / 100,
              attributes: it.variation?.length
                ? it.variation.map((v) => ({
                  name: v.attribute || v.name,
                  options: [v.value],
                }))
                : [],
            },
            quantity: it.quantity || 1,
          }));
          analyticsService.trackBeginCheckout(itemsForAnalytics);
        }
      } catch (e) {
        logger.warn("[Analytics] begin_checkout (popup) skipped:", e);
      }

      // Navigate to checkout
      router.push(checkoutUrl);
    } catch (error) {
      logger.error("Error validating cart:", error);
      toast.error("Failed to validate cart. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  // Fetch cart items function - memoized with useCallback to prevent unnecessary re-renders
  const fetchCartItems = useCallback(async () => {
    setIsLoading(true);
    try {
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
          logger.warn("Could not get sessionId for cart fetch:", error);
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
      setCartItems(Array.isArray(items) ? items : []);

      logger.log("Cart items fetched in CartPopup:", items.length, "items");
    } catch (error) {
      logger.error("Error fetching cart items in CartPopup:", error);
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch cart items when popup opens
  useEffect(() => {
    if (isOpen) {
      logger.log("CartPopup opened, fetching cart items");
      fetchCartItems();
    }
  }, [isOpen, fetchCartItems]);

  // Listen for cart update events to refresh cart when items are added/removed elsewhere
  useEffect(() => {
    const handleCartUpdate = () => {
      logger.log("Cart updated event received in CartPopup, refreshing cart items");
      // Only refresh if popup is open
      if (isOpen) {
        fetchCartItems();
      }
    };

    // Listen for cart-updated events
    document.addEventListener("cart-updated", handleCartUpdate);

    // Create a MutationObserver to watch for cart refresh attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-refreshed"
        ) {
          logger.log("Cart refresher attribute changed in CartPopup, refreshing cart items");
          // Only refresh if popup is open
          if (isOpen) {
            fetchCartItems();
          }
        }
      });
    });

    const refresherElement = document.getElementById("cart-refresher");
    if (refresherElement) {
      observer.observe(refresherElement, { attributes: true });
    }

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdate);
      observer.disconnect();
    };
  }, [isOpen, fetchCartItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 768;
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Remove item handler
  const handleRemoveItem = async (item) => {
    // Support both new API structure (item.id) and legacy (item.key)
    const itemKey = item.id || item.key || item.productId;
    if (isRemoving === itemKey) return;
    setIsRemoving(itemKey);
    try {
      // Get sessionId for guest users
      let cartUrl = "/api/cart";
      try {
        const { getSessionId } = await import("@/services/sessionService");
        const sessionId = getSessionId();
        if (sessionId) {
          cartUrl = `/api/cart?sessionId=${sessionId}`;
        }
      } catch (error) {
        // If sessionService fails, continue without sessionId
      }

      // Determine if cart is local or server
      const cartRes = await fetch(cartUrl, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const cartData = await cartRes.json();
      const isLocalCart = cartData.is_local_cart || false;

      if (isLocalCart) {
        const { removeItemFromLocalCart } = require("@/lib/cart/cartService");
        const result = removeItemFromLocalCart(item.key);
        if (result.error) {
          toast.error(result.error);
          setIsRemoving(null);
          return;
        }
      } else {
        // Use new backend API for removing items
        // Support both new API structure (item.id) and legacy (item.key)
        const cartItemId = item.id || item.key;

        if (!cartItemId) {
          logger.error("Cannot delete item: cart item ID is missing");
          toast.error("Unable to remove item. Please refresh the page.");
          setIsRemoving(null);
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
          setIsRemoving(null);
          return;
        }

        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          setIsRemoving(null);
          return;
        }
      }
      // Refresh cart after removal
      await fetchCartItems();

      // Trigger cart refresh event for other components
      document.dispatchEvent(new CustomEvent("cart-updated"));

      // Trigger cart refresher for other components
      const refresher = document.getElementById("cart-refresher");
      if (refresher) {
        refresher.setAttribute("data-refreshed", Date.now().toString());
        refresher.click();
      }
    } catch (error) {
      toast.error("Failed to remove item from cart. Please try again.");
    } finally {
      setIsRemoving(null);
    }
  };

  if (!isOpen) return null;

  // Determine the correct checkout URL based on product type
  const getCheckoutUrl = () => {
    if (productType === "hair") {
      return "/checkout?hair-flow=1";
    } else if (productType === "ed") {
      return "/checkout?ed-flow=1";
    } else {
      return "/checkout";
    }
  };

  const checkoutUrl = getCheckoutUrl();

  return (
    <>
      {/* Desktop Modal */}
      <div className="hidden md:flex fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Item Added to Cart</h3>
            <p className="text-gray-600 mb-6">
              Your item has been added to your cart successfully.
            </p>

            <div className="flex flex-col space-y-3">
              <button
                onClick={(e) => handleProceedToCheckout(e, checkoutUrl)}
                disabled={isValidating}
                className="w-full bg-black text-white py-2.5 px-4 rounded-full hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isValidating ? "Validating..." : "Proceed to Checkout"}
              </button>

              <button
                onClick={productType === "merch" ? (onContinueShopping || onClose) : onClose}
                className="w-full bg-white text-black py-2.5 px-4 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black bg-opacity-30"
          onClick={onClose}
        ></div>
        {/* Bottom Sheet */}
        <div className="relative w-full max-h-[450px] bg-white rounded-t-2xl shadow-lg flex flex-col animate-slideUp">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <span className="font-semibold text-[#454545] text-base">CART</span>
            <button onClick={onClose}>
              <IoClose size={32} />
            </button>
          </div>
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-5 pb-2">
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
                // Support both new API structure (item.id) and legacy (item.key)
                const itemKey = item.id || item.key || item.productId;

                // New API has nested product and variant objects
                const itemName = item.product?.name || item.name || item.productName || "Product";
                const quantity = item.quantity || 1;

                // New API structure: unitPrice and totalPrice are strings (e.g., "108", "12.5")
                // Legacy structure: prices.sale_price/regular_price or price
                let unitPrice = 0;
                let totalPrice = 0;

                if (item.unitPrice !== undefined) {
                  // New API structure - prices are strings, convert to number
                  unitPrice = parseFloat(item.unitPrice) || 0;
                  totalPrice = item.totalPrice ? parseFloat(item.totalPrice) || 0 : unitPrice * quantity;
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

                // Handle images - new API has variant.imageUrl, legacy has images array
                const imageUrl = item.variant?.imageUrl ||
                  item.images?.[0]?.thumbnail ||
                  item.images?.[0]?.src ||
                  item.image ||
                  item.productImage ||
                  null;

                return (
                  <div key={itemKey} className="flex items-center gap-3 mb-4">
                    <div className="min-w-[60px] min-h-[60px] w-[60px] h-[60px] bg-gray-100 rounded-md flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={itemName}
                          className="rounded-md w-full h-full object-cover"
                          width={60}
                          height={60}
                        />
                      ) : (
                        <div className="text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[#212121] text-sm">
                        <span
                          dangerouslySetInnerHTML={{ __html: itemName }}
                        ></span>
                      </div>
                      {/* Display quantity and variations only for merch products */}
                      {productType === "merch" && (
                        <div className="mt-1 space-y-1">
                          {/* Display quantity */}
                          <div className="text-[#666666] text-xs">
                            Quantity:{" "}
                            <span className="text-[#212121] font-medium">
                              {item.quantity || 1}
                            </span>
                          </div>
                          {/* Display product variations */}
                          {item.variation && item.variation.length > 0 && (
                            <div className="text-[#666666] text-xs">
                              {item.variation
                                .map((variation, index) => {
                                  // Debug: Log the variation data structure
                                  console.log("Variation data:", variation);

                                  // Handle different variation data structures
                                  const variationName =
                                    variation.name ||
                                    variation.attribute ||
                                    variation.label ||
                                    "";
                                  const variationValue =
                                    variation.value ||
                                    variation.options?.[0] ||
                                    "";

                                  // Skip if we don't have proper data
                                  if (!variationName || !variationValue)
                                    return null;

                                  return (
                                    <span key={index}>
                                      {variationName}:{" "}
                                      <span className="text-[#212121] font-medium">
                                        {variationValue}
                                      </span>
                                      {index < item.variation.length - 1
                                        ? " • "
                                        : ""}
                                    </span>
                                  );
                                })
                                .filter(Boolean)}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-[#212121] text-sm">
                        {quantity} × ${formatPrice(unitPrice)}
                      </div>
                      <div className="text-[#212121] text-sm font-semibold">
                        Total: ${formatPrice(totalPrice)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="bg-[#EBEBEB] rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-60"
                      title="Remove item"
                      disabled={isRemoving === itemKey}
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
          {/* Footer Buttons */}
          <div className="px-5 pb-5 pt-2 flex flex-col gap-3">
            <button
              onClick={(e) => handleProceedToCheckout(e, checkoutUrl)}
              disabled={!!isRemoving || isValidating}
              className="w-full py-3 rounded-full bg-black text-white text-center font-medium text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isValidating ? "Validating..." : "Proceed to Checkout"}
            </button>
            <button
              onClick={productType === "merch" ? (onContinueShopping || onClose) : onClose}
              className="w-full py-3 rounded-full border border-black text-black text-center font-medium text-base"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartPopup;
