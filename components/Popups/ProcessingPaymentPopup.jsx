"use client";

import { useEffect } from "react";

const ProcessingPaymentPopup = ({ isOpen }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        {/* Loading Spinner */}
        <div className="mx-auto mb-6 flex items-center justify-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Processing Payment
        </h3>

        {/* Status Message */}
        <p className="text-lg text-gray-700 mb-2">Order Created Successfully</p>

        {/* Instruction */}
        <p className="text-sm text-gray-600">
          Please wait while we process your payment. This may take a few seconds...
        </p>
      </div>
    </div>
  );
};

export default ProcessingPaymentPopup;
