"use client";

import Logo from "@/components/Navbar/Logo";
import { useState, useEffect } from "react";

export default function EDFemaleGenderNotice({
  step,
  answer,
  onAnswerChange,
  onBack,
}) {
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
            Just a Quick Note! 😊
          </h3>

          <p
            className="text-[16px] md:text-[18px] mb-8 text-[#000000] text-left"
            style={{ fontFamily: "Fellix" }}
          >
            We noticed you selected Female—currently, our treatments for erectile dysfunction are only available for men.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full py-4 px-4 shadow-lg z-50">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <button
            onClick={() => {
              onAnswerChange({ answerType: "text", answer: "acknowledged" });
              onBack();
            }}
            className="w-full py-4 px-4 rounded-full text-white font-medium text-lg bg-black"
          >
            Ok, I understand
          </button>
        </div>
      </div>
    </div>
  );
}
