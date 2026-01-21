"use client";

import ImageWithList from "@/components/ImageWithList";
import Link from "next/link";
import { useState } from "react";
import { FaArrowRightLong } from "react-icons/fa6";

const accordionData = [
  {
    number: "01",
    title: "Faster-acting",
    content:
      "Rocky Chewalis get you hard in 15 minutes on average. Because the mint dissolves under the tongue, it activates way faster than other leading ED medications.",
  },
  {
    number: "02",
    title: "Discreet & convenient",
    content:
      "Ditch the awkwardness. Pop a mint anytime, anywhere—no water needed, and it freshens your breath, too. This discreet and dual-purpose approach to ED treatment ensures you're ready without any obvious preparations, effortlessly blending into your daily routine.",
  },
  {
    number: "03",
    title: "Safer alternative",
    content:
      "These mints are designed to absorb directly through the mouth, bypassing the stomach to reduce potential side effects. This method delivers a steady, effective dose of tadalafil, ensuring fewer disruptions, safer and reliable enhancement, and a smoother experience.",
  },
];

const WhyChewalis = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <ImageWithList
      image="https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/chewalis-why-better.webp"
      imagePosition="right"
      mobileImagePosition="top"
    >
      {/* Heading */}
      <h1 className="text-3xl lg:text-[48px] md:leading-[48px] font-[550] mb-8 headers-font">
        Why Chewalis Mints over traditional ED meds
      </h1>

      {/* Accordion */}
      <ul className="mb-8">
        {accordionData.map((item, index) => (
          <li
            key={index}
            className="list-none text-md md:text-[20px] leading-[28px] font-[400] mb-2 cursor-pointer"
          >
            <div
              className="flex items-center"
              onClick={() => handleToggle(index)}
            >
              <div className="font-bold inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#D3876A] to-[#A55255] mr-2">
                {item.number}
              </div>
              <div className="flex w-full justify-between items-center">
                <div>{item.title}</div>
                <span
                  className={`text-2xl  transform transition-transform duration-300 ease-in-out ${
                    openIndex === index ? "rotate-45" : "rotate-0"
                  }`}
                >
                  +
                </span>
              </div>
            </div>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden  pl-[30px] ${
                openIndex === index
                  ? "max-h-[500px] opacity-100 py-2"
                  : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-gray-700">{item.content}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Button - Mobile Only */}
      <div className="flex flex-col md:hidden gap-4 mb-6">
        <Link
          href="/quiz/ed-pre-consultation/"
          className="bg-black text-white px-6 py-3 rounded-full flex items-center justify-center space-x-3 hover:bg-gray-800 transition"
        >
          <span>Start Your Quiz</span>
          <FaArrowRightLong />
        </Link>
      </div>
    </ImageWithList>
  );
};

export default WhyChewalis;
