import CustomImage from "../utils/CustomImage";
import { formatPrice } from "@/utils/priceFormatter";

const CartItems = ({ items }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return (
      <div className="w-full text-center py-8 text-gray-500">
        Your cart is empty
      </div>
    );
  }

  return (
    <div className="w-full">
      {items.map((item, index) => {
        // Support both new API structure (item.id) and legacy (item.key)
        // Use index as fallback to ensure unique key
        const itemKey = item.id || item.key || item.productId || `item-${index}`;
        return (
          <div key={itemKey}>
            <CartItem item={item} />
            <hr />
          </div>
        );
      })}
    </div>
  );
};

export default CartItems;

const CartItem = ({ item }) => {
  // Support both new API structure and legacy structure
  // New API: unitPrice and totalPrice are strings (e.g., "108", "12.5")
  // Legacy: totals.line_total is in cents
  let itemPrice = 0;
  const quantity = item.quantity || 1;

  if (item.unitPrice !== undefined) {
    // New API structure - prices are strings, convert to number
    itemPrice = parseFloat(item.unitPrice) || 0;
  } else if (item.totalPrice !== undefined) {
    // New API structure - totalPrice is the line total (already multiplied by quantity)
    // Divide by quantity to get unit price
    itemPrice = (parseFloat(item.totalPrice) || 0) / quantity;
  } else if (item.totals && typeof item.totals === 'object' && 'line_total' in item.totals) {
    // Legacy structure with line_total (in cents) - check if totals exists and has line_total
    itemPrice = (item.totals.line_total || 0) / 100;
  } else if (item.prices?.sale_price !== undefined) {
    // Legacy structure with sale_price (in cents)
    itemPrice = item.prices.sale_price / 100;
  } else if (item.prices?.regular_price !== undefined) {
    // Legacy structure with regular_price (in cents)
    itemPrice = item.prices.regular_price / 100;
  } else if (item.price !== undefined) {
    // Legacy structure with direct price
    itemPrice = typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
  }

  // Get currency symbol - new API has it at cart level, legacy has it in item.prices
  const currencySymbol = item.prices?.currency_symbol || "$"; // Default to $

  // Handle item name - new API has nested product.name
  const itemName = item.product?.name || item.name || "Product";

  // Handle images - new API has variant.imageUrl, legacy has images array
  const imageUrl = item.variant?.imageUrl ||
    item.images?.[0]?.thumbnail ||
    item.images?.[0]?.src ||
    item.image ||
    item.productImage ||
    null;

  // Handle variations - new API might not have variation array
  const variation = item.variation || [];

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

  return (
    <div className="flex gap-4 py-4 w-full">
      {imageUrl ? (
        <CustomImage
          width={65}
          height={65}
          src={imageUrl}
          alt={itemName}
          className="rounded-md min-w-[65px] min-h-[65px] w-[65px] h-[65px] object-cover"
        />
      ) : (
        <div className="rounded-md min-w-[65px] min-h-[65px] w-[65px] h-[65px] bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
          No Image
        </div>
      )}
      <div className="text-[14px] font-semibold">
        <h5>
          <span dangerouslySetInnerHTML={{ __html: itemName }}></span>{" "}
          {isOneTimePurchase &&
            variation[0] &&
            `(${variation[0]?.value})`}
        </h5>

        {itemName !== "Body Optimization Program" && (
          <p className="text-[12px]">
            {currencySymbol}
            {formatPrice(itemPrice)}
            {frequencyText && (
              <span className="text-[12px] font-normal"> / {frequencyText}</span>
            )}
            {itemName?.toString().toLowerCase().includes("zonnic") &&
              variation?.find(
                (v) => v.attribute?.toString().toLowerCase() === "flavors"
              )?.value && (
                <span className="text-[12px] font-normal">
                  {" / "}
                  {
                    variation.find(
                      (v) =>
                        v.attribute?.toString().toLowerCase() === "flavors"
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
            <p className="text-sm md:text-base font-[300] text-[#212121]">
              Initial fee $99 | Monthly fee $99
            </p>
            <p className="text-sm md:text-base font-[500] text-[#212121] mt-2 underline">
              Includes:
            </p>
            <ul className="text-sm md:text-base font-[300] text-[#212121] list-none pl-5">
              <li className="text-nowrap">- Monthly prescription</li>
              <li className="text-nowrap">- Follow-ups with clinicians</li>
              <li className="text-nowrap">- Pharmacist counselling</li>
            </ul>
          </div>
        )}
        <p className="text-gray-500 mt-1 font-thin text-[12px]">
          {!isOneTimePurchase && "Pause Or Cancel Anytime"}
        </p>
      </div>
    </div>
  );
};
