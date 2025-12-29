"use client";

import React from "react";
import Image from "next/image";

/**
 * DisqualificationPopup - Generic Disqualification Message
 * 
 * Reusable popup for all disqualification scenarios.
 * Shows appropriate image and message based on disqualification type.
 * Follows quiz builder structure.
 * 
 * @param {object} step - Step configuration from quiz builder
 * @param {any} answer - Current answer value
 * @param {function} onAnswerChange - Callback when user closes
 */
export default function DisqualificationPopup({ step, answer, onAnswerChange }) {
  // Get disqualification type from step config
  const disqualType = step?.disqualType || step?.type || "medical";
  
  const handleClose = () => {
    if (onAnswerChange) {
      onAnswerChange({
        answerType: "text",
        answer: {
          acknowledged: true,
          disqualified: true,
          disqualType,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // Get appropriate image based on type
  const getImage = () => {
    switch (disqualType) {
      case "medical":
      case "medicalCondition":
        return "/wl-pre-consultation/medical-condition-warning.png";
      case "medication":
        return "/wl-pre-consultation/medication-warning.png";
      case "eating":
      case "eatingDisorder":
        return "/wl-pre-consultation/eating-disorder-warning.png";
      case "pregnancy":
        return "/wl-pre-consultation/pregnancy-warning.png";
      default:
        return "/wl-pre-consultation/medical-condition-warning.png";
    }
  };

  // Get custom message from step config or use default
  const message = step?.message || "Based on your answers, GLP-1 therapy through our online program would not be a good fit. Your health is very important to us, and some conditions/medications require more personalized, in-person support to ensure the best and safest care. We recommend you visit your usual doctor.";
  const title = step?.title || "Sorry, you are not eligible for our weight loss program";

  return (
    <div className="w-full max-w-lg mx-auto px-6 md:px-0">
      {/* Title */}
      <h3 className="headers-font text-[26px] md:text-[32px] leading-[120%] mb-[16px] text-center">
        {title}
      </h3>

      {/* Message */}
      <div className="text-[14px] md:text-[16px] leading-[140%] mb-[24px] rounded-lg p-[16px]">
        <center>
          {message}
        </center>
      </div>

      {/* Warning Image */}
      <div className="mx-auto mb-8">
        <Image
          width={1000}
          height={1000}
          src={getImage()}
          alt="Not Eligible"
          className="w-[358px] h-[324px] mx-auto"
        />
      </div>

      {/* Close Button */}
      <div className="fixed bottom-0 left-0 w-full px-4 pb-4 flex items-center justify-center z-50 bg-white/90 backdrop-blur-sm"
        style={{ boxShadow: "0 -12px 30px rgba(255,255,255,0.95)" }}>
        <div className="w-full max-w-sm">
          <button
            onClick={handleClose}
            className="w-full h-[52px] py-3 items-center rounded-full font-medium transition-colors bg-black text-white hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
