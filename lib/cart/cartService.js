import { logger } from "@/utils/devLogger";
import { getCookieName } from "@/utils/storagePrefix";

/**
 * Cart Service
 * Handles cart operations for both authenticated and unauthenticated users
 * For unauthenticated users, cart data is stored in localStorage
 * For authenticated users, cart operations use the server API
 */

const LOCAL_CART_KEY = "rocky-local-cart";

/**
 * Get cookie value by name
 */
const getCookie = (name) => {
  if (typeof window === "undefined") return null;

  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

/**
 * Check if the user is authenticated
 * Note: We check for userId cookie instead of authToken because authToken is httpOnly
 * and cannot be read by JavaScript (for security). userId is set without httpOnly.
 * 
 * Important: The authToken (with Bearer prefix + JWT) is stored as httpOnly cookie.
 * This means JavaScript CANNOT read it (for security), but our API routes can.
 * When authenticated, our API route will:
 * 1. Read authToken from httpOnly cookie
 * 2. Add it to Authorization header
 * 3. Forward request to backend with: Authorization: Bearer <full-token>
 */
const isAuthenticated = () => {
  if (typeof window === "undefined") return false;

  // Check for prefixed userId cookie (not httpOnly, so JavaScript can read it)
  // Only read prefixed cookies to ensure project isolation
  const prefixedUserId = getCookieName("userId");
  const userId = getCookie(prefixedUserId);
  const hasUserId = !!userId;

  logger.log("🔐 isAuthenticated check:", {
    userId: hasUserId ? userId : "Not found",
    authenticated: hasUserId,
    note: "authToken is httpOnly (JavaScript can't read, but API route can)"
  });

  return hasUserId;
};

/**
 * Get cart from localStorage
 */
const getLocalCart = () => {
  if (typeof window === "undefined")
    return { items: [], total_items: 0, total_price: 0 };

  try {
    const localCart = localStorage.getItem(LOCAL_CART_KEY);
    return localCart
      ? JSON.parse(localCart)
      : { items: [], total_items: 0, total_price: 0 };
  } catch (error) {
    logger.error("Error getting local cart:", error);
    return { items: [], total_items: 0, total_price: 0 };
  }
};

/**
 * Save cart to localStorage and cookie to make it accessible server-side
 */
const saveLocalCart = (cart) => {
  if (typeof window === "undefined") return;

  try {
    // Save to localStorage
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));

    // Also save to cookie for server-side access
    // Set expiration to 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Create a serialized version with complete product details for display
    const cookieCart = {
      items: cart.items.map((item) => ({
        key: item.key,
        id: item.id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        images: item.images || [],
        variation: item.variation,
        totals: {
          subtotal: item.totals?.subtotal || item.price * item.quantity,
          total: item.totals?.total || item.price * item.quantity,
        },
        prices: {
          regular_price: item.prices?.regular_price || item.price,
          sale_price: item.prices?.sale_price || item.price,
          currency_symbol: "$",
        },
      })),
      total_items: cart.total_items,
      total_price: cart.total_price,
    };

    // Split the cookie if it's too large
    const cookieStr = JSON.stringify(cookieCart);
    if (cookieStr.length > 4000) {
      // If cookie is too large, store minimal version
      const minimalCookieCart = {
        items: cart.items.map((item) => ({
          key: item.key,
          id: item.id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          name: item.name,
          price: item.price,
        })),
        total_items: cart.total_items,
        total_price: cart.total_price,
      };
      document.cookie = `localCart=${JSON.stringify(
        minimalCookieCart
      )}; expires=${expiryDate.toUTCString()}; path=/`;
    } else {
      document.cookie = `localCart=${cookieStr}; expires=${expiryDate.toUTCString()}; path=/`;
    }
    logger.log("Cart saved to localStorage and cookie");
  } catch (error) {
    logger.error("Error saving local cart:", error);
  }
};

/**
 * Add item to local cart
 */
