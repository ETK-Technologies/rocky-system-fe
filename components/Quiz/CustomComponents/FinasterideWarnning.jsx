"use client";

import { useState } from "react";
import CustomImage from "../../utils/CustomImage";
import Logo from "@/components/Navbar/Logo";

export default function FinasterideWarnning({ step, answer, onAnswerChange, onBack }) {
  const [isChecked, setIsChecked] = useState(false);

  const handleContinue = () => {
    if (!isChecked) return;
    if (onAnswerChange) {
      onAnswerChange({ answerType: "text", answer: { acknowledged: true } });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F5F4EF] !z-[999999] flex flex-col">
      <div className="min-h-screen flex flex-col max-w-[520px] mx-auto">
        {/* Header */}
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

        {/* Content */}
        <div className="flex-1 flex flex-col px-6 py-8">
          <h1 className="text-[26px] md:text-[32px] text-[#C19A6B] font-semibold mb-8">
            { "Warning"}
          </h1>

          <div className="text-[20px] md:text-[24px] mb-8 text-[#000000] text-left leading-relaxed flex-1">
            <p>
                Finasteride requires a healthy liver to be safely metabolized and removed from the body. We are
                therefore unable to provide you with a prescription at this time. Please speak to your health care provider to
                see if Finasteride may be safe for you.
              </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 mb-8 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-gray-400 text-gray-600 focus:ring-0"
            />
            <span className="text-xl subheaders-font pb-4">
              I hereby understand and consent to the above waiver
            </span>
          </label>

          {/* OK Button */}
          <button
            onClick={onBack}
            disabled={!isChecked}
            className={`w-full py-4 rounded-full text-white text-lg font-medium transition-all ${
              isChecked
                ? "bg-black "
                : "bg-[#C5CDD2] cursor-not-allowed"
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
