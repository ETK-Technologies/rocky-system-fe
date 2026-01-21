"use client";

import Link from "next/link";
import ListWithIcons from "@/components/ListWithIcons";
import CustomImage from "@/components/utils/CustomImage";
import { FaArrowRightLong } from "react-icons/fa6";
import CustomContainImage from "../utils/CustomContainImage";

const SafeAndSecure = () => {
  return (
    <div className="mx-auto flex flex-col md:flex-row items-center justify-between">
      {/* Left Section */}
      <div className="w-full md:w-1/3">
        <h1 className="text-3xl lg:text-[48px] md:leading-[48px] font-[550] mb-8 headers-font">
          Safe and secure
        </h1>

        <ListWithIcons items={features} />

        <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:space-x-4 mb-6 w-full mt-8">
          <Link
            href="/quiz/ed-pre-consultation/"
            className="bg-black text-white px-6 py-3 rounded-full flex items-center justify-center md:justify-start space-x-3 hover:bg-gray-800 transition"
          >
            <span className="text-center md:text-start">Learn More</span>
            <FaArrowRightLong />
          </Link>
        </div>
      </div>

      {/* Right Cards Section */}
      <div className="w-full md:w-3/5 mt-6 pb-10">
        <div className="flex md:flex-row flex-nowrap md:gap-4 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="max-w-[350] bg-gradient-to-b from-white to-[#F3F2ED] rounded-3xl shadow-md h-[350px]  md:h-[362px] flex flex-col justify-between snap-start shrink-0  "
            >
              <div className="p-6">
                <div className="relative h-[70px] md:h-[80px] mb-4">
                  <CustomContainImage src={card.image} alt={card.title} fill />
                </div>
                <h2 className="text-xl font-semibold mt-2">{card.title}</h2>
                <p className="mt-2 text-sm">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SafeAndSecure;

// Features list for ListWithIcons
const features = [
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/hospital%201.png",
    alt: "Hospital",
    text: "Registered Canadian pharmacy",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/stethoscope%201.png",
    alt: "Stethoscope",
    text: "Fully inspected and regulated service",
  },
  {
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/dns-services%201.png",
    alt: "Health Canada",
    text: "Health Canada Approved Treatments",
  },
];

// Static card data
const cards = [
  {
    image:
      "https://myrocky-dev.etk-tech.com/wp-content/uploads/2024/07/ontario-removebg-preview.png",
    title: "Ontario College of Pharmacists",
    description:
      "Regulates the pharmacy profession to ensure competent health professionals and respectful treatment. Governed by the Pharmacy Act, 1991, it sets practice standards, ethical guidelines, and continuing competence requirements.",
  },
  // {
  //   image:
  //     "https://myrocky-dev.etk-tech.com/wp-content/uploads/2024/07/ontario2-removebg-preview.png",
  //   title: "LegitScript certification",
  //   description:
  //     "LegitScript conducts thorough oversight of online pharmacies through an extensive verification process, ensuring they meet licensing requirements, regulatory compliance, and adhere strictly to relevant laws.",
  // },
];
