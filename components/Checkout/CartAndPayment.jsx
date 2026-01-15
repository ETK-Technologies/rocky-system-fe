import CartItems from "./CartItems";
import InitialShipping from "../CartCheckoutShared/InitialShipping";
import CouponApply from "../CartCheckoutShared/CouponApply";
import Payment from "./Payment";
import Link from "next/link";

const CartAndPayment = ({
  items,
  cartItems,
  setCartItems,
  setFormData,
  formData,
  handleSubmit,
  isUpdatingShipping,
  ageValidationFailed,
  isPaymentValid,
  paymentValidationMessage,
  onStripeReady, // Callback for Stripe Elements
  onPaymentMethodSelect, // Callback when payment method is selected
}) => {
  return (
    <div className="bg-[#f7f7f7] h-full justify-self-start w-full px-4 mt-8 lg:mt-0 lg:pl-[80px] lg:pt-[50px] pb-10 overflow-x-hidden">
      <h1 className="hidden lg:block text-[20px] leading-[24px] text-[#251F20] text-start mt-0 font-[500] mb-[24px]">
        Your Order
      </h1>
      <div className="bg-white w-full lg:max-w-[512px] p-4 md:p-6 py-0 md:py-0 rounded-[16px] shadow-[0px_1px_1px_0px_#E2E2E1] border border-[#E2E2E1] mt-8 lg:mt-0 ">
        <CartItems items={items} />
        <CouponApply setCartItems={setCartItems} />
        <InitialShipping
          cartItems={cartItems}
          setCartItems={setCartItems}
          isUpdatingShipping={isUpdatingShipping}
          formData={formData}
        />
      </div>

      <Payment
        setFormData={setFormData}
        formData={formData}
        onStripeReady={onStripeReady}
        onPaymentMethodSelect={onPaymentMethodSelect}
      />
      <button
        onClick={handleSubmit}
        type="button"
        disabled={isUpdatingShipping || ageValidationFailed || !isPaymentValid}
        className={`bg-black text-white text-sm font-semibold h-[44px] flex items-center justify-center rounded-full w-full lg:max-w-[512px] mt-6 transition ${
          isUpdatingShipping || ageValidationFailed || !isPaymentValid
            ? "opacity-50 cursor-not-allowed"
            : "hover:-translate-y-1"
        }`}
      >
        {isUpdatingShipping ? (
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="32"
                strokeDashoffset="16"
                fill="none"
              />
            </svg>
            Updating shipping...
          </div>
        ) : ageValidationFailed ? (
          "Age Restriction - Cannot Place Order"
        ) : (
          "Place order"
        )}
      </button>

      {/* Show validation message when payment is invalid */}
      {!isPaymentValid && !isUpdatingShipping && !ageValidationFailed && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">
            {paymentValidationMessage ||
              "Please complete your payment information"}
          </p>
        </div>
      )}

      {ageValidationFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4 w-full lg:max-w-[512px]">
          <p className="text-red-700 text-sm text-center">
            ⚠️ You must be at least 19 years old to purchase Zonnic products.
            Please update your date of birth to continue.
          </p>
        </div>
      )}
      <p className="text-[10px] text-gray-700 mt-4 text-center w-full lg:max-w-[512px]">
        Pay securely using your credit card. This transaction is a
        pre-authorization. Your credit card will only be charged if your
        prescription is approved.
      </p>
      <p className="text-[10px] text-gray-700 mt-4 text-center w-full lg:max-w-[512px]">
        Please note that your purchase is subject to our cancellation policy as
        outlined in our{" "}
        <Link
          target="_blank"
          href="/terms-of-use"
          className="text-[#AE7E56] font-semibold underline"
        >
          T&Cs.
        </Link>
      </p>
    </div>
  );
};

export default CartAndPayment;
