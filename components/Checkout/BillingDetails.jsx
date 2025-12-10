import { useState, useEffect, useRef } from "react";
import FormInput from "./FormInput";
import DOBInput from "../shared/DOBInput";
import PhoneInput from "../shared/PhoneInput";
import PostCanadaAddressAutocomplete from "./PostCanada/PostCanadaAddressAutocomplete";
import { checkAgeRestriction } from "@/utils/ageValidation";
import { logger } from "@/utils/devLogger";
import { US_STATES_WITH_CODES, PHASE_1_STATES } from "@/lib/constants/usStates";

const BillingDetails = ({
  formData,
  setFormData,
  handleBillingAddressChange,
  isUpdatingShipping,
  onAgeValidation,
  onAgeValidationReset,
  cartItems,
  onProvinceChange,
}) => {
  logger.log("BillingDetails props:", {
    onAgeValidation,
    onAgeValidationReset,
    cartItems,
  });

  const addressSelectedRef = useRef(false);
  const previousStateRef = useRef(formData.billing_address.state);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (addressSelectedRef.current && formData.billing_address.state) {
      const currentState = formData.billing_address.state;
      const previousState = previousStateRef.current;

      if (currentState !== previousState) {
        if (onProvinceChange) {
          onProvinceChange(currentState, "billing", false);
        }

        previousStateRef.current = currentState;
        addressSelectedRef.current = false;
      }
    } else {
      previousStateRef.current = formData.billing_address.state;
    }
  }, [formData.billing_address.state, formData.billing_address.address_1, onProvinceChange]);
  // Handle date change in the date picker with real-time age validation
  const handleDateChange = (value) => {
    logger.log("handleDateChange called with value:", value);

    // Update the form data
    handleBillingAddressChange({
      target: {
        name: "date_of_birth",
        value: value,
      },
    });

    // Check if cart has Zonnic products and validate age in real-time
    if (cartItems && cartItems.items && value && value.length === 10) {
      logger.log("Date is complete (10 chars), checking for Zonnic products");

      const hasZonnic = cartItems.items.some(
        (item) =>
          item &&
          item.name &&
          typeof item.name === "string" &&
          item.name.toString().toLowerCase().includes("zonnic")
      );

      logger.log("Has Zonnic products:", hasZonnic);

      if (hasZonnic) {
        // The date is already in YYYY-MM-DD format from DOBInput
        logger.log("Date format from DOBInput:", value);

        const ageCheck = checkAgeRestriction(value, 19);
        logger.log("Age validation result:", ageCheck);

        if (ageCheck.blocked) {
          logger.log("User is too young, triggering age popup");
          logger.log("onAgeValidation function:", onAgeValidation);
          // Trigger age validation popup
          if (onAgeValidation) {
            logger.log("Calling onAgeValidation function");
            onAgeValidation();
          } else {
            logger.log("onAgeValidation function is not available");
          }
        } else {
          logger.log("User meets age requirement");
          // Reset age validation failed flag when user enters valid age
          if (onAgeValidationReset) {
            logger.log("Resetting age validation failed flag");
            onAgeValidationReset();
          }
        }
      } else {
        logger.log("No Zonnic products in cart, skipping age validation");
      }
    } else {
      logger.log("Date not complete or no cart items, skipping validation");
    }
  };

  const handleAddressSelected = (address) => {
    if (!address.address_1 || address.address_1.trim() === "") {
      logger.error("❌ ERROR: address_1 is empty or invalid!", address);
      return;
    }

    const addressUpdate = {
      address_1: String(address.address_1).trim(),
      address_2: address.address_2 || "",
      city: address.city || "",
      state: address.state || "",
      postcode: address.postcode || "",
      country: address.country || "US",
    };

    setFormData((prev) => {
      const updatedFormData = {
        ...prev,
        billing_address: {
          ...prev.billing_address,
          ...addressUpdate,
        },
      };

      return updatedFormData;
    });

    if (address.state) {
      addressSelectedRef.current = true;
    }
  };

  return (
    <>
      <div className="mb-4 md:flex md:items-center md:gap-[16px]">
        <FormInput
          title="First Name"
          name="first_name"
          placeholder="Your first name"
          required
          value={formData.billing_address?.first_name || ""}
          onChange={handleBillingAddressChange}
        />
        <FormInput
          title="Last Name"
          name="last_name"
          placeholder="Your last name"
          required
          value={formData.billing_address?.last_name?.replace(/^%20/, "") || ""}
          onChange={handleBillingAddressChange}
        />
      </div>
      <div className="mb-4">
        <FormInput
          title="Country / Region"
          name="country"
          placeholder="United States"
          required
          readOnly
          disabled
          value="US"
          hidden
          onChange={null}
        />
        <input
          type={"text"}
          readOnly
          disabled
          className="w-full bg-white rounded-[8px] border border-solid border-[#E2E2E1] px-[16px] py-[12px] h-[44px] focus:outline-none focus:border-gray-500"
          value={"United States"}
          onChange={null}
        />
      </div>
      <div className="mb-4">
        <PostCanadaAddressAutocomplete
          title="Street address"
          name="address_1"
          value={formData.billing_address?.address_1 || ""}
          placeholder="Start typing your street address"
          required
          disabled={isUpdatingShipping}
          onChange={handleBillingAddressChange}
          onAddressSelected={handleAddressSelected}
          country="US"
        />
      </div>
      <div className="mb-4">
        <FormInput
          title="Apartment Number"
          name="address_2"
          value={formData.billing_address?.address_2 || ""}
          placeholder="Enter your apartment number"
          disabled={isUpdatingShipping}
          onChange={handleBillingAddressChange}
        />
      </div>
      <div className="mb-4">
        <FormInput
          title="Town / City"
          name="city"
          value={formData.billing_address?.city || ""}
          placeholder="Enter your city/town"
          required
          disabled={isUpdatingShipping}
          onChange={handleBillingAddressChange}
        />
      </div>
      <div className="mb-4 md:flex md:items-center md:gap-[16px]">
        <div className="mb-4 w-full md:mb-0">
          <label
            htmlFor="billing_state"
            className="block text-[14px] font-[500] leading-[19.6px] text-[#212121] mb-2"
          >
            State*
          </label>
          <div className="relative">
            <select
              required
              value={formData.billing_address?.state || ""}
              onChange={handleBillingAddressChange}
              id="state"
              name="state"
              disabled={isUpdatingShipping}
              className={`w-full bg-white rounded-[8px] border border-solid border-[#E2E2E1] px-[16px] h-[44px] focus:outline-none focus:border-gray-500 appearance-none ${isUpdatingShipping ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              <option value="" disabled="">
                Select your state
              </option>
              {US_STATES_WITH_CODES.filter(
                (state) =>
                  state.value !== "" && PHASE_1_STATES.includes(state.code)
              ).map((state) => (
                <option key={state.code} value={state.code}>
                  {state.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 w-5 h-5 transform -translate-y-1/2 pointer-events-none">
              {isUpdatingShipping ? (
                <svg
                  className="animate-spin"
                  width="20px"
                  height="20px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#757575"
                    strokeWidth="4"
                    strokeDasharray="32"
                    strokeDashoffset="16"
                    fill="none"
                  />
                </svg>
              ) : (
                <svg
                  width="20px"
                  height="20px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M5.70711 9.71069C5.31658 10.1012 5.31658 10.7344 5.70711 11.1249L10.5993 16.0123C11.3805 16.7927 12.6463 16.7924 13.4271 16.0117L18.3174 11.1213C18.708 10.7308 18.708 10.0976 18.3174 9.70708C17.9269 9.31655 17.2937 9.31655 16.9032 9.70708L12.7176 13.8927C12.3271 14.2833 11.6939 14.2832 11.3034 13.8927L7.12132 9.71069C6.7308 9.32016 6.09763 9.32016 5.70711 9.71069Z"
                      fill="#757575"
                    ></path>
                  </g>
                </svg>
              )}
            </div>
          </div>
        </div>

        <FormInput
          title="ZIP Code"
          name="postcode"
          value={formData.billing_address?.postcode || ""}
          placeholder="Enter your ZIP code"
          required
          disabled={isUpdatingShipping}
          onChange={handleBillingAddressChange}
        />
      </div>
      <div className="mb-4">
        <PhoneInput
          title="Phone Number"
          name="phone"
          value={formData.billing_address?.phone || ""}
          required
          onChange={handleBillingAddressChange}
          disabled={isUpdatingShipping}
          defaultCountry="US"
        />
      </div>
      <div className="mb-4">
        <div className="mb-4 md:mb-0 w-full">
          <label
            htmlFor="date_of_birth"
            className="block text-[14px] leading-[19.6px] font-[500] text-[#212121] mb-2"
          >
            Date of Birth *
          </label>
        </div>
        <DOBInput
          value={formData.billing_address?.date_of_birth || ""}
          onChange={handleDateChange}
          className="w-full bg-white rounded-[8px] border border-solid border-[#E2E2E1] px-[16px] py-[12px] h-[44px] focus:outline-none focus:border-gray-500"
          placeholder="MM/DD/YYYY"
          minAge={18}
          required
        />
      </div>
    </>
  );
};

export default BillingDetails;
