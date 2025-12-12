"use client";

import { PaymentElement } from "@stripe/react-stripe-js";

// Payment Element styling to match your design
const PAYMENT_ELEMENT_OPTIONS = {
  layout: {
    type: "tabs",
    defaultCollapsed: false,
  },
  fields: {
    billingDetails: {
      name: "auto", // Auto-fill from form data
      email: "auto", // Auto-fill from form data
      phone: "auto", // Auto-fill from form data
      address: {
        country: "never", // We collect this separately
        postalCode: "never", // We collect this separately
      },
    },
  },
  wallets: {
    applePay: "auto", // Enable Apple Pay wallet if available
    googlePay: "auto", // Enable Google Pay wallet if available
    cashapp: "never", // Disable Cash App Pay
    amazonPay: "never", // Disable Amazon Pay
    link: "auto", // Enable Link as a wallet (not a separate payment method)
  },
};

export default function StripeCardInput({ onReady, onChange, customerData }) {
  // Create options with customer data if provided
  const elementOptions = {
    ...PAYMENT_ELEMENT_OPTIONS,
    ...(customerData && {
      defaultValues: {
        billingDetails: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
        },
      },
    }),
  };

  return (
    <div className="stripe-payment-input">
      <PaymentElement
        options={elementOptions}
        onReady={onReady}
        onChange={onChange}
      />

      <style jsx global>{`
        .stripe-payment-input {
          width: 100%;
        }

        .stripe-payment-input .StripeElement {
          width: 100%;
        }

        /* Custom styling for Payment Element */
        .stripe-payment-input [data-testid="payment-element"] {
          border-radius: 8px;
        }

        /* Tab styling */
        .stripe-payment-input .p-TabsItem {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
        }

        /* Input field styling */
        .stripe-payment-input .p-Input {
          border-radius: 6px;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
