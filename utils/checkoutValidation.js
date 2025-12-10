import { logger } from "@/utils/devLogger";

/**
 * Comprehensive checkout data validation utility
 * Validates all required fields for checkout including billing, shipping, and payment data
 */

// Validation rules and patterns
const VALIDATION_RULES = {
  // Name validation - allow letters (including accented), spaces, hyphens, and apostrophes
  name: {
    pattern: /^[\p{L}\s\-']{2,50}$/u,
    message:
      "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes",
  },

  // Email validation
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },

  // Phone validation - Canadian/US format
  // Accepts various formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890, 1234567890, etc.
  phone: {
    // More flexible pattern that accepts common US phone formats
    pattern: /^[\+]?[1]?[\s\-\.\(\)]*[0-9][\s\-\.\(\)0-9]{8,14}[0-9]$/,
    message: "Please enter a valid phone number",
  },

  // Address validation - allow letters (including accented), numbers, spaces, and common punctuation
  address: {
    pattern: /^[\p{L}0-9\s\-\.#,/]{5,100}$/u,
    message: "Address must be 5-100 characters",
  },

  // City validation - allow letters (including accented), spaces, hyphens, and apostrophes
  city: {
    pattern: /^[\p{L}\s\-']{2,50}$/u,
    message:
      "City must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes",
  },

  // Postal code validation (Canadian and US formats)
  // US formats: 5-digit (12345) or ZIP+4 (12345-6789)
  postalCode: {
    patterns: {
      CA: /^\d{5}(-\d{4})?$/,
      US: /^\d{5}(-\d{4})?$/,
    },
    message: "Please enter a valid ZIP code (5-digit or ZIP+4 format)",
  },

  // Card number validation (basic Luhn algorithm check)
  cardNumber: {
    pattern: /^.*$/, // Disabled: was /^\d{13,19}$/
    message: "Please enter a valid card number.",
  },

  // CVV validation
  cvv: {
    pattern: /^\d{3,4}$/,
    message: "CVV must be 3-4 digits",
  },

  // Expiry date validation (MM/YY format)
  expiryDate: {
    pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
    message: "Expiry date must be in MM/YY format",
  },
};

/**
 * Validate a single field based on its type and value
 * @param {string} fieldType - The type of field to validate
 * @param {string} value - The value to validate
 * @param {string} country - Country code for postal code validation
 * @returns {object} - Validation result with isValid boolean and message
 */
export const validateField = (fieldType, value, country = "CA") => {
  if (!value || typeof value !== "string") {
    return {
      isValid: false,
      message: `${fieldType} is required`,
    };
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return {
      isValid: false,
      message: `${fieldType} is required`,
    };
  }

  const rule = VALIDATION_RULES[fieldType];
  if (!rule) {
    logger.warn(`No validation rule found for field type: ${fieldType}`);
    return { isValid: true, message: "" };
  }

  // Special handling for phone numbers - validate international format (E.164)
  if (fieldType === "phone") {
    // E.164 format: + followed by 1-15 digits
    // This format is used by react-phone-number-input library
    const e164Pattern = /^\+[1-9]\d{1,14}$/;
    
    if (!e164Pattern.test(trimmedValue)) {
      // If not in E.164 format, try to validate as US/Canada format for backward compatibility
      const cleaned = trimmedValue.replace(/[^\d+]/g, '');
      const normalized = cleaned.replace(/^\+?1?/, '');
      
      // Allow US/Canada format (10 digits) for backward compatibility
      if (normalized.length === 10 && /^\d+$/.test(normalized)) {
        return { isValid: true, message: "" };
      }
      
      return {
        isValid: false,
        message: rule.message,
      };
    }
    return { isValid: true, message: "" };
  }

  // Special handling for postal codes
  if (fieldType === "postalCode" && rule.patterns) {
    const pattern = rule.patterns[country] || rule.patterns.CA;
    if (!pattern.test(trimmedValue)) {
      return {
        isValid: false,
        message: rule.message,
      };
    }
  } else if (rule.pattern && !rule.pattern.test(trimmedValue)) {
    return {
      isValid: false,
      message: rule.message,
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Validate billing address data
 * @param {object} billingData - Billing address data
 * @returns {object} - Validation result with errors array
 */
export const validateBillingAddress = (billingData) => {
  const errors = [];

  // Required billing fields
  const requiredFields = [
    "first_name",
    "last_name",
    "address_1",
    "city",
    "state",
    "postcode",
    "country",
    "email",
    "phone",
  ];

  // Validate required fields
  requiredFields.forEach((field) => {
    if (!billingData[field] || billingData[field].trim() === "") {
      // Use "ZIP code" instead of "postcode" for better user experience
      const fieldName =
        field === "postcode" ? "ZIP code" : field.replace("_", " ");
      errors.push({
        field,
        message: `${fieldName} is required`,
      });
    }
  });

  // Validate field formats if values exist
  if (billingData.first_name) {
    const firstNameValidation = validateField("name", billingData.first_name);
    if (!firstNameValidation.isValid) {
      errors.push({
        field: "first_name",
        message: firstNameValidation.message,
      });
    }
  }

  if (billingData.last_name) {
    const lastNameValidation = validateField("name", billingData.last_name);
    if (!lastNameValidation.isValid) {
      errors.push({
        field: "last_name",
        message: lastNameValidation.message,
      });
    }
  }

  if (billingData.email) {
    const emailValidation = validateField("email", billingData.email);
    if (!emailValidation.isValid) {
      errors.push({
        field: "email",
        message: emailValidation.message,
      });
    }
  }

  if (billingData.phone) {
    const phoneValidation = validateField("phone", billingData.phone);
    if (!phoneValidation.isValid) {
      errors.push({
        field: "phone",
        message: phoneValidation.message,
      });
    }
  }

  if (billingData.address_1) {
    const addressValidation = validateField("address", billingData.address_1);
    if (!addressValidation.isValid) {
      errors.push({
        field: "address_1",
        message: addressValidation.message,
      });
    }
  }

  if (billingData.city) {
    const cityValidation = validateField("city", billingData.city);
    if (!cityValidation.isValid) {
      errors.push({
        field: "city",
        message: cityValidation.message,
      });
    }
  }

  if (billingData.postcode) {
    const postalValidation = validateField(
      "postalCode",
      billingData.postcode,
      billingData.country
    );
    if (!postalValidation.isValid) {
      errors.push({
        field: "postcode",
        message: postalValidation.message,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate shipping address data
 * @param {object} shippingData - Shipping address data
 * @param {boolean} shipToDifferentAddress - Whether shipping to different address
 * @returns {object} - Validation result with errors array
 */
export const validateShippingAddress = (
  shippingData,
  shipToDifferentAddress = false
) => {
  const errors = [];

  // If not shipping to different address, validation passes
  if (!shipToDifferentAddress) {
    return { isValid: true, errors: [] };
  }

  // Required shipping fields when shipping to different address
  const requiredFields = [
    "first_name",
    "last_name",
    "address_1",
    "city",
    "state",
    "postcode",
    "country",
  ];

  // Validate required fields
  requiredFields.forEach((field) => {
    if (!shippingData[field] || shippingData[field].trim() === "") {
      // Use "ZIP code" instead of "postcode" for better user experience
      const fieldName =
        field === "postcode" ? "ZIP code" : field.replace("_", " ");
      errors.push({
        field: `shipping_${field}`,
        message: `Shipping ${fieldName} is required`,
      });
    }
  });

  // Validate field formats if values exist
  if (shippingData.first_name) {
    const firstNameValidation = validateField("name", shippingData.first_name);
    if (!firstNameValidation.isValid) {
      errors.push({
        field: "shipping_first_name",
        message: firstNameValidation.message,
      });
    }
  }

  if (shippingData.last_name) {
    const lastNameValidation = validateField("name", shippingData.last_name);
    if (!lastNameValidation.isValid) {
      errors.push({
        field: "shipping_last_name",
        message: lastNameValidation.message,
      });
    }
  }

  if (shippingData.address_1) {
    const addressValidation = validateField("address", shippingData.address_1);
    if (!addressValidation.isValid) {
      errors.push({
        field: "shipping_address_1",
        message: addressValidation.message,
      });
    }
  }

  if (shippingData.city) {
    const cityValidation = validateField("city", shippingData.city);
    if (!cityValidation.isValid) {
      errors.push({
        field: "shipping_city",
        message: cityValidation.message,
      });
    }
  }

  if (shippingData.postcode) {
    const postalValidation = validateField(
      "postalCode",
      shippingData.postcode,
      shippingData.country
    );
    if (!postalValidation.isValid) {
      errors.push({
        field: "shipping_postcode",
        message: postalValidation.message,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate payment data
 * @param {object} paymentData - Payment data including card info
 * @param {boolean} useSavedCard - Whether using a saved card
 * @returns {object} - Validation result with errors array
 */
export const validatePaymentData = (paymentData, useSavedCard = false) => {
  const errors = [];

  // If using saved card, only validate CVV if provided
  if (useSavedCard) {
    if (paymentData.cardCVD) {
      const cvvValidation = validateField("cvv", paymentData.cardCVD);
      if (!cvvValidation.isValid) {
        errors.push({
          field: "cardCVD",
          message: cvvValidation.message,
        });
      }
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate new card data
  const requiredFields = [
    "cardNumber",
    "cardExpMonth",
    "cardExpYear",
    "cardCVD",
  ];

  requiredFields.forEach((field) => {
    if (!paymentData[field] || paymentData[field].toString().trim() === "") {
      errors.push({
        field,
        message: `${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} is required`,
      });
    }
  });

  // Validate card number format - DISABLED
  // if (paymentData.cardNumber) {
  //   const cardValidation = validateField(
  //     "cardNumber",
  //     paymentData.cardNumber.toString()
  //   );
  //   if (!cardValidation.isValid) {
  //     errors.push({
  //       field: "cardNumber",
  //       message: cardValidation.message,
  //     });
  //   }

  //   // Additional Luhn algorithm check
  //   if (
  //     cardValidation.isValid &&
  //     !isValidCardNumber(paymentData.cardNumber.toString())
  //   ) {
  //     errors.push({
  //       field: "cardNumber",
  //       message: "Invalid card number",
  //     });
  //   }
  // }

  // Validate CVV
  if (paymentData.cardCVD) {
    const cvvValidation = validateField("cvv", paymentData.cardCVD.toString());
    if (!cvvValidation.isValid) {
      errors.push({
        field: "cardCVD",
        message: cvvValidation.message,
      });
    }
  }

  // Validate expiry date
  if (paymentData.cardExpMonth && paymentData.cardExpYear) {
    const month = parseInt(paymentData.cardExpMonth);
    const year = parseInt(paymentData.cardExpYear);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (month < 1 || month > 12) {
      errors.push({
        field: "cardExpMonth",
        message: "Invalid expiry month",
      });
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      errors.push({
        field: "cardExpYear",
        message: "Card has expired",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Luhn algorithm for card number validation - DISABLED
 * @param {string} cardNumber - Card number to validate
 * @returns {boolean} - Whether the card number is valid
 */
// const isValidCardNumber = (cardNumber) => {
//   // Remove spaces and non-digits
//   const cleanNumber = cardNumber.replace(/\D/g, "");

//   if (cleanNumber.length < 13 || cleanNumber.length > 19) {
//     return false;
//   }

//   let sum = 0;
//   let isEven = false;

//   // Process digits from right to left
//   for (let i = cleanNumber.length - 1; i >= 0; i--) {
//     let digit = parseInt(cleanNumber[i]);

//     if (isEven) {
//       digit *= 2;
//       if (digit > 9) {
//         digit -= 9;
//       }
//     }

//     sum += digit;
//     isEven = !isEven;
//   }

//   return sum % 10 === 0;
// };

/**
 * Comprehensive checkout data validation
 * @param {object} checkoutData - Complete checkout data object
 * @returns {object} - Validation result with overall validity and all errors
 */
export const validateCheckoutData = (checkoutData) => {
  logger.log("Validating checkout data:", checkoutData);

  const allErrors = [];

  // Validate billing address
  const billingValidation = validateBillingAddress(
    checkoutData.billing_address
  );
  if (!billingValidation.isValid) {
    allErrors.push(...billingValidation.errors);
  }

  // Validate shipping address if shipping to different address
  const shippingValidation = validateShippingAddress(
    checkoutData.shipping_address,
    checkoutData.shipping_address?.ship_to_different_address
  );
  if (!shippingValidation.isValid) {
    allErrors.push(...shippingValidation.errors);
  }

  // Validate payment data
  const paymentValidation = validatePaymentData(
    {
      cardNumber: checkoutData.cardNumber,
      cardExpMonth: checkoutData.cardExpMonth,
      cardExpYear: checkoutData.cardExpYear,
      cardCVD: checkoutData.cardCVD,
    },
    checkoutData.useSavedCard
  );
  if (!paymentValidation.isValid) {
    allErrors.push(...paymentValidation.errors);
  }

  const isValid = allErrors.length === 0;

  logger.log("Checkout validation result:", {
    isValid,
    errorCount: allErrors.length,
    errors: allErrors,
  });

  return {
    isValid,
    errors: allErrors,
    billingValid: billingValidation.isValid,
    shippingValid: shippingValidation.isValid,
    paymentValid: paymentValidation.isValid,
  };
};

/**
 * Format validation errors for display
 * @param {array} errors - Array of validation errors
 * @returns {string} - Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || errors.length === 0) {
    return "";
  }

  if (errors.length === 1) {
    return errors[0].message;
  }

  const errorMessages = errors.map((error) => error.message);
  const lastError = errorMessages.pop();
  return `${errorMessages.join(", ")} and ${lastError}`;
};

export default {
  validateField,
  validateBillingAddress,
  validateShippingAddress,
  validatePaymentData,
  validateCheckoutData,
  formatValidationErrors,
};
