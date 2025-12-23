"use client";

import { useState, useEffect } from "react";

export default function PleaseKeepInMind({
  step,
  answer,
  onAnswerChange,
  onBack,
}) {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "auto";
      };
    }
  }, []);

  const handleContinue = () => {
    if (!isChecked) return;
    if (onBack) {
      onBack();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#F5F4EF] !z-[999999] flex flex-col"
      style={{
        animation: "fadeIn 0.3s ease-in-out",
      }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex-1 flex flex-col overflow-y-auto pb-[80px] md:pb-[100px]">
        <div className="w-full md:w-[520px] max-w-xl mx-auto px-5 md:px-0 py-4">
          {/* Title */}
          <h1
            className="text-[20px] md:text-[24px] text-[#C19A6B] font-medium mb-6"
            style={{ fontFamily: "Fellix" }}
          >
            {"Please keep in mind that..."}
          </h1>

          {/* Description */}
          <div className="text-[16px] md:text-[18px] text-black leading-relaxed mb-6">
            <p>
              We care about your health here at Rocky. This medication may not
              be safe for use with breast cancer and we are therefore unable to
              provide you with a prescription at this time. Please speak to your
              health care provider to see if Finasteride may be safe for you.
            </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-start cursor-pointer mb-6">
            <div
              className={`rounded-md flex items-center justify-center w-6 h-6 mr-3 mt-1 flex-shrink-0 ${
                isChecked ? "bg-[#C19A6B]" : "bg-gray-400"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  width="20"
                  height="20"
                  rx="4"
                  fill={isChecked ? "#C19A6B" : "#9CA3AF"}
                />
                {isChecked && (
                  <path
                    d="M5 10L8.5 13.5L15 7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
            />
            <span
              className="text-[16px] md:text-[18px]"
              style={{ fontFamily: "Fellix" }}
            >
              I hereby understand and consent to the above waiver
            </span>
          </label>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 w-full py-4 px-4 shadow-lg z-50">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <button
            onClick={handleContinue}
            disabled={!isChecked}
            className={`w-full py-4 px-4 rounded-full text-white font-medium text-lg ${
              isChecked ? "bg-black" : "bg-gray-400"
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
