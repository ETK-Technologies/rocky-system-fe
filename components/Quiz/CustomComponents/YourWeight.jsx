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

export default function YourWeight({
  step,
  answer,
  onAnswerChange,
  onBack,
  onNext,
  allAnswers,
}) {
  const [weight, setWeight] = useState(0);

  useEffect(() => {
    // Extract weight from allAnswers
    const weightAnswer = allAnswers["1765827707460"]?.value?.answer;
    if (weightAnswer) {
      setWeight(weightAnswer.weight);
      logger.log("YourWeight Component - extracted weight:", weightAnswer);
    } else {
      logger.log(
        "YourWeight Component - weight answer not found in allAnswers"
      );
    }

    onAnswerChange({
      answerType: "text",
      answer: {},
    });
  }, []);

  return (
    <div className="w-full">
      <div className="w-full bg-white rounded-t-2xl">
        <div className="w-full mx-auto">
          <h1 className="headers-font font-medium text-[26px] leading-[120%] tracking-tight mb-[24px] ">
            Your Weight:
          </h1>

          <div className="flex justify-center items-center mb-[48px] relative">
            <p className="absolute top-[15px] tracking-tight left-[32px]  md:left-[115px] z-[999999] text-[56px] text-white font-medium">
              {weight} lbs
            </p>
            <p className="absolute flex items-center top-[80px] text-[#DCA77B]  tracking-tight left-[32px] md:left-[115px] z-[999999] text-[34px]  font-medium">
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 384 512"
                className="text-[24px]"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>
              </svg>{" "}
              {weight * 0.25} lbs
            </p>
            <CustomImage
              src="https://pub-1aa26f93db354c659b0c049a51fe7fbe.r2.dev/emptyImage-cb00f79a.webp"
              width={335}
              height={410}
              className="object-cover duration-500 ease-in-out scale-100 blur-0 sepia-0  w-auto h-[400px]"
            />
          </div>

          <p className="text-[18px] leading-[140%] font-medium mb-4">
            You’ll get a tailored weight loss plan that considers your genetics,
            habits and lifestyle
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
