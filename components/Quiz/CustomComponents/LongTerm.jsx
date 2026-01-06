import React, { useState, useEffect } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";
import { isAuthenticated } from "@/lib/cart/cartService";
import {
  TryLogin,
  isValidEmail,
  isValidPassword,
} from "../functions/authFunctions";
import Counter from "./Counter";
import CustomImage from "@/components/utils/CustomImage";
import { logger } from "@/utils/devLogger";

export default function LongTerm({
  step,
  answer,
  onAnswerChange,
  onBack,
  onNext,
  allAnswers,
}) {
  useEffect(() => {
    onAnswerChange({
      answerType: "text",
      answer: {},
    });
  }, []);

  return (
    <div className="w-full">
      <div className="w-full bg-white rounded-t-2xl">
        <div className="w-full mx-auto">
          <h1 className="headers-font text-[26px]  md:text-[32px] headers-font leading-[120%] mb-[16px] text-center">
            Rocky creates long-term weight loss
          </h1>
          <div className="text-[14px] md:text-[16px] leading-[140%] mb-[24px] text-center">
            <p>
              On average, Rocky members lose 2-5x more weight vs. similar
              programs – without restrictive diets. Our holistic approach goes
              beyond just treatments – we help you develop habits for a
              healthier, happier you.
            </p>
          </div>

          <div className="mx-auto">
            <CustomImage
              src="https://pub-1aa26f93db354c659b0c049a51fe7fbe.r2.dev/Weight-c5047d71.png"
              alt="Long Term Weight Loss"
              width={1000}
              height={1000}
              className="object-cover duration-500 ease-in-out scale-100 blur-0 sepia-0 w-[100%] h-[320px] md:h-[324px] lg:w-[335px] rounded-[32px] mb-4"
            />
          </div>

          <p className="text-[11px] font-normal leading-[140%] text-[#212121] mb-4">
            *On average, through lifestyle changes, treatment and support, Rocky
            members lose 12% of their weight in 6 months.
          </p>

          <div className="text-[10px] leading-[140%] font-medium text-[#BABABA] mt-2 mb-24">
            We respect your privacy. All of your information is securely stored
            on our HIPPA Compliant server.
          </div>
        </div>
      </div>
    </div>
  );
}
