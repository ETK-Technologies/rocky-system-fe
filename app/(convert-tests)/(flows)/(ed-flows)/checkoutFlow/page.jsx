"use client";

import { useEffect, useState } from "react";
import { logger } from "@/utils/devLogger";
import { useRouter } from "next/navigation";
import CheckoutForm from "@/components/convert_test/PreConsultation/components/CheckoutForm";
import { getAwinFromUrlOrStorage } from "@/utils/awin";
import Loader from "@/components/Loader";
import { toast } from "react-toastify";
import {
  isWordPressCriticalError,
  transformPaymentError,
} from "@/utils/paymentErrorHandler";
import { refreshCartNonceClient } from "@/utils/nonceManager";
import { getSavedProducts } from "@/utils/crossSellCheckout";
import { edFlowAddToCart, processSavedFlowProducts } from "@/utils/flowCartHandler";
import { emptyCart } from "@/lib/cart/cartService";

export default function CheckoutPage() {
  const router = useRouter();
  const [payload, setPayload] = useState(null);
  const [formData, setFormData] = useState(() => ({
    additional_fields: [],
    shipping_address: {},
    billing_address: {},
    extensions: {
      "checkout-fields-for-blocks": {
        _meta_discreet: true,
        _meta_mail_box: true,
      },
    },
    payment_method: "bambora_credit_card",
    payment_data: [
      { key: "wc-bambora-credit-card-js-token", value: "" },
      { key: "wc-bambora-credit-card-account-number", value: "" },
      { key: "wc-bambora-credit-card-card-type", value: "" },
      { key: "wc-bambora-credit-card-exp-month", value: "" },
      { key: "wc-bambora-credit-card-exp-year", value: "" },
    ],
  }));

  const handleCrossSellProducts = async (isFromCrossSell = false) => {
    try {
      logger.log(
        `Processing flow products after registration. From cross-sell: ${isFromCrossSell}`
      );

      // First, check for new flow products (direct cart approach)
      // This should always be processed regardless of cross-sell popup origin
      const flowProductsResult = await processSavedFlowProducts();
      if (flowProductsResult.success) {
        logger.log(
          "Processed saved flow products after registration:",
          flowProductsResult
        );
        //return flowProductsResult.redirectUrl;
      }

      // Only process old cross-sell products if NOT from a cross-sell popup
      if (!isFromCrossSell) {
        // Fallback to old cross-sell products (URL-based approach)
        const savedProducts = getSavedProducts();

        if (savedProducts) {
          const products = [
            {
              id: savedProducts.mainProduct.id,
              quantity: 1,
            },
            ...savedProducts.addons.map((addon) => ({
              id: addon.id,
              quantity: 1,
            })),
          ];

          const response = await fetch("/api/cart/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ products }),
          });

          if (!response.ok) {
            logger.error("Failed to add cross-sell products to cart");
          }

          clearSavedProducts();

          return "/checkout?ed-flow=1";
        }
      }
    } catch (error) {
      logger.error("Error handling cross-sell products:", error);
    }

    return null;
  };


  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuthModal] = useState(false);

  const isAuthenticated =
    typeof document !== "undefined"
      ? document.cookie.includes("authToken=")
      : false;

  // Registration logic matching Register.jsx
  const registerUser = async (mergedUserData) => {
    logger.log("Registering user with data:", mergedUserData);
    setLoading(true);

    // Step 1 validation (name, email, password, confirm_password)
    if (!mergedUserData.first_name || !mergedUserData.last_name) {
      toast.error("Please enter your full name");
      setLoading(false);
      return false;
    }
    if (!mergedUserData.email) {
      toast.error("Email address is required");
      setLoading(false);
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(mergedUserData.email)) {
      toast.error("Please enter a valid email address");
      setLoading(false);
      return false;
    }
    if (!mergedUserData.password) {
      toast.error("Password is required");
      setLoading(false);
      return false;
    }
    if (mergedUserData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return false;
    }

    // Step 2 validation (phone, dob, province, gender)
    if (!mergedUserData.phone) {
      toast.error("Phone number is required");
      setLoading(false);
      return false;
    }
    if (!mergedUserData.date_of_birth) {
      toast.error("Date of birth is required");
      setLoading(false);
      return false;
    }
    if (!mergedUserData.state && !mergedUserData.province) {
      toast.error("Province is required");
      setLoading(false);
      return false;
    }

    // Format date_of_birth to YYYY-MM-DD if needed
    let formattedDOB = mergedUserData.date_of_birth;
    if (formattedDOB && formattedDOB.includes("/")) {
      const dateParts = formattedDOB.split("/");
      if (dateParts.length === 3) {
        formattedDOB = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
      }
    }

    // Call register API (step 1)
    try {
      const res1 = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: mergedUserData.first_name,
          last_name: mergedUserData.last_name,
          email: mergedUserData.email,
          password: mergedUserData.password,
          register_step: 1,
        }),
      });
      const data1 = await res1.json();
      console.log("Registration step 1 response:", data1);
      if (!res1.ok || !data1.success) {
        // If API indicates email already exists, signal UI to ask for credentials
        const code = data1 && data1.error;
        logger.log("Registration step 1 error code:", code);
        if (
          code === "email_exists" ||
          (data1 && /already/i.test(data1.error || data1.message || ""))
        ) {
          setLoading(false);
          return "error_email_exists";
        }
        setLoading(false);
        return false;
      }

      // Call register API (step 2)
      const res2 = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: mergedUserData.first_name,
          last_name: mergedUserData.last_name,
          email: mergedUserData.email,
          password: mergedUserData.password,
          phone: mergedUserData.phone,
          date_of_birth: formattedDOB,
          province: mergedUserData.state || mergedUserData.province,
          gender: mergedUserData.gender,
          register_step: 2,
        }),
      });
      const data2 = await res2.json();
      if (!res2.ok || !data2.success) {
        toast.error(data2.error || "Step 2 registration failed");
        setLoading(false);
        return false;
      }

      handleCrossSellProducts(true);

      setLoading(false);

      //emptyCart();

      return true;
    } catch (err) {
      toast.error("Registration failed. Please check and try again.");
      setLoading(false);
      logger.error(err);
      return false;
    }
  };

  const handleCheckoutContinue = async (formValues, passFromLogin = false ,options = {}) => {
    // Map CheckoutForm shape to the billing/shipping shape expected by payment page
    // Build mapped billing/shipping structure expected by payment page and server APIs
    const mapped = {
      billing_address: {
        first_name: formValues.first_name || "",
        last_name: formValues.last_name || "",
        address_1: formValues.address_1 || "",
        address_2: formValues.address_2 || "",
        city: formValues.city || "",
        state: formValues.state || "",
        postcode: formValues.postcode || "",
        country: "CA",
        phone: formValues.phone || "",
        email: formValues.email || "",
        date_of_birth: formValues.date_of_birth || formValues.dateOfBirth || "",
      },
      // If user opts to ship to a different address, payment page expects shipping_address
      shipping_address: {
        first_name:
          formValues.shipping_first_name || formValues.first_name || "",
        last_name: formValues.shipping_last_name || formValues.last_name || "",
        address_1: formValues.shipping_address_1 || "",
        address_2: formValues.shipping_address_2 || "",
        city: formValues.shipping_city || "",
        state: formValues.shipping_state || formValues.state || "",
        postcode: formValues.shipping_postcode || formValues.postcode || "",
        country: formValues.shipping_country || "CA",
        phone: formValues.shipping_phone || formValues.phone || "",
        date_of_birth: formValues.shipping_date_of_birth || "",
      },
      ship_to_different_address: !!formValues.ship_to_different_address,
      extensions: {
        "checkout-fields-for-blocks": {
          _meta_discreet: !!formValues._meta_discreet,
          _meta_mail_box: !!formValues._meta_mail_box,
        },
      },
    };

    logger.log("Mapped billing/shipping data:", mapped);

    if (!isAuthenticated && passFromLogin == false) {
      const registered = await registerUser(formValues);
      logger.log("registered result : ->", registered);
      // Pass registration result back to caller so UI can react (e.g. ask for credentials)
      if (registered == false) {
        return registered;
      }

      if (registered == "error_email_exists") {
        setShowAuthModal(true);
        return false;
      }
    }

    await refreshCartNonceClient();

    // Update customer details on server before creating order so shipping/taxes are correct
    try {
      logger.log("form Values", formData);
      const addressData = {
        first_name:
          mapped.shipping_address.first_name ||
          mapped.billing_address.first_name ||
          "",
        last_name:
          mapped.shipping_address.last_name ||
          mapped.billing_address.last_name ||
          "",
        company: mapped.billing_address.company || "",
        address_1: mapped.billing_address.address_1 || "",
        address_2: mapped.billing_address.address_2 || "",
        city: mapped.billing_address.city || "",
        state:
          mapped.billing_address.state || mapped.shipping_address.state || "",
        postcode:
          mapped.billing_address.postcode ||
          mapped.shipping_address.postcode ||
          "",
        country: "CA",
      };
      const customerPayload = {
        billing_address: mapped.billing_address || {},
        shipping_address: addressData || {},
      };

      emptyCart();

      const dataForCart = localStorage.getItem("ed_cart_data");
      if (dataForCart) {
        const parsedData = JSON.parse(dataForCart);
        const result = await edFlowAddToCart(parsedData.mainProduct, parsedData.addons, {
          requireConsultation: parsedData.requireConsultation,
          varietyPackId: parsedData.varietyPackId,
        });

        if(!result.success) {
            logger.log("error in adding to cart");
            toast.error("Failed to add products to cart. Please try again.");
            return;
        }
      }

      logger.log("Customer Payload ->", customerPayload);

      // Note: /api/cart/update-customer has been removed
      // Customer data is now updated via /api/update-customer-profile during checkout
    } catch (e) {
      logger.error("Error updating customer before checkout:", e);
      toast.error("Failed to update customer details. Please try again.");
      setLoading(false);
      return;
    }

    const { awc, channel } = getAwinFromUrlOrStorage();
    if (awc) sessionStorage.setItem("awin_awc", awc);
    if (channel) sessionStorage.setItem("awin_channel", channel);

    // Persist billing and shipping to session so the payment page can read it
    try {
      const billingAndShipping = {
        billing_address: mapped.billing_address,
        shipping_address: mapped.shipping_address || {},
      };
      sessionStorage.setItem(
        "ed_billing_and_shipping",
        JSON.stringify(billingAndShipping)
      );
    } catch (e) {
      logger.error("Failed to persist billing data to sessionStorage:", e);
    }

    router.push("/payment");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {loading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-30">
          <Loader />
        </div>
      )}
      <CheckoutForm
        isOpen={true}
        showAuth={showAuth}
        setShowAuth={setShowAuthModal}
        product={payload || {}}
        userData={null}
        handleCheckoutContinue={handleCheckoutContinue}
        onClose={() => router.back()}
      />
    </div>
  );
}
