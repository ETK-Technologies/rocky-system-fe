"use client";

import Logo from "@/components/Navbar/Logo";
import CustomImage from "../../utils/CustomImage";

export default function CustomeNote({ step, answer, onAnswerChange, onBack }) {
  const handleContinue = () => {
    if (onAnswerChange) {
      onAnswerChange({ answerType: "text", answer: { acknowledged: true } });
    }
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F5F0E8] z-50 overflow-y-auto">
      <div className="min-h-screen flex flex-col">
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
        <div className="flex-1 flex flex-col justify-between max-w-[510px] mx-auto w-full px-6 py-8">
          <div>
            {/* Title */}
            <h1 className=" text-[26px] md:text-[32px] text-[#C19A6B] font-semibold mb-8">
              {"Just a Quick Note"}
            </h1>

            {/* Description */}
            <div className="text-[20px] md:text-[24px] mb-8 text-[#000000] text-left">
             We noticed you selected Female—currently, our treatments for hair loss are only available for men.
            </div>
          </div>

          <div>
            {/* OK Button */}
            <button
              onClick={handleContinue}
              className="w-full py-4 rounded-full bg-black hover:bg-gray-900 text-white text-[18px] font-medium transition-all"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
