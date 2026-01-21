"use client";

import { useRef } from "react";
import ResultCard from "./ResultCard";
import ScrollArrows from "../ScrollArrows";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

const reviews = [
  {
    name: "Anthony",
    beforeImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-1-before.webp",
    afterImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-1-after.webp",
    duration: "52 lbs in 17 months",
    reviewText:
      "I felt stuck before I joined Rocky. Their guidance helped me lose over 50 pounds and completely change how I approach health",
  },
  {
    name: "Ashley",
    beforeImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-2-before.webp",
    afterImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-2-after.webp",
    duration: "33 lbs in 15 months",
    reviewText:
      "Rocky met me where I was, helping me build confidence in my body and take control of my health without feeling overwhelmed",
  },
  {
    name: "Pedro",
    beforeImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-3-before.webp",
    afterImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-3-after.webp",
    duration: "17 lbs in 11 months",
    reviewText:
      "With Rocky I didn’t just lose weight, I finally understood how to train and eat for my body and this is the best I’ve felt in years",
  },
  ,
  {
    name: "Stephen",
    beforeImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-4-before.webp",
    afterImage:
      "https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/wl-4-after.webp",
    duration: "19 lbs in 8 months",
    reviewText:
      "Rocky helped me build habits that actually stuck and the progress speaks for itself - I never thought I could get this lean again. ",
  },
];

const ResultSection = () => {
  const scrollContainerRef = useRef(null);

  return (
    <>
      <div className="mx-auto text-center mb-8 md:mb-14 max-w-[320px] md:max-w-full">
        <span className="text-[14px] md:text-[16px] leading-[140%] text-[#AE7E56] font-[500] mb-3">
          Thousands of members and counting
        </span>
        <h2 className="capitalize text-[32px] md:text-[48px] leading-[36.8px] md:leading-[55.2px] tracking-[-0.01em] md:tracking-[-0.02em] mb-6 font-[550] headers-font">
          Real members, real weight loss results
        </h2>
        <p className="text-[16px] md:text-[18px] leading-[140%] font-[400]">
          Don’t just take it from us - our members see (and feel) the
          difference.
          <br />
          These members were paid in exchange for their testimonials.
        </p>
      </div>

      <div className="overflow-x-auto !no-scrollbar relative">
        <div className=" mx-auto ">
          <div className="relative">
            <ScrollArrows scrollContainerRef={scrollContainerRef} />

            <div
              ref={scrollContainerRef}
              className="flex gap-2 md:gap-4 items-start overflow-x-auto snap-x snap-mandatory no-scrollbar"
            >
              {reviews.map((review, index) => (
                <ResultCard key={index} {...review} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Button */}
      <div>
        <Link
          href="/quiz/wlprecons/"
          className="mx-auto my-[32px] md:my-[56px] h-[52px] md:px-[24px] py-[21px] rounded-[64px] flex items-center space-x-2 transition justify-center w-full md:w-[320px] bg-black text-white hover:bg-gray-800"
        >
          <span className="text-[14px] leading-[19.6px] md:leading-[21px] font-[500] md:font-[400]">
            Get started today
          </span>
          <FaArrowRightLong />
        </Link>
      </div>
      <hr className="mb-[32px] md:mb-[56px] vertical-line-inactive" />
      <div className="flex justify-center gap-4 md:gap-12">
        {data.map((item, index) => {
          const radius = 40;
          const stroke = 10;
          const normalizedRadius = radius - stroke / 2;
          const circumference = 2 * Math.PI * normalizedRadius;
          const strokeDashoffset =
            circumference - (item.value / 100) * circumference;
          const gradientId = `gradient-${index}`;

          return (
            <div
              key={index}
              className="text-center flex flex-col items-center max-w-[101px] md:max-w-[220px]"
            >
              <div className="relative w-[80px] md:w-[100px] h-[80px] md:h-[100px]">
                <svg
                  className="rotate-[-90deg]"
                  width="100%"
                  height="100%"
                  viewBox="0 0 80 80"
                >
                  <defs>
                    <linearGradient
                      id={gradientId}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="41.64%" stopColor="#AE7E56" />
                      <stop offset="73.66%" stopColor="#E9D7C9" />
                    </linearGradient>
                  </defs>

                  {/* Background circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r={normalizedRadius}
                    fill="transparent"
                    stroke="#F5F4EF"
                    strokeWidth={stroke}
                  />

                  {/* Progress arc with gradient */}
                  <circle
                    cx="40"
                    cy="40"
                    r={normalizedRadius}
                    fill="transparent"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Centered percentage text */}
                <div className="absolute top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 text-[24px] font-[700] leading-[140%] tracking-[-0.02em] text-[#AE7E56] headers-font">
                  {item.value}%
                </div>
              </div>
              <h3 className="text-[14px] md:text-[16px] leading-[140%] font-[600] my-2 md:my-4">
                {item.category}
              </h3>
              <p className="text-[14px] md:text-[16px] leading-[140%] font-[500]">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ResultSection;

const data = [
  {
    category: "Behavioural / Lifestyle Impact",
    value: 85,
    description:
      "85% of users report developing a healthier relationship with food after starting GLP-1 therapy",
  },
  {
    category: "Metabolic / Clinical Improvements",
    value: 90,
    description:
      "90% of patients see significant reductions in appetite by week 4",
  },
  {
    category: "Patient Sentiment & Satisfaction",
    value: 88,
    description:
      "88% of patients feel more in control of their weight management journey",
  },
];
