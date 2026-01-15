import { useEffect, useState } from "react";
import { useElements } from "@stripe/react-stripe-js";
import StripeCardInput from "./StripeCardInput";
import SavedPaymentMethods from "./SavedPaymentMethods";

const Payment = ({
  setFormData,
  onStripeReady, // Callback for Stripe Elements
  formData, // Get form data to pass customer info
  onPaymentMethodSelect, // Callback when payment method is selected
}) => {
  const elements = useElements(); // Get Stripe Elements instance
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("new");

  // Call onStripeReady when elements is ready and "new card" is selected
  useEffect(() => {
    if (elements && onStripeReady && selectedPaymentMethodId === "new") {
      onStripeReady(elements);
    }
  }, [elements, onStripeReady, selectedPaymentMethodId]);

  const handlePaymentMethodSelect = (paymentMethodId) => {
    setSelectedPaymentMethodId(paymentMethodId);
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(paymentMethodId);
    }
  };

  return (
    <div className="bg-white w-full lg:max-w-[512px] p-4 md:p-6 rounded-[16px] shadow-[0px_1px_1px_0px_#E2E2E1] border border-[#E2E2E1] mt-8">
      <h2 className="text-[20px] leading-[24px] text-[#251F20] text-start font-[500] mb-[24px]">
        Payment Method
      </h2>
      <div className="mt-2">
        <SavedPaymentMethods
          onSelectPaymentMethod={handlePaymentMethodSelect}
          selectedPaymentMethodId={selectedPaymentMethodId}
        />
        
        {/* Only show Payment Element when "Add new card" is selected */}
        {selectedPaymentMethodId === "new" && (
          <>
            <label className="block text-sm font-medium text-[#251F20] mb-2">
              Card Details
            </label>
            <StripeCardInput
              customerData={{
                name: `${formData.billing_address.first_name || ""} ${
                  formData.billing_address.last_name || ""
                }`.trim(),
                email: formData.billing_address.email || "",
                phone: formData.billing_address.phone || "",
              }}
            />
          </>
        )}
        
        <p className="mt-2 text-xs text-gray-600 flex items-center gap-1">
          <svg
            className="w-4 h-4 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
};

export default Payment;
