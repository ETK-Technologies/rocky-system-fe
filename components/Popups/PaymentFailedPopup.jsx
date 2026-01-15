"use client";

import { useEffect } from "react";

const PaymentFailedPopup = ({ isOpen, onClose, onTryAgain, errorMessage }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Error Icon */}
        <div className="mx-auto mb-6 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-red-600 mb-4 text-center">
          Payment Failed
        </h3>

        {/* Message */}
        <p className="text-gray-700 mb-8 text-center">
          {errorMessage ||
            "Invalid payment request. Please check your details and try again."}
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onTryAgain}
            className="flex-1 bg-black text-white py-3 px-6 rounded-full font-medium text-lg hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-full font-medium text-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailedPopup;
