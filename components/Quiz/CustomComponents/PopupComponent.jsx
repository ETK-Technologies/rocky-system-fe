"use client";

import Logo from "@/components/Navbar/Logo";
import { useState, useEffect } from "react";

export default function PopupComponent({
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
        <div className="w-full md:w-[520px] max-w-xl mx-auto px-5 md:px-0 py-4 relative flex flex-col">
          <div className="relative flex items-center justify-center  px-4">
            <Logo />
          </div>

          <h3 className=" headers-font text-[26px] md:text-[32px] leading-[120%] mb-[16px] text-center">
            Sorry, you are not eligible for our weight loss program
          </h3>
          <div className="text-[14px] md:text-[16px] leading-[140%] mb-[24px] rounded-lg p-[16px]">
            <p className="">
              <center>
                Based on your answers, GLP-1 therapy through our online program
                would not be a good fit. Your health is very important to us,
                and some conditions/medications require more personalized,
                in-person support to ensure the best and safest care. We
                recommend you visit your usual doctor.
              </center>
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full py-4 px-4 shadow-lg z-50">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <button
            onClick={() => {
              onBack();
            }}
            className="w-full py-4 px-4 rounded-full text-white font-medium text-lg bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
