"use client";

import React from "react";

/**
 * WeightLossQualificationPopup - User Qualification Confirmation
 * 
 * Shows user they've qualified and displays potential weight loss.
 * Calculates 25% of user's weight for weight loss goal.
 * Follows quiz builder structure.
 * 
 * @param {object} step - Step configuration from quiz builder
 * @param {any} answer - Current answer value
 * @param {function} onAnswerChange - Callback when user continues
 * @param {object} userData - Additional user data (should contain weight)
 */
export default function WeightLossQualificationPopup({ step, answer, onAnswerChange, userData = {} }) {
  const handleContinue = () => {
    if (onAnswerChange) {
      onAnswerChange({
        answerType: "text",
        answer: {
          qualified: true,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // Calculate 25% of user weight from step config or userData
  const userWeight = step?.userData?.weight || userData?.weight || 0;
  const rawWeight = Number(userWeight);
  const hasValidWeight = !isNaN(rawWeight) && rawWeight > 0;
  
  let weightToLose = "";
  if (hasValidWeight) {
    const rounded = Math.round(rawWeight * 0.25 * 10) / 10;
    weightToLose = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  return (
    <div className="w-full max-w-lg mx-auto px-6 md:px-0">
      {/* Title */}
      <h3 className="mb-[24px] text-[#AE7E56] headers-font text-[26px] leading-[120%] mt-6">
        You've qualified
      </h3>

      {/* Message with weight loss amount */}
      <p className="text-[20px] leading-[140%] mb-[24px]">
        {hasValidWeight ? `Lose ${weightToLose} lbs in a year` : "You're eligible for our weight loss program"}
      </p>

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
