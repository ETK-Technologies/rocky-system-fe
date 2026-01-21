"use client";

import ImageWithList from "@/components/ImageWithList";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";
import ListWithNumbers from "@/components/ListWithNumbers";

const TakeRockyChewalis = () => {
  const steps = [
    "Place under your tongue.",
    "Let it dissolve fully—no need to chew.",
    "Get hard in about 15 minutes*.",
  ];

  return (
    <ImageWithList
      image="https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/chewalis-how-to-take.webp"
      imagePosition="right"
      mobileImagePosition="top"
    >
      {/* Heading */}
      <h1 className="text-3xl lg:text-[48px] md:leading-[48px] font-[550] mb-6 md:mb-8 headers-font">
        How to take <br />
        Rocky Chewalis
      </h1>

      {/* Numbered List */}
      <ListWithNumbers
        items={steps}
        bgNumberGradient="bg-gradient-to-r from-[#D3876A] to-[#A55255]"
      />

      {/* CTA Button */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:space-x-4 mb-6">
        <Link
          href="/quiz/ed-pre-consultation/"
          className="bg-black text-white px-6 py-3 rounded-full flex items-center justify-center md:justify-start space-x-3 hover:bg-gray-800 transition"
        >
          <span className="text-center md:text-start">Learn More</span>
          <FaArrowRightLong />
        </Link>
      </div>
    </ImageWithList>
  );
};

export default TakeRockyChewalis;
