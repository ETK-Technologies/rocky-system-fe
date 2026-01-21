"use client";
import ImageWithList from "@/components/ImageWithList";
import Link from "next/link";
import { useState } from "react";
import CustomImage from "../utils/CustomImage";
import { FaArrowRightLong } from "react-icons/fa6";

const accordionData = [
  {
    title: "Work with your body, not against it",
    content:
      "Traditional diets don't work because nearly 70% of weight is genetically determined. Through medication, and a comprehensive data-backed weight loss plan, you can work with your body, rather than against it.",
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/body.png",
  },
  {
    title: "No restrictive diets, just science",
    content:
      "No restrictive diets or miracle cures—just scientifically-backed weight loss treatments designed to fit seamlessly into your life. Break the cycle of yo-yo dieting with strategies that address the biological factors influencing your weight.",
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/science.png",
  },
  {
    title: "Improve health",
    content:
      "Lose weight in a healthy manner with strategies that may reduce your risk for certain conditions like diabetes and heart disease. Our plans encourage realistic nutrition principles, tailored tips to support better eating habits and sleep quality.",
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/health.png",
  },
];

const HealthSolutions = ({ btnColor = null }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <ImageWithList
      image="https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/your-body.webp"
      imagePosition="right"
    >
      {/* Heading */}
      <h1 className="text-[32px] md:text-[48px] leading-9 md:leading-[54px] headers-font">
        Health Solutions That <br /> Work with Your Body
      </h1>
      <p className="py-6 md:py-0 md:mb-[18px] text-xl text-[#535353] lg:text-[#000000A6] font-medium lg:font-normal leading-6 lg:leading-[30px] tracking-[-1px] md:tracking-[0]">
        It’s not magic, it’s metabolic science. Access GLP-1s and treatments
        tailored to your unique goals, body and lifestyle, with all the support
        you need.
      </p>

      {/* List */}
      <ul className="mb-5 lg:mb-20 text-base font-normal">
        {accordionData.map((item, index) => (
          <li key={index}>
            <div
              className="text-md md:text-[20px] leading-[28px] font-[400] flex items-center justify-between cursor-pointer"
              onClick={() => handleToggle(index)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center md:gap-2">
                  {item.icon && (
                    <div className="relative overflow-hidden w-[42px] h-[42px]">
                      <CustomImage src={item.icon} fill priority />
                    </div>
                  )}
                  <p>{item.title}</p>
                </div>
                <span
                  className={`transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                    openIndex === index ? "rotate-[270deg]" : "rotate-90"
                  }`}
                >
                  &gt;
                </span>
              </div>
            </div>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                openIndex === index
                  ? "max-h-[500px] opacity-100 py-2"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="text-[14px] md:text-[16px] ml-[42px] md:ml-[50px] max-w-[500px]">
                {item.content}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Button */}
      <div>
        <Link
          href="/quiz/wlprecons/"
          className={` ${
            btnColor || "bg-black"
          }  h-11 md:px-[24px] py-3 md:py-[11.5px] rounded-[64px] flex items-center space-x-2 transition justify-center w-full md:w-fit  text-white hover:bg-gray-800`}
        >
          <span className="text-[14px] leading-[19.6px] md:leading-[21px] font-[500] md:font-[400]">
            Am I Eligible?
          </span>
          <FaArrowRightLong />
        </Link>
      </div>
    </ImageWithList>
  );
};

export default HealthSolutions;