const addItemToLocalCart = (productData) => {
  const {
    productId,
    variationId,
    quantity = 1,
    name = "Product",
    price = 0,
    image = "",
    product_type = "",
    variation = [],
  } = productData;

  logger.log("Adding item to local cart with data:", {
    productId,
    name,
    price,
    image: image ? "Present" : "Missing",
  });

  const cart = getLocalCart();
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.id === productId &&
      (!variationId || item.variation_id === variationId)
  );

  if (existingItemIndex >= 0) {
    // Update quantity if item already exists
    cart.items[existingItemIndex].quantity += quantity;
    cart.total_items += quantity;

    // Update totals
    cart.items[existingItemIndex].totals.subtotal =
      cart.items[existingItemIndex].price *
      cart.items[existingItemIndex].quantity;
    cart.items[existingItemIndex].totals.total =
      cart.items[existingItemIndex].totals.subtotal;
  } else {
    // Format price correctly - ensure it's a valid number
    const itemPrice =
      typeof price === "number" ? price : parseFloat(price) || 0;

    // Add new item with complete information
    const newItem = {
      key: `local_${Date.now()}`,
      id: productId,
      variation_id: variationId,
      quantity: quantity,
      name: name || "Product",
      price: itemPrice,
      images: image ? [{ thumbnail: image, src: image }] : [],
      product_type: product_type,
      variation: variation,
      totals: {
        subtotal: itemPrice * quantity,
        total: itemPrice * quantity,
      },
      // Include prices property for compatibility with server cart format
      prices: {
        regular_price: itemPrice,
        sale_price: itemPrice,
        currency_symbol: "$",
      },
    };

    logger.log("New cart item created:", {
      key: newItem.key,
      name: newItem.name,
      price: newItem.price,
      image: newItem.images.length > 0 ? "Present" : "Missing",
    });

    cart.items.push(newItem);
    cart.total_items += quantity;
  }

  // Update total price
  cart.total_price = cart.items.reduce(
    (total, item) => total + (item.totals.total || 0),
    0
  );

  saveLocalCart(cart);
  return cart;
};

/**
 * Check if Body Optimization Program can be removed from cart
 * It can only be removed if there are no Weight Loss products in the cart
 * @param {Array} cartItems - Array of cart items
 * @param {string} itemToRemoveKey - Key of the item being removed
 * @returns {Object} { allowed: boolean, message: string }
 */
const checkBodyOptimizationRemoval = (cartItems, itemToRemoveKey) => {
  // Body Optimization Program product ID
  const BODY_OPTIMIZATION_PROGRAM_ID = "148515";

  // Weight Loss product IDs that are associated with Body Optimization Program
  const WEIGHT_LOSS_PRODUCT_IDS = [
    "142976", // Ozempic
    "160469", // Mounjaro
    "276274", // Wegovy
    "369795", // Rybelsus
  ];

  // Find the item being removed
  const itemToRemove = cartItems.find((item) => item.key === itemToRemoveKey);

  // If it's not the Body Optimization Program, allow removal
  if (!itemToRemove) {
    return { allowed: true, message: "" };
  }

  // Helper function to get product ID from cart item (handles different formats)
  const getProductId = (item) => {
    // Try different possible ID fields
    if (item.id) return String(item.id);
    if (item.product_id) return String(item.product_id);
    if (item.productId) return String(item.productId);
    return null;
  };

  const itemProductId = getProductId(itemToRemove);

  if (!itemProductId || itemProductId !== BODY_OPTIMIZATION_PROGRAM_ID) {
    return { allowed: true, message: "" };
  }

  // Check if there are any Weight Loss products in the cart
  const hasWeightLossProducts = cartItems.some((item) => {
    const productId = getProductId(item);
    if (!productId) return false;
    return (
      WEIGHT_LOSS_PRODUCT_IDS.includes(productId) &&
      item.key !== itemToRemoveKey
    );
  });

  if (hasWeightLossProducts) {
    return {
      allowed: false,
      message:
        "Body Optimization Program cannot be removed while Weight Loss products are in your cart. Please remove the Weight Loss products first.",
    };
  }

  return { allowed: true, message: "" };
};

