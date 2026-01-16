"use client";

import React from "react";
import Image from "next/image";

/**
 * RockyLongTermPopup - Weight Loss Long-term Approach Information
 * 
 * Shows information about Rocky's long-term weight loss approach.
 * Follows quiz builder structure with step, answer, onAnswerChange props.
 * 
 * @param {object} step - Step configuration from quiz builder
 * @param {any} answer - Current answer value
 * @param {function} onAnswerChange - Callback when user acknowledges
 */
export default function RockyLongTermPopup({ step, answer, onAnswerChange }) {
  const handleContinue = () => {
    if (onAnswerChange) {
      onAnswerChange({
        answerType: "text",
        answer: {
          acknowledged: true,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-6 md:px-0">
      {/* Title */}
      <h3 className="headers-font text-[26px] md:text-[32px] leading-[120%] mb-[16px] text-center">
        Rocky creates long-term weight loss
      </h3>

      {/* Message */}
      <p className="text-[14px] md:text-[16px] leading-[140%] mb-[24px] text-center">
        On average, Rocky members lose 2-5x more weight vs. similar programs – without restrictive diets. Our holistic approach goes beyond just treatments – we help you develop habits for a healthier, happier you.
      </p>

      {/* Image */}
      <div className="mx-auto relative mb-4">
        <Image
          width={1000}
          height={1000}
          src="/wl-pre-consultation/Weight.png"
          alt="Weight Loss Progress"
          className="w-full h-[320px] md:h-[324px] lg:w-[335px] rounded-[32px]"
        />
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] font-normal leading-[140%] text-[#212121] mb-4">
        *On average, through lifestyle changes, treatment and support, Rocky members lose 12% of their weight in 6 months.
      </p>

      {/* Privacy Text */}
      <div className="text-[10px] leading-[140%] font-medium text-[#BABABA] mt-2 mb-24 text-center">
        We respect your privacy. All of your information is securely stored on our PIPEDA Compliant server.
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 w-full px-4 pb-4 flex items-center justify-center z-50 bg-white/90 backdrop-blur-sm"
        style={{ boxShadow: "0 -12px 30px rgba(255,255,255,0.95)" }}>
        <div className="w-full max-w-sm">
          <button
            onClick={handleContinue}
            className="w-full h-[52px] py-3 items-center rounded-full font-medium transition-colors bg-black text-white hover:bg-gray-800"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
