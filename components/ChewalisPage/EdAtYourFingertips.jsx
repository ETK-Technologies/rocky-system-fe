"use client";

import Link from "next/link";
import ListWithNumbers from "@/components/ListWithNumbers";
import { FaArrowRightLong } from "react-icons/fa6";

const EdAtYourFingertips = () => {
  const benefits = [
    "No GP or pharmacy visits needed.",
    "Free initial consultation with healthcare providers.",
    "Unlimited follow ups.",
    "Fast & discreet delivery.",
  ];

  return (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-4 md:gap-16 items-center">
      {/* Left Content */}
      <div>
        <h1 className="text-3xl lg:text-[48px] md:leading-[48px] font-[550] mb-2 md:mb-8 headers-font">
          ED treatments <br /> at your fingertips
        </h1>

        {/* Button - Desktop */}
        <div className="hidden md:flex flex-col md:flex-row gap-4 md:gap-0 md:space-x-4 mb-6">
          <Link
            href="/quiz/ed-pre-consultation/"
            className="bg-black text-white px-6 py-3 rounded-full flex items-center justify-center md:justify-start space-x-3 hover:bg-gray-800 transition"
          >
            <span className="text-center md:text-start">Learn More</span>
            <FaArrowRightLong />
          </Link>
        </div>
      </div>

      {/* Numbered List */}
      <div>
        <ListWithNumbers
          items={benefits}
          bgNumberGradient="bg-gradient-to-r from-[#D3876A] to-[#A55255]"
        />

        {/* Button - Mobile */}
        <div className="flex md:hidden flex-col md:flex-row gap-4 md:gap-0 md:space-x-4 mt-6">
          <Link
            href="/quiz/ed-pre-consultation/"
            className="bg-black text-white px-6 py-3 rounded-full flex items-center justify-center md:justify-start space-x-3 hover:bg-gray-800 transition"
          >
            <span className="text-center md:text-start">Learn More</span>
            <FaArrowRightLong />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EdAtYourFingertips;
