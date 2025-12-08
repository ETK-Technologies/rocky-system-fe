"use client";
import { logger } from "@/utils/devLogger";
import CustomImage from "@/components/utils/CustomImage";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/cart/cartService";
import QuestionnaireNavbar from "./QuestionnaireNavbar";
import FloatLabelInput from "./FloatLabelInput";
import PostCanadaAddressAutocomplete from "@/components/convert_test/PostCanadaAddressAutocompelete";
import Loader from "@/components/Loader";
import { getSessionId } from "@/services/sessionService";

const CheckoutForm = ({
  handleCheckoutContinue = () => {},
  isOpen = true,
  showAuth,
  setShowAuth,
}) => {
  if (!isOpen) return null;

  const [formValues, setFormValues] = useState({
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    phone: "",
    _meta_discreet: false,
    _meta_mail_box: false,
    country: "Canada",
    // ensure controlled inputs start with defined values
    customer_note: "",
    getUpdates: false,
    email: "",
    password: "",
    date_of_birth: "",
  });
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);
  const [errors, setErrors] = useState({});

  const handleBillingAddressChange = (e, fromAutocomplete = false) => {
    const { name, value } = e.target;

    setFormValues((prev) => {
      // Update both the nested billing_address and the top-level mirror fields
      const nextBilling = {
        ...(prev.billing_address || {}),
        [name]: value,
      };

      // Mirror certain address fields to the top-level for compatibility
      const mirrorFields = [
        "address_1",
        "address_2",
        "city",
        "postcode",
        "state",
        "country",
      ];
      const topLevelUpdate = mirrorFields.includes(name)
        ? { [name === "address_1" ? "address_1" : name]: value }
        : {};

      return {
        ...prev,
        ...topLevelUpdate,
        billing_address: nextBilling,
      };
    });

    // Check for Quebec restriction when province changes
    if (name === "state" && onProvinceChange) {
      // Pass shouldClearFields as false when coming from autocomplete
      onProvinceChange(value, "billing", !fromAutocomplete);
    }
  };

  // Called when the PostGrid address autocomplete returns a selected address
  const handleAddressSelected = (address) => {
    try {
      // Map common PostGrid fields to form values
      logger.log("selecteeeed Address ->", address);
      const normalized = {
        address_1: address.address_1 || address.street || "",
        address_2: address.address_2 || address.unit || "",
        city: address.city || address.locality || "",
        state: address.state || address.province || address.region || "",
        postcode: address.postal_code || address.postcode || "",
        country: address.country || "CA",
      };

      setFormValues((prev) => ({
        ...prev,
        ...normalized,
        billing_address: {
          ...(prev.billing_address || {}),
          ...normalized,
        },
      }));

      // Trigger province/change handling without clearing fields
      const province = normalized.state;
      if (province) onProvinceChange(province, "billing", false);
    } catch (e) {
      logger.error("handleAddressSelected error:", e);
    }
  };

  // Called when province changes (billing or shipping). Performs server-side
  // update so shipping/taxes can be recalculated (mirrors original checkout flow).
  const onProvinceChange = async (
    province,
    type = "billing",
    shouldClearFields = true
  ) => {
    // Update local state immediately
    setFormValues((prev) => {
      if (type === "billing") {
        return {
          ...prev,
          state: province,
          billing_address: {
            ...(prev.billing_address || {}),
            state: province,
          },
        };
      }
      return {
        ...prev,
        shipping_address: {
          ...(prev.shipping_address || {}),
          state: province,
        },
      };
    });

    // Build customer payload from current formValues (best-effort)
    if (isAuthenticated()) {
      try {
        setIsUpdatingShipping(true);
        const billing = {
          first_name: formValues.first_name || "",
          last_name: formValues.last_name || "",
          address_1:
            (type === "billing"
              ? formValues.address_1
              : formValues.address_1) || "",
          address_2: formValues.address_2 || "",
          city: formValues.city || "",
          state: province || formValues.state || "",
          postcode: formValues.postcode || "",
          country: formValues.country || "CA",
        };

        const shipping = {
          first_name: formValues.first_name || "",
          last_name: formValues.last_name || "",
          address_1: formValues.address_1 || "",
          address_2: formValues.address_2 || "",
          city: formValues.city || "",
          state:
            type === "shipping"
              ? province || formValues.state || ""
              : formValues.state || "",
          postcode: formValues.postcode || "",
          country: formValues.country || "CA",
        };

        // Note: /api/cart/update-customer has been removed
        // Shipping rates are calculated via /api/shipping/calculate-by-cart
        // Cart update is no longer needed as shipping is calculated separately
        // (left intentionally minimal to preserve existing design)
      } catch (e) {
        logger.error("Error updating customer on province change:", e);
        toast.error("Failed to update shipping. Please try again.");
      } finally {
        setIsUpdatingShipping(false);
      }
    }
  };

  // Function to fetch user profile data
  const fetchUserProfile = async () => {
    try {
      // Always fetch fresh data for checkout to ensure latest billing info
      let profileData = null;

      // If user is authenticated, fetch fresh profile data
      if (isAuthenticated()) {
        logger.log("User is authenticated, fetching fresh profile data");
        try {
          const res = await fetch("/api/profile", {
            // Prevent browser caching
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });
          const data = await res.json();
          if (data && data.success) {
            profileData = data;
            logger.log("Fetched fresh profile data from API:", data);
          } else {
            logger.log("Profile API returned no data or not logged in");
          }
        } catch (e) {
          logger.error("Error fetching profile from API:", e);
        }
      }

      // If we have profile data, populate form values
      if (profileData) {
        // Try to extract display name cookies if present
        const cookies =
          typeof document !== "undefined"
            ? document.cookie.split(";").reduce((cookies, cookie) => {
                const [name, value] = cookie.trim().split("=");
                cookies[name] = value;
                return cookies;
              }, {})
            : {};

        const storedFirstName = decodeURIComponent(cookies.displayName || "");
        const storedUserName = decodeURIComponent(cookies.userName || "");

        setFormValues((prev) => {
          const prevBilling = prev.billing_address || {};
          const prevShipping = prev.shipping_address || {};

          const updatedBillingAddress = {
            ...prevBilling,
            first_name:
              storedFirstName ||
              profileData.first_name ||
              prevBilling.first_name ||
              "",
            last_name: storedUserName
              ? decodeURIComponent(storedUserName)
                  .replace(storedFirstName, "")
                  .trim()
              : profileData.last_name || prevBilling.last_name || "",
            email: profileData.email || prevBilling.email || "",
            phone: profileData.phone || prevBilling.phone || "",
            address_1:
              profileData.billing_address_1 || prevBilling.address_1 || "",
            address_2:
              profileData.billing_address_2 || prevBilling.address_2 || "",
            city: profileData.billing_city || prevBilling.city || "",
            state:
              profileData.billing_state ||
              profileData.province ||
              prevBilling.state ||
              "",
            postcode:
              profileData.billing_postcode || prevBilling.postcode || "",
            country: profileData.billing_country || "CA",
            date_of_birth:
              profileData.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };

          const updatedShippingAddress = {
            ...prevShipping,
            first_name:
              storedFirstName ||
              profileData.first_name ||
              prevShipping.first_name ||
              "",
            last_name: storedUserName
              ? decodeURIComponent(storedUserName)
                  .replace(storedFirstName, "")
                  .trim()
              : profileData.last_name || prevShipping.last_name || "",
            phone: profileData.phone || prevShipping.phone || "",
            address_1:
              profileData.shipping_address_1 ||
              profileData.billing_address_1 ||
              prevShipping.address_1 ||
              "",
            address_2:
              profileData.shipping_address_2 ||
              profileData.billing_address_2 ||
              prevShipping.address_2 ||
              "",
            city:
              profileData.shipping_city ||
              profileData.billing_city ||
              prevShipping.city ||
              "",
            state:
              profileData.shipping_state ||
              profileData.billing_state ||
              profileData.province ||
              prevShipping.state ||
              "",
            postcode:
              profileData.shipping_postcode ||
              profileData.billing_postcode ||
              prevShipping.postcode ||
              "",
            country: profileData.shipping_country || "CA",
            date_of_birth:
              profileData.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };

          const mappedTopLevel = {
            first_name:
              prev.first_name ||
              storedFirstName ||
              profileData.first_name ||
              "",
            last_name:
              prev.last_name ||
              (storedUserName
                ? decodeURIComponent(storedUserName)
                    .replace(storedFirstName, "")
                    .trim()
                : profileData.last_name) ||
              "",
            email: prev.email || profileData.email || "",
            phone: prev.phone || profileData.phone || "",
            address_1:
              prev.address_1 ||
              profileData.billing_address_1 ||
              profileData.shipping_address_1 ||
              "",
            address_2:
              prev.address_2 ||
              profileData.billing_address_2 ||
              profileData.shipping_address_2 ||
              "",
            city:
              prev.city ||
              profileData.billing_city ||
              profileData.shipping_city ||
              "",
            state:
              prev.state ||
              profileData.billing_state ||
              profileData.shipping_state ||
              profileData.province ||
              "",
            postcode:
              prev.postcode ||
              profileData.billing_postcode ||
              profileData.shipping_postcode ||
              "",
            date_of_birth:
              prev.date_of_birth ||
              profileData.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };

          logger.log(
            "Updated billing address with DOB:",
            updatedBillingAddress
          );

          return {
            ...prev,
            ...mappedTopLevel,
            billing_address: updatedBillingAddress,
            shipping_address: updatedShippingAddress,
            date_of_birth:
              mappedTopLevel.date_of_birth ||
              profileData.raw_profile_data?.custom_meta?.date_of_birth ||
              "",
          };
        });
      }
    } catch (error) {
      logger.error("Error fetching user profile:", error);
    }
  };

  // Run profile fetch on client mount to populate form values for authenticated users
  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      try {
        // Ensure profile data is loaded first so it can take precedence
        await fetchUserProfile();
      } catch (e) {
        logger.error("fetchUserProfile error:", e);
      }

      const data_with_product =
        JSON.parse(localStorage.getItem("quiz_and_selected_product")) || {};
      logger.log("data is ->", data_with_product);

      // Merge stored values into existing form state without overwriting profile populated fields.
      // We read the current state via functional setFormValues and prefer existing `prev` values
      // (which may have been populated by fetchUserProfile) over the stored quiz values.
      setFormValues((prev) => {
        const merged = {
          first_name: prev.first_name || data_with_product.firstName || "",
          last_name: prev.last_name || data_with_product.lastName || "",
          email: prev.email || data_with_product.email || "",
          password: prev.password || data_with_product.password || "",
          phone: prev.phone || data_with_product.phone || "",
          address_1: prev.address_1 || data_with_product.address_1 || "",
          address_2: prev.address_2 || data_with_product.address_2 || "",
          city: prev.city || data_with_product.city || "",
          state: data_with_product.province || prev.state || "",
          postcode: prev.postcode || data_with_product.postcode || "",
          country: prev.country || data_with_product.country || "",
          date_of_birth:
            prev.date_of_birth || data_with_product.dateOfBirth || "",
          customer_note: prev.customer_note ?? "",
          getUpdates: prev.getUpdates ?? false,
          _meta_discreet: prev._meta_discreet ?? false,
          _meta_mail_box: prev._meta_mail_box ?? false,
          billing_address: prev.billing_address ?? null,
          shipping_address: prev.shipping_address ?? null,
        };

        return {
          ...prev,
          ...merged,
        };
      });

      // ensure product is always defined or null
      setProduct(data_with_product.selected_product ?? null);
    })();
    // intentionally empty deps: run once on mount
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(showAuth || false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const router = useRouter();

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues((s) => ({
      ...s,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validation helpers
  const validateRequired = (name, value) => {
    if (value == null || String(value).trim() === "") {
      return "This field is required";
    }
    return "";
  };

  const validateCanadianPhone = (value) => {
    if (!value) return "This field is required";
    return "";
  };

  const validateField = (name, value) => {
    // Optional fields: customer note and checkboxes
    if (
      name === "customer_note" ||
      name === "_meta_discreet" ||
      name === "_meta_mail_box" ||
      name === "getUpdates"
    ) {
      return "";
    }
    if (name === "phone") {
      return validateCanadianPhone(value);
    }
    // All other fields required
    return validateRequired(name, value);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let newVal = value;
    if (name === "phone") {
      newVal = value;
      // update formatted value
      setFormValues((s) => ({ ...s, [name]: newVal }));
    }
    const err = validateField(name, newVal);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  // Extracted submit handler so it can be reused or tested
  const handleFormSubmit = async (e, passFromLogin = false) => {
    try {
      if (e && typeof e.preventDefault === "function") e.preventDefault();

      // validate all required fields
      const toValidate = [
        "first_name",
        "last_name",
        "address_1",
        "city",
        "state",
        "postcode",
        "phone",
      ];
      const newErrors = {};
      toValidate.forEach((n) => {
        const err = validateField(n, formValues[n]);
        if (err) newErrors[n] = err;
      });

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        // focus first invalid field optionally
        const firstInvalid = Object.keys(newErrors)[0];
        const el = document.getElementsByName(firstInvalid)[0];
        if (el && typeof el.focus === "function") el.focus();
        return;
      }

      setSubmitting(true);
      try {
        // expect handleCheckoutContinue to return a promise
        const res = await handleCheckoutContinue(formValues, passFromLogin);
        // Parent returns an object when credentials are required
        if (res && res.needCredentials) {
          // open modal and prefill email/password from form values
          setAuthEmail(formValues.email || "");
          setAuthPassword(formValues.password || "");
          setShowAuthModal(true);
        }
      } catch (err) {
        logger.error(err);
      } finally {
        setSubmitting(false);
      }
    } catch (err) {
      logger.error("handleFormSubmit error:", err);
    }
  };

  // Can continue: all required fields valid, not currently updating shipping, and not submitting
  const canContinue = React.useMemo(() => {
    try {
      const required = [
        "first_name",
        "last_name",
        "address_1",
        "city",
        "state",
        "postcode",
        "phone",
      ];
      // If any required value is missing -> cannot continue
      for (const k of required) {
        const v = formValues[k];
        if (v == null || String(v).trim() === "") return false;
        // Also check field-level validator
        const err = validateField(k, v);
        if (err) return false;
      }
      // also ensure no pending shipping update
      if (isUpdatingShipping) return false;
      // form not currently submitting
      if (submitting) return false;
      return true;
    } catch (e) {
      return false;
    }
  }, [formValues, isUpdatingShipping, submitting]);

  // derive product display values (single source)
  const productName = product?.name || "";
  const productDose = product?.dose || "";
  const productImage = product?.image || "";

  return (
    <div className=" flex flex-col tracking-tight">
      <div className="flex justify-center items-center">
        <QuestionnaireNavbar />
      </div>

      {loading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-30">
          <Loader />
        </div>
      )}

      <div className="w-[100%] md:p-5 mt-5 min-h-fit mx-auto pb-4 flex flex-col items-center h-full">
        <div className="w-full max-w-[500px] p-2">
          <div className="bg-[#F6F6F6] flex justify-between items-center h-[72px] rounded-lg p-[24px] mb-[28px]">
            <div>
              <p className="text-[16px] leading-[140%]">{productName}</p>
              {productDose ? (
                <p className="text-[13px] text-[#757575]">
                  Dose: {productDose}
                </p>
              ) : null}
            </div>
            <div>
              {productImage ? (
                <CustomImage
                  src={productImage}
                  width="100"
                  height="100"
                  className="w-[57px] h-[75px]"
                />
              ) : (
                <div className="w-[57px] h-[75px] bg-gray-100 flex items-center justify-center rounded"></div>
              )}
            </div>
          </div>

          <div className="mb-[28px]">
            <h2 className="subheaders-font text-[24px] leading-[120%] tracking-tight font-[450] mb-[16px]">
              If you’re prescribed treatment, where should we send it?
            </h2>
            <p className="text-[16px] leading-[140%] text-[#AE7E56]">
              Shipping is free and always comes in discreet packaging.
            </p>

            {/* form */}
            <div>
              <form onSubmit={handleFormSubmit} className="pt-4">
                <div className="grid grid-cols-1 gap-4">
                  <input type="hidden" name="email" value={formValues.email} />
                  <input
                    type="hidden"
                    name="password"
                    value={formValues.password}
                  />

                  <FloatLabelInput
                    label="First Name"
                    name="first_name"
                    value={formValues.first_name}
                    onChange={onChange}
                    onBlur={handleBlur}
                    required={true}
                    disabled={false}
                    readonly={false}
                    error={errors.first_name}
                  />

                  <FloatLabelInput
                    label="Last name (legal)"
                    name="last_name"
                    value={formValues.last_name}
                    onChange={onChange}
                    onBlur={handleBlur}
                    error={errors.last_name}
                  />

                  <div className="relative">
                    <PostCanadaAddressAutocomplete
                      title="Street address"
                      name="address_1"
                      value={formValues.address_1}
                      placeholder=""
                      required
                      disabled={isUpdatingShipping}
                      onChange={handleBillingAddressChange}
                      onAddressSelected={handleAddressSelected}
                    />
                  </div>

                  <FloatLabelInput
                    label="Apt/Suite"
                    name="address_2"
                    value={formValues.address_2}
                    onChange={onChange}
                    onBlur={handleBlur}
                    error={errors.address_2}
                  />

                  <FloatLabelInput
                    label="City"
                    name="city"
                    value={formValues.city}
                    onChange={onChange}
                    onBlur={handleBlur}
                    error={errors.city}
                  />

                  <div className="relative">
                    <select
                      id="state"
                      name="state"
                      value={formValues.state}
                      onChange={onChange}
                      className="text-[14px] appearance-none text-black w-full h-[60px] border border-[#0000001F] rounded-lg px-2  bg-white focus:outline-none"
                    >
                      <option value="" disabled>
                        Province
                      </option>
                      <option value="AB">Alberta</option>
                      <option value="BC">British Columbia</option>
                      <option value="MB">Manitoba</option>
                      <option value="NB">New Brunswick</option>
                      <option value="NL">Newfoundland & Labrador</option>
                      <option value="NS">Nova Scotia</option>
                      <option value="ON">Ontario</option>

                      <option value="QC">Quebec</option>
                      <option value="SK">Saskatchewan</option>

                      <option value="NU">Nunavut</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>

                  <FloatLabelInput
                    label="Post code"
                    name="postcode"
                    value={formValues.postcode}
                    onChange={onChange}
                    onBlur={handleBlur}
                    error={errors.postcode}
                  />

                  <FloatLabelInput
                    label="Country/Region"
                    name="country"
                    value={formValues.country || "Canada"}
                    readonly={true}
                    disabled={true}
                    onChange={() => {}}
                    onBlur={handleBlur}
                    error={errors.country}
                  />

                  <FloatLabelInput
                    label="Phone"
                    name="phone"
                    value={formValues.phone}
                    onChange={onChange}
                    onBlur={handleBlur}
                    error={errors.phone}
                  />
                </div>

                <label
                  htmlFor="_meta_discreet"
                  className={`delivery-option mt-4 flex items-start border border-solid ${
                    formValues._meta_discreet
                      ? "border-[#000000] border-[2px]"
                      : "border-[#E2E2E1]"
                  } rounded-[8px] md:py-4 p-[16px] gap-[4px] cursor-pointer mb-2`}
                >
                  <div>
                    <input
                      type="checkbox"
                      name="_meta_discreet"
                      id="_meta_discreet"
                      className="checkbox-button mb-[2px] md:mb-[5px] w-[14px] h-[14px] rounded-full focus:outline-none "
                      onChange={onChange}
                      checked={formValues._meta_discreet}
                    />
                  </div>

                  <div className="flex-1">
                    <div
                      htmlFor="_meta_discreet"
                      className="block text-[14px] leading-[19.6px] font-[500] text-[#000000] mb-[4px]"
                    >
                      Discreet Delivery{" "}
                      <span className="text-[12px] leading-[16.8px] text-[#000000]">
                        (Optional)
                      </span>
                    </div>
                    <p className="text-[12px] text-[400] leading-[16.8px] text-[#212121]">
                      Discreet packaging, with no mention of the contents or
                      where it is from.
                    </p>
                  </div>
                  <div className="w-[70px] h-[70px] relative">
                    <Image
                      decoding="async"
                      className="w-[70px] h-[70px] object-cover rounded-[12px]"
                      src="/delivery.jpg"
                      alt="Discreet Packaging"
                      fill
                    />
                  </div>
                </label>

                <label
                  htmlFor="_meta_mail_box"
                  className={`delivery-option mt-4 flex items-start border border-solid ${
                    formValues._meta_mail_box
                      ? "border-[#000000] border-[2px]"
                      : "border-[#E2E2E1]"
                  } rounded-[8px] md:py-4 p-[16px] gap-[4px] cursor-pointer mb-2`}
                >
                  <div>
                    <input
                      type="checkbox"
                      name="_meta_mail_box"
                      id="_meta_mail_box"
                      className="checkbox-button mb-[2px] md:mb-[5px] w-[14px] h-[14px] rounded-full focus:outline-none "
                      onChange={onChange}
                      checked={formValues._meta_mail_box}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="block text-[14px] leading-[19.6px] font-[500] text-[#000000]">
                      Deliver to Mailbox{" "}
                      <span className="text-[12px] leading-[16.8px] text-[#000000]">
                        (Optional)
                      </span>
                    </div>
                    <p className="text-[12px] text-[400] leading-[16.8px] text-[#212121] ">
                      I hereby consent to having my order delivered to my
                      mailbox without requiring my signature.
                    </p>
                  </div>
                  <div className="w-[70px] h-[70px] relative">
                    <Image
                      decoding="async"
                      className="w-[70px] h-[70px] object-cover rounded-[12px]"
                      src="/mailbox.jpg"
                      alt="Mailbox Delivery"
                      fill
                    />
                  </div>
                </label>

                <FloatLabelInput
                  label={
                    "Notes about your order, e.g. special notes for delivery"
                  }
                  name="customer_note"
                  value={formValues.customer_note}
                  onChange={onChange}
                  className="h-[80px]"
                />

                <div className="relative flex justify-start items-start md:items-center mt-[24px] gap-[8px]">
                  <input
                    type="checkbox"
                    name="getUpdates"
                    onChange={onChange}
                    checked={!!formValues.getUpdates}
                    className="w-[24px] h-[24px] rounded-sm"
                  />
                  <p className="text-xs md:text-[14px] font-medium leading-[140%] text-[#757575]">
                    Text me updates about Rocky products and services
                  </p>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-black h-[52px] text-white py-3  font-medium disabled:opacity-70"
                    disabled={!canContinue}
                  >
                    {submitting ? "Processing..." : "Save and continue"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Simple login modal shown when registration indicates email exists */}
          {showAuth && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white p-6 rounded max-w-md w-full m-2">
                <h3 className="text-lg font-medium mb-4">
                  Account found — sign in
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We found an account with this email. Please enter your
                  password to continue.
                </p>
                <div className="space-y-3">
                  <FloatLabelInput
                    label="Email"
                    name="auth_email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    type="email"
                  />

                  <FloatLabelInput
                    label="Password"
                    name="auth_password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    type="password"
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex-1 bg-black text-white py-2 rounded"
                      onClick={async () => {
                        // attempt login
                        try {
                          setLoading(true);
                          
                          // Get sessionId from localStorage for guest cart merging
                          const sessionId = getSessionId();
                          
                          const requestBody = {
                            email: authEmail,
                            password: authPassword,
                          };
                          
                          // Include sessionId if available
                          if (sessionId) {
                            requestBody.sessionId = sessionId;
                          }
                          
                          const res = await fetch("/api/login", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(requestBody),
                          });
                          
                          const data = await res.json();
                          
                          if (res.ok && data.success) {
                            toast.success("Logged in successfully");

                            // Re-fetch profile data and refresh the router so UI reflects authenticated state
                            try {
                              await fetchUserProfile();
                            } catch (e) {
                              logger.error(
                                "fetchUserProfile after login failed:",
                                e
                              );
                            }

                            try {
                              // trigger a Next.js router refresh to update any server components
                              if (
                                router &&
                                typeof router.refresh === "function"
                              )
                                router.refresh();
                            } catch (e) {
                              logger.error("router.refresh failed:", e);
                            }

                            // close modal and immediately continue the flow (no arbitrary timeout)
                            setShowAuth(false);
                            // proceed with submit flow, indicating this came from a login
                            handleFormSubmit(null, true);
                          } else {
                            const msg =
                              (data?.error || data?.message) ||
                              "Login failed";
                            toast.error(msg);
                          }
                        } catch (e) {
                          logger.error(e);
                          toast.error("Login failed. Please try again.");
                        } finally {
                          setLoading(false);
                          setShowAuth(false);
                        }
                      }}
                    >
                      Sign in
                    </button>

                    <button
                      className="flex-1 border py-2 rounded"
                      onClick={() => setShowAuth(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-[#00000059] leading-[150%] font-medium mt-4">
            We respect your privacy. All of your information is securely stored
            on our HIPAA Compliant server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;