/**
 * Remove Weight Loss products and Body Optimization Program together
 * When a WL product is removed, also remove the Body Optimization Program
 * @param {Array} cartItems - Array of cart items
 * @param {string} itemToRemoveKey - Key of the WL item being removed
 * @returns {Array} Array of item keys to remove
 */
const getItemsToRemoveWithWL = (cartItems, itemToRemoveKey) => {
  // Body Optimization Program product ID
  const BODY_OPTIMIZATION_PROGRAM_ID = "148515";

  // Weight Loss product IDs
  const WEIGHT_LOSS_PRODUCT_IDS = [
    "142976", // Ozempic
    "160469", // Mounjaro
    "276274", // Wegovy
    "369795", // Rybelsus
  ];

  // Helper function to get product ID from cart item (handles different formats)
  const getProductId = (item) => {
    // Try different possible ID fields
    if (item.id) return String(item.id);
    if (item.product_id) return String(item.product_id);
    if (item.productId) return String(item.productId);
    return null;
  };

  // Find the item being removed
  const itemToRemove = cartItems.find((item) => item.key === itemToRemoveKey);

  // If it's not a Weight Loss product, return only the original item
  if (!itemToRemove) {
    return [itemToRemoveKey];
  }

  const itemProductId = getProductId(itemToRemove);

  if (!itemProductId || !WEIGHT_LOSS_PRODUCT_IDS.includes(itemProductId)) {
    return [itemToRemoveKey];
  }

  // It's a WL product - also remove Body Optimization Program if it exists
  const bodyOptimizationItem = cartItems.find((item) => {
    const productId = getProductId(item);
    return productId === BODY_OPTIMIZATION_PROGRAM_ID;
  });

  const itemsToRemove = [itemToRemoveKey];

  if (bodyOptimizationItem) {
    itemsToRemove.push(bodyOptimizationItem.key);
    logger.log(
      "Also removing Body Optimization Program when removing Weight Loss product"
    );
  }

  return itemsToRemove;
};

/**
 * Remove variety pack products together
 * When a variety pack product is removed, also remove all other products in the same pack
 * @param {Array} cartItems - Array of cart items
 * @param {string} itemToRemoveKey - Key of the variety pack item being removed
 * @returns {Array} Array of item keys to remove
 */
const getItemsToRemoveWithVarietyPack = (cartItems, itemToRemoveKey) => {
  const itemToRemove = cartItems.find((item) => item.key === itemToRemoveKey);

  if (!itemToRemove) {
    return [itemToRemoveKey];
  }

  // Check if this item is part of a variety pack
  const isVarietyPack = itemToRemove.meta_data?.some(
    (meta) => meta.key === "_is_variety_pack" && meta.value === "true"
  );

  if (!isVarietyPack) {
    return [itemToRemoveKey];
  }

  // Get the variety pack ID
  const varietyPackId = itemToRemove.meta_data?.find(
    (meta) => meta.key === "_variety_pack_id"
  )?.value;

  if (!varietyPackId) {
    return [itemToRemoveKey];
  }

  // Find all items that are part of the same variety pack
  const varietyPackItems = cartItems.filter((item) =>
    item.meta_data?.some(
      (meta) => meta.key === "_variety_pack_id" && meta.value === varietyPackId
    )
  );

  const itemsToRemove = varietyPackItems.map((item) => item.key);

  logger.log(
    `Removing variety pack products together: ${itemsToRemove.length} items`
  );

  return itemsToRemove;
};

/**
 * Remove an item from the local cart
 * @param {string} itemKey - The key of the item to remove
 * @returns {Object} The updated cart or error object
 */
