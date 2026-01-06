"use client";

import Logo from "@/components/Navbar/Logo";
import { useState, useEffect } from "react";

export default function PhotoIDUploadWarning({
  step,
  answer,
  onAnswerChange,
  onBack,
  onNext,
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

  return (
    <div
      className="fixed inset-0 bg-white !z-[999999] flex flex-col"
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
        <div className="w-full md:w-[520px] max-w-xl mx-auto px-5 md:px-0 py-4 relative flex flex-col">
          <div className="relative flex items-center justify-center py-4 px-4">
            <button
              onClick={onBack}
              className="absolute left-4 text-2xl text-black"
              aria-label="Go back"
            >
              ‹
            </button>
            <Logo />
          </div>

          <h3 className="text-[18px] md:text-[20px] text-black mb-8">
            Upload Photo ID
          </h3>

          <p
            className="text-[16px] md:text-[18px] mb-8 text-[#000000] text-left"
            style={{ fontFamily: "Fellix" }}
          >
            Please note this step is mandatory. If you are unable to complete at this time, email your ID to clinicadmin@myrocky.com.
          </p>

          <p
            className="text-[16px] md:text-[18px] mb-8 text-[#000000] text-left"
            style={{ fontFamily: "Fellix" }}
          >
            Your questionnaire will not be reviewed without this. As per our T&C's a $45 cancellation fee will be charged if we are unable to verify you.
          </p>

          <div className="mb-8">
            <label className="flex items-start cursor-pointer">
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
              <span className="text-[16px] md:text-[18px]  subheaders-font pb-4">
                I hereby understand and consent to the above waiver
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full py-4 px-4 shadow-lg z-50">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <button
            onClick={() => {
              if (isChecked) {
                onAnswerChange({ answerType: "text", answer: "acknowledged" });
                if (onNext) {
                  onNext();
                }
              }
            }}
            disabled={!isChecked}
            className={`w-full py-4 px-4 rounded-full text-white font-medium text-lg ${
              isChecked ? "bg-black" : "bg-gray-400"
            }`}
          >
            I Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
