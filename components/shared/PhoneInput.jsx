"use client";

import { useState, useEffect, useMemo } from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import { parsePhoneNumber } from "libphonenumber-js";
import "react-phone-number-input/style.css";
import { logger } from "@/utils/devLogger";

const PhoneInput = ({
  value,
  onChange,
  name,
  title,
  required = false,
  error,
  disabled = false,
  defaultCountry = "US",
  className = "",
}) => {
  const [phoneValue, setPhoneValue] = useState(value || "");
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);

  // Get allowed countries from environment variable
  // Format: "US,CA" or "US" or empty string (allows all countries)
  // Defaults to "US" if not set
  const allowedCountries = useMemo(() => {
    const envCountries = process.env.NEXT_PUBLIC_ALLOWED_COUNTRIES;
    if (!envCountries || envCountries.trim() === "") {
      // If no env var, default to US only
      return ["US"];
    }
    // Parse comma-separated list and trim whitespace
    const countries = envCountries
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length === 2); // Only valid 2-letter country codes
    
    return countries.length > 0 ? countries : ["US"];
  }, []);

  useEffect(() => {
    setPhoneValue(value || "");
  }, [value]);

  // Extract country from phone value when it changes
  useEffect(() => {
    if (phoneValue) {
      try {
        const phoneNumber = parsePhoneNumber(phoneValue);
        if (phoneNumber && phoneNumber.country) {
          setSelectedCountry(phoneNumber.country);
        }
      } catch (error) {
        // Invalid phone number, ignore
      }
    }
  }, [phoneValue]);

  // Get max length for the selected country based on E.164 format
  // E.164 allows max 15 digits total (including country code, excluding +)
  // We'll use 15 as the max length for the input field
  const maxLength = useMemo(() => {
    // E.164 format: + followed by country code (1-3 digits) + national number (max 15 total digits)
    // Maximum length in E.164 format is 15 digits after the + sign
    // We'll enforce this limit to prevent invalid phone numbers
    return 16; // + sign + 15 digits max
  }, []);

  const handleChange = (newValue) => {
    // Limit input length based on E.164 format
    if (newValue && newValue.length > maxLength) {
      return; // Don't update if exceeds max length
    }

    setPhoneValue(newValue || "");
    
    // Trigger onChange to match FormInput behavior
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: newValue || "",
        },
      });
    }
  };

  const handleCountryChange = (country) => {
    if (country) {
      setSelectedCountry(country);
    }
  };

  const hasError = !!error;

  return (
    <div className={`mb-4 md:mb-0 w-full ${className}`}>
      <label
        htmlFor={name}
        className="block text-[14px] leading-[19.6px] font-[500] text-[#212121] mb-2"
      >
        {title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={`phone-input-wrapper ${
          hasError ? "phone-input-error" : ""
        }`}
      >
        <PhoneInputWithCountry
          international
          defaultCountry={defaultCountry}
          value={phoneValue}
          onChange={handleChange}
          onCountryChange={handleCountryChange}
          disabled={disabled}
          countries={allowedCountries}
          addInternationalOption={false}
          countrySelectProps={{
            "aria-label": "Select country",
          }}
          numberInputProps={{
            id: name,
            name: name,
            required: required,
            maxLength: maxLength,
          }}
          className={`
            w-full
            ${hasError ? "!border-red-500" : ""}
          `}
        />
      </div>
      {hasError && <p className="text-red-500 text-sm mt-1">{error}</p>}
      <style dangerouslySetInnerHTML={{
        __html: `
        .phone-input-wrapper .PhoneInput {
          display: flex;
          align-items: center;
          width: 100%;
          background: white;
          border: 1px solid ${hasError ? "#ef4444" : "#E2E2E1"};
          border-radius: 8px;
          padding: 0;
          height: 44px;
          transition: border-color 0.2s;
        }

        .phone-input-wrapper .PhoneInput:focus-within {
          border-color: ${hasError ? "#dc2626" : "#000000"};
          outline: none;
        }

        .phone-input-wrapper.phone-input-error .PhoneInput {
          border-color: #ef4444;
        }

        .phone-input-wrapper .PhoneInputInput {
          flex: 1;
          border: none;
          outline: none;
          padding: 12px 16px;
          font-size: 16px;
          background: transparent;
          height: 100%;
          color: #212121;
          width: 100%;
        }

        .phone-input-wrapper .PhoneInputInput::placeholder {
          color: #aab7c4;
        }

        .phone-input-wrapper .PhoneInputCountry {
          padding: 0 8px;
          border-right: 1px solid #E2E2E1;
          height: 100%;
          display: flex;
          align-items: center;
        }

        .phone-input-wrapper .PhoneInputCountrySelect {
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0 8px;
          font-size: 14px;
          height: 100%;
          display: flex;
          align-items: center;
          outline: none;
          color: #212121;
        }

        .phone-input-wrapper .PhoneInputCountryIcon {
          width: 20px;
          height: 15px;
          margin-right: 8px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }

        .phone-input-wrapper .PhoneInputCountrySelectArrow {
          opacity: 0.6;
          margin-left: 6px;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid currentColor;
          border-bottom: none;
          transform: none;
          display: inline-block;
          vertical-align: middle;
        }

        .phone-input-wrapper .PhoneInputInput:disabled,
        .phone-input-wrapper .PhoneInputCountrySelect:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        `
      }} />
    </div>
  );
};

export default PhoneInput;