const removeItemFromLocalCart = (itemKey) => {
  const cart = getLocalCart();

  // Ensure cart has the correct structure
  if (!cart.items) {
    logger.warn("Cart missing items array when removing item");
    cart.items = [];
    cart.total_items = 0;
    cart.total_price = 0;
    saveLocalCart(cart);
    return cart;
  }

  // Check if Body Optimization Program removal is allowed
  const removalCheck = checkBodyOptimizationRemoval(cart.items, itemKey);
  if (!removalCheck.allowed) {
    logger.warn(
      "Body Optimization Program removal blocked:",
      removalCheck.message
    );
    return {
      error: removalCheck.message,
      items: cart.items,
      total_items: cart.total_items,
      total_price: cart.total_price,
    };
  }

  // Get all items that should be removed (including Body Optimization Program if removing WL product)
  const itemKeysToRemove = getItemsToRemoveWithWL(cart.items, itemKey);

  // Also check for variety pack products
  const varietyPackItemsToRemove = getItemsToRemoveWithVarietyPack(
    cart.items,
    itemKey
  );

  // Combine both arrays and remove duplicates
  const allItemsToRemove = [
    ...new Set([...itemKeysToRemove, ...varietyPackItemsToRemove]),
  ];

  // Remove all items
  allItemsToRemove.forEach((keyToRemove) => {
    const itemIndex = cart.items.findIndex((item) => item.key === keyToRemove);

    if (itemIndex > -1) {
      const removedItem = cart.items[itemIndex];
      cart.items.splice(itemIndex, 1);

      // Update totals
      cart.total_items -= removedItem.quantity;

      logger.log(`Item ${keyToRemove} (${removedItem.name}) removed from cart`);
    } else {
      logger.warn(
        `Item ${keyToRemove} not found in cart when attempting to remove it`
      );
    }
  });

  // Recalculate total price
  cart.total_price = cart.items.reduce(
    (total, item) => total + (item.totals?.total || 0),
    0
  );

  logger.log(
    `${allItemsToRemove.length} item(s) removed from cart, ${cart.items.length} items remaining`
  );

  // Save the updated cart
  saveLocalCart(cart);

  // Return a valid cart object with required properties to prevent crashes
  return {
    ...cart,
    items: cart.items || [],
    total_items: cart.total_items || 0,
    total_price: cart.total_price || 0,
  };
};

/**
 * Get cart items (either from localStorage or API)
 */
const getCart = async () => {
  if (isAuthenticated()) {
    try {
      const response = await fetch("/api/cart");
      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }
      return await response.json();
    } catch (error) {
      logger.error("Error getting cart from API:", error);
      return { items: [], total_items: 0, total_price: 0 };
    }
  } else {
    // For guest users, try to get sessionId and fetch from backend
    try {
      // Dynamically import sessionService to avoid SSR issues
      const { getSessionId } = await import("@/services/sessionService");
      const sessionId = getSessionId();

      if (sessionId) {
        // Fetch cart from backend using sessionId
        const response = await fetch(`/api/cart?sessionId=${sessionId}`);
        if (response.ok) {
          const cartData = await response.json();
          // Only use backend cart if it's not a local cart fallback
          if (!cartData.is_local_cart) {
            return cartData;
          }
        }
      }
    } catch (error) {
      logger.log("Could not fetch guest cart from backend, using local cart:", error);
    }

    // Fallback to local cart
    return getLocalCart();
  }
};

/**
 * Initialize cart nonce by fetching the cart
 */
const initializeCartNonce = async () => {
  try {
    logger.log("Initializing cart nonce...");
    const response = await fetch("/api/cart", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      logger.log("Cart nonce initialized successfully");
      return true;
    } else {
      logger.warn("Failed to initialize cart nonce");
      return false;
    }
  } catch (error) {
    logger.error("Error initializing cart nonce:", error);
    return false;
  }
};

