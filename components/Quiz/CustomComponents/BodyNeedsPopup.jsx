"use client";

import React from "react";
import Image from "next/image";

/**
 * BodyNeedsPopup - GLP-1 Therapy Timeline Information
 * 
 * Educational popup about metabolic acclimation and weight loss timeline.
 * Follows quiz builder structure.
 * 
 * @param {object} step - Step configuration from quiz builder
 * @param {any} answer - Current answer value
 * @param {function} onAnswerChange - Callback when user continues
 */
export default function BodyNeedsPopup({ step, answer, onAnswerChange }) {
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
      {/* Image at Top */}
      <div className="mx-auto mb-6">
        <Image
          width={1000}
          height={1000}
          src="/wl-pre-consultation/WeightLossProgress.png"
          alt="Weight Loss Progress"
          className="w-[335px] h-[309px] mx-auto"
        />
      </div>

      {/* Message with styled background */}
      <div className="text-[14px] md:text-[16px] leading-[140%] mb-[24px] bg-[#F7F9FB] rounded-lg p-[16px]">
        <center className="font-medium">
          Your body needs time to adjust to GLP-1 therapy—typically the first 4 weeks are about metabolic acclimation. From there,<u className="font-light"> weight loss tends to accelerate </u>, with many patients seeing their most noticeable results between weeks 5 and 9.
        </center>
        <br />
        <center>
          At Rocky, we don't just treat the symptoms — we <b>identify the underlying drivers of your metabolic health, helping you lose weight and keep it off for good.</b>
        </center>
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
