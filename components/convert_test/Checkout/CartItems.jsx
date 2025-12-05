import Image from "next/image";
import { formatPrice } from "@/utils/priceFormatter";

const CartItems = ({ items }) => {
  return (
    <div className="w-full">
      {items.map((item) => (
        <div key={item.key}>
          <CartItem item={item} />
          <hr />
        </div>
      ))}
    </div>
  );
};

export default CartItems;

const CartItem = ({ item }) => {
  const itemPrice = item.totals.line_total / 100;

  const currencySymbol = item.prices.currency_symbol || "$"; // Default to $

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

  const isOneTimePurchase = !isSubscription && !tabsFrequency;

  return (
    <div className="flex gap-4 py-4 w-full">
      <Image
        width={65}
        height={65}
        src={item.images[0]?.thumbnail}
        alt={item.name}
        className="rounded-md min-w-[65px] min-h-[65px] w-[65px] h-[65px]"
      />
      <div className="text-[14px] font-semibold">
        <h5>
          <span dangerouslySetInnerHTML={{ __html: item.name }}></span>{" "}
          {isOneTimePurchase &&
            item.variation[0] &&
            `(${item.variation[0]?.value})`}
        </h5>

        {item.name != "Body Optimization Program" && (
          <p className="text-[12px]">
            {currencySymbol}
            {formatPrice(itemPrice)}
            {frequencyText && (
              <span className="text-[12px] font-normal"> / {frequencyText}</span>
            )}
            {item.name?.toString().toLowerCase().includes("zonnic") &&
              item.variation?.find(
                (v) => v.attribute?.toString().toLowerCase() === "flavors"
              )?.value && (
                <span className="text-[12px] font-normal">
                  {" / "}
                  {
                    item.variation.find(
                      (v) =>
                        v.attribute?.toString().toLowerCase() === "flavors"
                    )?.value
                  }
                </span>
              )}
          </p>
        )}
        {item.name === "Body Optimization Program" && (
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