/**
 * Add item to cart using the new API
 * For authenticated users: sends request with auth token (handled by API route reading httpOnly cookie)
 * For guest users: sends request with sessionId
 */
const addItemToCart = async (productData) => {
  logger.log("=== 🛒 ADD TO CART - CLIENT SIDE ===");

  const authenticated = isAuthenticated();
  // logger.log("🔐 Authentication check:", {
  //   authenticated: authenticated,
  //   method: "Checking userId cookie (authToken is httpOnly)",
  //   userId: authenticated ? "Present" : "Not found"
  // });

  // logger.log("📦 Product data received:", productData);

  if (authenticated) {

    try {
      logger.log("📝 Processing authenticated user request...");

      // STEP 1: Clean the payload - Remove ALL guest-specific fields
      const {
        sessionId,      // Remove sessionId (only for guests)
        name,           // Remove extra fields
        price,          // Remove extra fields
        image,          // Remove extra fields
        product_type,   // Remove extra fields
        variation,      // Remove extra fields
        ...cleanProductData
      } = productData;

      // Log if we removed any fields
      const removedFields = [];
      if (sessionId) removedFields.push("sessionId");
      if (name) removedFields.push("name");
      if (price) removedFields.push("price");
      if (image) removedFields.push("image");
      if (product_type) removedFields.push("product_type");
      if (variation) removedFields.push("variation");

      if (removedFields.length > 0) {
        logger.log("🧹 Cleaned payload - removed fields:", removedFields);
      }

      // STEP 2: Verify we have required fields
      if (!cleanProductData.productId) {
        throw new Error("productId is required");
      }
      if (!cleanProductData.quantity || cleanProductData.quantity < 1) {
        throw new Error("Valid quantity is required");
      }

      // STEP 3: Log the final payload
      logger.log("✅ AUTHENTICATED USER - Final payload:");
      logger.log("   ├─ productId:", cleanProductData.productId);
      logger.log("   ├─ variantId:", cleanProductData.variantId || "None (simple product)");
      logger.log("   ├─ quantity:", cleanProductData.quantity);
      logger.log("   └─ sessionId:", "NOT INCLUDED ✅");
      logger.log("");
      logger.log("🔐 Authorization flow:");
      logger.log("   ├─ Step 1: Client sends request to /api/cart/add-item");
      logger.log("   ├─ Step 2: API route reads authToken from httpOnly cookie");
      logger.log("   ├─ Step 3: API route adds 'Authorization: Bearer <token>' header");
      logger.log("   └─ Step 4: API route forwards to backend with full token");

      // STEP 4: Send request to our API route
      const response = await fetch("/api/cart/add-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanProductData),
      });

      // STEP 5: Handle response
      if (!response.ok) {
        const errorData = await response.json();
        logger.error("❌ API returned error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          details: errorData.details
        });
        throw new Error(errorData.error || "Failed to add item to cart");
      }

      const result = await response.json();
      logger.log("✅ SUCCESS - Item added to cart for authenticated user!");
      logger.log("   Response:", result);
      return result;
    } catch (error) {
      logger.error("❌ ERROR adding to cart for authenticated user:");
      logger.error("   Error:", error.message);
      if (error.stack) {
        logger.error("   Stack:", error.stack);
      }
      throw error;
    }
  } else {
    // ✅ GUEST USER PATH
    // No auth token - must include sessionId in request body
    try {
      // Import sessionService dynamically to get sessionId
      const { getSessionId } = await import("@/services/sessionService");
      let sessionId = getSessionId();

      // Ensure sessionId exists - getSessionId should create one if it doesn't exist
      // But if it's still null (e.g., localStorage disabled), we'll handle it gracefully
      if (!sessionId) {
        logger.warn("⚠️ No sessionId found, attempting to generate one...");
        // Try to generate and set a new sessionId
        const { setSessionId } = await import("@/services/sessionService");
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        const additionalRandom = Math.random().toString(36).substring(2, 15);
        sessionId = `${timestamp}-${randomPart}-${additionalRandom}`;
        setSessionId(sessionId);
        logger.log("✅ Generated new sessionId:", sessionId);
      }

      const guestPayload = {
        ...productData,
        sessionId
      };

      logger.log("✅ GUEST USER - Sending payload with sessionId:");
      logger.log("   Payload:", guestPayload);
      logger.log("   Target:", "/api/cart/add-item (our Next.js API)");
      logger.log("   Auth token:", "None (guest user)");
      logger.log("   SessionId:", sessionId);

      const response = await fetch("/api/cart/add-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(guestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("❌ API returned error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || "Failed to add item to cart");
      }

      const result = await response.json();
      logger.log("✅ SUCCESS - Item added to cart:", result);
      return result;
    } catch (error) {
      logger.error("❌ ERROR adding to cart for guest user:", error);
      throw error;
    }
  }
};

