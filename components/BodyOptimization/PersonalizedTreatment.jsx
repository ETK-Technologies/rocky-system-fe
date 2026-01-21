import ImageWithList from "@/components/ImageWithList";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

const PersonalizedTreatment = () => {
  return (
    <ImageWithList
      image="https://myrocky.b-cdn.net/WP%20Images/Weight%20Loss/Personalized.webp"
      imagePosition="left"
      mobileImagePosition="top"
    >
      {/* Heading */}
      <div className="w-full">
        <div>
          <p className="text-[32px] md:text-[48px] text-[000000D9] leading-[35.68px] md:leading-[53.52px] tracking-[-0.02em] md:mb-[12px] headers-font">
            <span className=" headers-font">Personalized Treatment</span>
            <span className="hidden sm:block  headers-font">Plans</span>
            <span className="sm:hidden ml-[15px] headers-font">Plans:</span>
          </p>
          <p className="capitalize text-[26px] md:text-[30px] leading-[28.99px] md:leading-[33.45px] mb-[24px] md:mt-[40px] text-[#00000099] tracking-[-0.02em] subheaders-font">
            No More Waiting, No More Judgment.
          </p>
          <p className="text-[20px] leading-[24px] md:leading-[30px] text-[#000000A6] md:text-[#535353] tracking-[-0.02em] mb-[24px] md:mb-[40px] md:h-[123px] md:w-[536px] subheaders-font md:poppins-font">
            Track lab results and progress, gain insights, manage appointments,
            treatments, and more—all from your all-in-1 Rocky Health portal.
          </p>
        </div>
        {/* Button */}
        <div className="">
          <Link
            href="/quiz/wlprecons/"
            className="h-11 md:px-[24px] py-3 md:py-[11.5px] rounded-[64px] flex items-center space-x-2 transition justify-center w-full md:w-fit  bg-black text-white hover:bg-gray-800"
          >
            <span className="text-[14px] leading-[19.6px] md:leading-[21px] font-[500] md:font-[400]">
              Learn more
            </span>
            <FaArrowRightLong />
          </Link>
        </div>
      </div>
    </ImageWithList>
  );
};

export default PersonalizedTreatment;
