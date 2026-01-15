"use client";
import { useState, useEffect } from "react";
import { FiAlignJustify } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { FaArrowRightLong } from "react-icons/fa6";
import { CiUser } from "react-icons/ci";
import { useRouter } from "next/navigation";
import { handleLogout } from "@/utils/logoutHandler";
import { getCookieName } from "@/utils/storagePrefix";

import Link from "next/link";
import Image from "next/image";
import MorePages from "./MorePages";

const MobileMenu = ({ menuItems, displayName, token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // Track open menu index

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const toggleMenu = (index) => {
    setOpenMenu(openMenu === index ? null : index); // Toggle open menu
  };

  const ProfileIcon = ({ setIsOpen }) => {
    const router = useRouter();
    const [isProfileItemOpen, setIsProfileItemOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Determine the display name with the same fallback logic as desktop
    let nameToShow = displayName;
    if (!nameToShow && typeof window !== "undefined") {
      // Only read prefixed cookies - no fallback to unprefixed to ensure project isolation
      const prefixedUserName = getCookieName("userName");
      const prefixedUserEmail = getCookieName("userEmail");
      
      const userName = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${prefixedUserName}=`))
        ?.split("=")[1];
      const userEmail = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${prefixedUserEmail}=`))
        ?.split("=")[1];

      if (userName) {
        nameToShow = decodeURIComponent(userName).split(" ")[0];
      } else if (userEmail) {
        const decodedEmail = decodeURIComponent(userEmail);
        nameToShow =
          decodedEmail.length > 15
            ? decodedEmail.substring(0, 12) + "..."
            : decodedEmail;
      } else {
        nameToShow = "Guest";
      }
    }

    const handleLogoutClick = async (e) => {
      e.preventDefault();
      if (isLoggingOut) return; // Prevent multiple clicks

      setIsLoggingOut(true);
      try {
        setIsOpen(false);
        await handleLogout(router);
      } catch (error) {
        console.error("Logout error:", error);
        setIsLoggingOut(false);
      }
      // Don't set to false immediately - let the navigation handle it
    };

    return (
      <>
        {token ? (
          <div className="border-b pb-2">
            <button
              className="px-5 text-black font-semibold hover:text-gray-500 w-full flex items-center justify-between"
              onClick={() => setIsProfileItemOpen(!isProfileItemOpen)}
            >
              <p>Hi, {nameToShow}!</p>

              <span
                className={`transform transition-transform duration-300 ${isProfileItemOpen ? "rotate-[270deg] mb-2" : "rotate-[90deg]"
                  }`}
              >
                &gt;
              </span>
            </button>
            {isProfileItemOpen && (
              <div className="pl-4">
                <Link
                  href="/my-account"
                  className="block px-4 py-1 text-gray-700 hover:bg-slate-200 hover:text-black w-full text-start"
                  onClick={() => setIsOpen(false)}
                >
                  My Account
                </Link>

                <button
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                  className="block px-4 py-1 text-gray-700 hover:bg-slate-200 hover:text-black w-full text-start disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                      Logging out...
                    </>
                  ) : (
                    "Logout"
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between pl-5 pr-3.5 py-2 border-b border-solid">
            <Link
              href="/login-register?viewshow=login"
              className="headers-font"
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Link>

            <CiUser size={22} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="md:hidden flex items-center">
      {/* Burger Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-black focus:outline-none "
        aria-label="Toggle mobile menu"
      >
        {isOpen ? (
          <IoClose className="text-2xl" />
        ) : (
          <FiAlignJustify className="text-2xl" />
        )}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute -left-5 top-[67px] w-[calc(100%+40px)] min-h-screen max-h-screen overflow-y-auto bg-white z-50 pb-64">
          {/* Profile Icon */}
          <ProfileIcon setIsOpen={setIsOpen} />
          {menuItems.map((item, index) => (
            <MenuItem
              key={item.text}
              item={item}
              isOpen={openMenu === index}
              toggleMenu={() => toggleMenu(index)}
              setIsOpen={setIsOpen}
            />
          ))}
          <MorePages setIsOpen={setIsOpen} />
        </div>
      )}
    </div>
  );
};

export default MobileMenu;

const MenuItem = ({ item, isOpen, toggleMenu, setIsOpen }) => {
  return (
    <div className="group px-5 py-2">
      {item.withoutMegaMenu ? (
        <Link
          href={item.link}
          className="text-black font-semibold hover:text-gray-500 w-full flex items-center justify-between"
          onClick={() => setIsOpen(false)}
          prefetch={true}
        >
          <p>{item.text}</p>
        </Link>
      ) : (
        <button
          onClick={toggleMenu}
          className="text-black font-semibold hover:text-gray-500 w-full flex items-center justify-between"
        >
          <p>{item.text}</p>
          <span
            className={`transform transition-transform duration-300 ${isOpen ? "rotate-[270deg]" : "rotate-90"
              }`}
          >
            &gt;
          </span>
        </button>
      )}
      {!item.withoutMegaMenu && isOpen && (
        <MegaMenu item={item} setIsOpen={setIsOpen} />
      )}
    </div>
  );
};

const MegaMenu = ({ item, setIsOpen }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const nextSlide = () => {
    if (item.getStarted) {
      setCurrentSlide((prev) => (prev + 1) % item.getStarted.length);
    }
  };

  const prevSlide = () => {
    if (item.getStarted) {
      setCurrentSlide(
        (prev) => (prev - 1 + item.getStarted.length) % item.getStarted.length
      );
    }
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  return (
    <div className="py-5">
      {item.mainText && (
        <p className="text-[14px] font-[500] mb-5 leading-[15.4px] headers-font">
          <Link
            href={item.mainLink}
            onClick={() => setIsOpen(false)}
            prefetch={true}
          >
            {item.mainText}
          </Link>
        </p>
      )}
      <ul className="mt-2">
        {item.sections?.map((section, index) => (
          <div
            key={`${section.title || section.name || "section"}-${index}`}
            className={`${section.title ? "mt-7" : ""}`}
          >
            {section.title && (
              <h2 className="uppercase text-[12px] font-[600] mb-3 text-[#454545]">
                {section.title}
              </h2>
            )}
            {section.products.map((product, productIndex) => (
              <li
                key={`${product.name}-${productIndex}`}
                className="py-1.5 text-[14px] font-[400] text-[#212121]"
              >
                <Link
                  href={product.link}
                  onClick={() => setIsOpen(false)}
                  prefetch={true}
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </div>
        ))}
      </ul>
      {item.getStarted ? (
        <div className="relative mt-8">
          <h2 className="text-[12px] font-[600] mb-5 border-hover text-[#454545]">
            GET STARTED
          </h2>
          <div
            className="relative w-full h-[266px] overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-300 ease-in-out h-full"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {item.getStarted.map((card, index) => (
                <Link
                  key={index}
                  onClick={() => setIsOpen(false)}
                  href={card.getStartedLink}
                  className="w-full h-full flex-shrink-0 relative rounded-[16px] overflow-hidden bg-[linear-gradient(0deg,#a8886c_0%,#d6bba2_100%)] block cursor-pointer group"
                >
                  <div className="absolute left-0 bottom-0 w-full h-full z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_30%,rgba(0,0,0,0)_50%)]"></div>
                  <p className="absolute z-20 p-4 text-[18px] font-[450] text-white headers-font">
                    {card.getStartedText}
                  </p>
                  <div className="absolute z-20 bg-white p-3 flex items-center justify-center rounded-full bottom-4 left-4 group-hover:scale-110 transition-transform">
                    <FaArrowRightLong />
                  </div>
                  <div className="relative w-full h-full flex items-center justify-center p-8">
                    <div className="relative w-[180px] h-[180px] mt-4">
                      <Image
                        className="w-full h-full object-contain"
                        fill
                        src={card.getStartedImage}
                        alt="nav-image"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {item.getStarted.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:text-gray-700 text-2xl z-30 transition-colors"
                >
                  &#8249;
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white  hover:text-gray-700 text-2xl z-30 transition-colors"
                >
                  &#8250;
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                  {item.getStarted.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${index === currentSlide ? "bg-white" : "bg-white/50"
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        item.getStartedLink && (
          <div className="">
            <h2 className="text-[12px] font-[600] mb-5 border-hover text-[#454545]">
              <Link
                onClick={() => setIsOpen(false)}
                href={item.getStartedLink}
                prefetch={true}
              >
                GET STARTED
              </Link>
            </h2>
            <div
              className="relative rounded-[16px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 26.27%)",
              }}
            >
              <p className="absolute !z-[9999] p-4 text-[18px] font-[450] text-[#ffffff] headers-font">
                {item.getStartedText}
              </p>
              <Link
                prefetch={true}
                onClick={() => setIsOpen(false)}
                href={item.getStartedLink}
                className="absolute !z-[99999] bg-white p-3 flex items-center justify-center rounded-full bottom-4 left-4"
              >
                <FaArrowRightLong />
              </Link>
              <div className="relative w-full h-[266px]">
                <div
                  className="absolute left-0 bottom-0 w-full h-full z-50"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 26.27%)",
                  }}
                ></div>
                <Image
                  className="w-full h-full object-cover"
                  fill
                  src={item.getStartedImage}
                  alt="nav-image"
                />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