/**
 * Helper function to create a delay for retry logic
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the specified delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Migrate local cart to server cart upon authentication
 * Includes retry mechanism and only clears local cart after successful migration
 */
const migrateLocalCartToServer = async () => {
  const localCart = getLocalCart();

  if (localCart.items.length === 0) return true;

  // Initialize retry settings
  const MAX_RETRIES = 3;
  let currentRetry = 0;
  let migrationSuccessful = false;

  logger.log(
    `Starting cart migration with ${localCart.items.length} items : `,
    localCart.items
  );

  // Convert cart items to the format expected by our API
  const cartItems = localCart.items.map((item) => ({
    productId: item.id,
    variationId: item.variation_id,
    quantity: item.quantity,
  }));

  logger.log(`Cart items for migration:`, cartItems);

  // Migration function with retry logic
  while (currentRetry < MAX_RETRIES && !migrationSuccessful) {
    try {
      if (currentRetry > 0) {
        // Exponential backoff delay before retry (500ms, 1000ms, 2000ms...)
        const backoffDelay = 500 * Math.pow(2, currentRetry - 1);
        logger.log(
          `Retry attempt ${currentRetry}. Waiting ${backoffDelay}ms before retry...`
        );
        await delay(backoffDelay);
      }

      logger.log(
        `Migration attempt ${currentRetry + 1}/${MAX_RETRIES} with items : `,
        cartItems
      );

      // Send all cart items in a single request to the new batch endpoint
      const response = await fetch("/api/cart/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to migrate cart");
      }

      const migrationResult = await response.json();
      logger.log("Cart migration successful:", migrationResult);

      // Mark migration as successful
      migrationSuccessful = true;
    } catch (error) {
      currentRetry++;
      logger.error(
        `Cart migration failed (attempt ${currentRetry}/${MAX_RETRIES}):`,
        error
      );

      if (currentRetry >= MAX_RETRIES) {
        logger.error("Max retries exceeded. Cart migration failed.");
      }
    }
  }

  // Only clear local cart if migration was successful
  if (migrationSuccessful) {
    logger.log("Migration successful, clearing local cart");
    clearLocalCart();
    return true;
  } else {
    logger.log("Migration failed, preserving local cart data");
    return false;
  }
};

/**
 * Clear local cart
 */
const clearLocalCart = () => {
  if (typeof window === "undefined") return;

  // Clear from localStorage
  localStorage.removeItem(LOCAL_CART_KEY);

  // Clear from cookie
  document.cookie =
    "localCart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  logger.log("Local cart cleared from localStorage and cookie");
};

/**
 * Empty the cart (remove all items)
 * Works for both authenticated and unauthenticated users
 * Uses the new backend API endpoint
 */
