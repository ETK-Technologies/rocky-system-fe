"use client";

import { useState, useEffect } from "react";
import { logger } from "@/utils/devLogger";
import { toast } from "react-toastify";

const SavedPaymentMethods = ({
  onSelectPaymentMethod,
  selectedPaymentMethodId,
}) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchSavedPaymentMethods();
  }, []);

  const fetchSavedPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/stripe/payment-methods");
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
        logger.log("Saved payment methods fetched:", data.paymentMethods);
      } else {
        setError(data.message || "Failed to fetch saved payment methods");
        logger.error("Error fetching payment methods:", data.message);
      }
    } catch (err) {
      logger.error("Error fetching saved payment methods:", err);
      setError("Failed to load saved payment methods");
    } finally {
      setLoading(false);
    }
  };

  const formatCardBrand = (brand) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatExpiry = (month, year) => {
    if (!month || !year) return "";
    const formattedMonth = month.toString().padStart(2, "0");
    const formattedYear = year.toString().slice(-2);
    return `${formattedMonth}/${formattedYear}`;
  };

  // Get card brand icon component
  const getCardBrandIcon = (brand) => {
    const normalizedBrand = brand?.toLowerCase() || "";
    
    switch (normalizedBrand) {
      case "visa":
        return (
          <div className="w-10 h-6 bg-[#1434CB] rounded flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">VISA</span>
          </div>
        );
      case "mastercard":
        return (
          <div className="w-10 h-6 bg-gradient-to-r from-[#EB001B] to-[#F79E1B] rounded flex items-center justify-center">
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-3 rounded-full bg-[#EB001B]"></div>
              <div className="w-3 h-3 rounded-full bg-[#F79E1B] ml-[-6px]"></div>
            </div>
          </div>
        );
      case "amex":
      case "american_express":
        return (
          <div className="w-10 h-6 bg-[#006FCF] rounded flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">AMEX</span>
          </div>
        );
      case "discover":
        return (
          <div className="w-10 h-6 bg-[#FF6000] rounded flex items-center justify-center">
            <span className="text-white text-[7px] font-bold">DISCOVER</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-6 bg-gray-300 rounded flex items-center justify-center">
            <span className="text-gray-600 text-[9px] font-semibold">CARD</span>
          </div>
        );
    }
  };

  const handleSelect = (paymentMethodId) => {
    if (onSelectPaymentMethod) {
      onSelectPaymentMethod(paymentMethodId);
    }
  };

  const handleRemove = async (e, paymentMethodId) => {
    e.stopPropagation(); // Prevent card selection when clicking remove button

    if (!confirm("Are you sure you want to remove this payment method?")) {
      return;
    }

    try {
      setDeletingId(paymentMethodId);
      const response = await fetch("/api/stripe/payment-methods", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove the payment method from the list
        setPaymentMethods((prev) =>
          prev.filter((pm) => pm.id !== paymentMethodId)
        );
        toast.success("Payment method removed successfully");

        // If the removed card was selected, switch to "Add new card"
        if (selectedPaymentMethodId === paymentMethodId) {
          handleSelect("new");
        }

        logger.log("Payment method removed:", paymentMethodId);
      } else {
        throw new Error(data.message || "Failed to remove payment method");
      }
    } catch (err) {
      logger.error("Error removing payment method:", err);
      toast.error(err.message || "Failed to remove payment method");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
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
          Loading saved cards...
        </div>
      </div>
    );
  }

  if (error && paymentMethods.length === 0) {
    // Only show error if we have no saved methods
    // If we have methods, error might be non-critical
    return (
      <div className="mb-4 text-sm text-gray-600">
        <p>{error}</p>
      </div>
    );
  }

  // If no saved payment methods, show only "Add new card" option
  if (paymentMethods.length === 0) {
    return (
      <div className="mb-4">
        <div
          className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedPaymentMethodId === "new"
              ? "border-black bg-gray-50"
              : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
          onClick={() => handleSelect("new")}
        >
          <input
            type="radio"
            id="new-card"
            name="payment-method"
            value="new"
            checked={selectedPaymentMethodId === "new"}
            onChange={() => handleSelect("new")}
            className="sr-only"
          />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <label
              htmlFor="new-card"
              className="flex-1 cursor-pointer text-sm font-medium text-gray-900"
            >
              Add new card
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-[#251F20] mb-4">
        Select Payment Method
      </label>
      <div className="space-y-3">
        {/* Saved payment methods */}
        {paymentMethods.map((pm) => {
          const isSelected = selectedPaymentMethodId === pm.id;
          return (
            <div
              key={pm.id}
              className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "border-black bg-gray-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              onClick={() => handleSelect(pm.id)}
            >
              <input
                type="radio"
                id={`payment-method-${pm.id}`}
                name="payment-method"
                value={pm.id}
                checked={isSelected}
                onChange={() => handleSelect(pm.id)}
                className="sr-only"
              />
              <label
                htmlFor={`payment-method-${pm.id}`}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCardBrandIcon(pm.card.brand)}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCardBrand(pm.card.brand)}
                        </span>
                        <span className="text-sm text-gray-600">
                          •••• {pm.card.last4}
                        </span>
                      </div>
                      {pm.card.exp_month && pm.card.exp_year && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          Expires {formatExpiry(pm.card.exp_month, pm.card.exp_year)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, pm.id)}
                    disabled={deletingId === pm.id}
                    className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove payment method"
                  >
                    {deletingId === pm.id ? (
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
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
            </div>
          );
        })}

        {/* Add new card option */}
        <div
          className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedPaymentMethodId === "new"
              ? "border-black bg-gray-50 shadow-sm"
              : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
          onClick={() => handleSelect("new")}
        >
          <input
            type="radio"
            id="new-card"
            name="payment-method"
            value="new"
            checked={selectedPaymentMethodId === "new"}
            onChange={() => handleSelect("new")}
            className="sr-only"
          />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <label
              htmlFor="new-card"
              className="flex-1 cursor-pointer text-sm font-semibold text-gray-900"
            >
              Add new card
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedPaymentMethods;