const emptyCart = async () => {
  try {
    // Get sessionId for guest users
    let url = "/api/cart/empty";
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
        logger.warn("Could not get sessionId for guest cart emptying:", error);
      }
    }

    // Use DELETE method for the new API (POST is kept for backward compatibility)
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to empty cart");
    }

    const result = await response.json();
    
    // For guest users, also clear local cart after successful API call
    if (!isAuth) {
      clearLocalCart();
    }

    return result;
  } catch (error) {
    logger.error("Error emptying cart via API:", error);
    
    // For guest users, fallback to clearing local cart only
    if (!isAuthenticated()) {
      clearLocalCart();
      return {
        success: true,
        message: "Local cart emptied",
        items: [],
        total_items: 0,
        total_price: 0,
      };
    }
    
    throw error;
  }
};

/**
 * Check if an item can be removed from cart (for UI purposes)
 * @param {Array} cartItems - Array of cart items
 * @param {string} itemKey - Key of the item to check
 * @returns {boolean} Whether the item can be removed
 */
const canRemoveItem = (cartItems, itemKey) => {
  // Ensure we have valid input
  if (!Array.isArray(cartItems) || !itemKey) {
    return true; // Default to allowing removal if we can't determine
  }

  // Body Optimization Program product ID
  const BODY_OPTIMIZATION_PROGRAM_ID = "148515";
  // Weight Loss product IDs
  const WEIGHT_LOSS_PRODUCT_IDS = [
    "142976", // Ozempic
    "160469", // Mounjaro
    "276274", // Wegovy
    "369795", // Rybelsus
  ];

  // Find the item we're checking
  const item = cartItems.find((cartItem) => cartItem.key === itemKey);

  if (!item) {
    return true;
  }

  // Helper function to get product ID from cart item (handles different formats)
  const getProductId = (item) => {
    // Try different possible ID fields
    if (item.id) return String(item.id);
    if (item.product_id) return String(item.product_id);
    if (item.productId) return String(item.productId);
    return null;
  };

  const itemProductId = getProductId(item);

  // If it's not the Body Optimization Program, allow removal
  if (!itemProductId || itemProductId !== BODY_OPTIMIZATION_PROGRAM_ID) {
    return true;
  }

  // Check if there are any Weight Loss products in the cart
  const hasWeightLossProducts = cartItems.some((cartItem) => {
    const productId = getProductId(cartItem);
    if (!productId) return false;
    return (
      WEIGHT_LOSS_PRODUCT_IDS.includes(productId) && cartItem.key !== itemKey
    );
  });

  const removalCheck = checkBodyOptimizationRemoval(cartItems, itemKey);
  return removalCheck.allowed;
};

/**
 * Debug function to examine cart structure - call from browser console
 * Usage: window.debugCart()
 */
const debugCart = () => {
  const cart = getLocalCart();
  logger.log("=== CART DEBUG INFO ===");
  logger.log("Full cart object:", cart);
  logger.log("Items array:", cart.items);
  logger.log("Items details:");
  cart.items.forEach((item, index) => {
    logger.log(`Item ${index}:`, {
      key: item.key,
      name: item.name,
      id: item.id,
      product_id: item.product_id,
      productId: item.productId,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price: item.price,
    });
  });

  // Test the canRemoveItem function for each item
  logger.log("Testing canRemoveItem for each item:");
  cart.items.forEach((item, index) => {
    const canRemove = canRemoveItem(cart.items, item.key);
    logger.log(`Item ${index} (${item.name}) can be removed:`, canRemove);
  });

  logger.log("=== END CART DEBUG INFO ===");
  return cart;
};

// Make it available globally for debugging
if (typeof window !== "undefined") {
  window.debugCart = debugCart;
}

export {
  isAuthenticated,
  getCart,
  addItemToCart,
  migrateLocalCartToServer,
  clearLocalCart,
  getLocalCart,
  saveLocalCart,
  removeItemFromLocalCart,
  emptyCart,
  checkBodyOptimizationRemoval,
  getItemsToRemoveWithWL,
  getItemsToRemoveWithVarietyPack,
  canRemoveItem,
  debugCart,
};
