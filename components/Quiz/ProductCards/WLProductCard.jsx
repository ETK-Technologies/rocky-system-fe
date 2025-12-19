import React, { useState, useEffect } from "react";

const WLProductCard = ({ product, onSelect, isSelected }) => {
  const [showMobilePopup, setShowMobilePopup] = useState(false);

  useEffect(() => {
    if (showMobilePopup) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [showMobilePopup]);

  if (!product) return null;

  // Check if product is available (default to true if not specified)
  const isAvailable = product.supplyAvailable !== false && product.available !== false;

  // Get product name - handle both formats
  const productName = product.title || product.name;
  const showRegistered = product.id !== "490537" && productName !== "Rybelsus";

  return (
    <>
      <div
        className={`bg-[#FFFFFF] flex flex-col gap-2 rounded-2xl p-6 
          ${
            isSelected
              ? "border-2 border-[#A7885A] drop-shadow-lg"
              : "border border-transparent drop-shadow-lg"
          } 
          cursor-pointer transition-all duration-200 ease-in-out 
          hover:shadow-xl hover:scale-[1.01] ${
            isAvailable ? "" : "opacity-75"
          }`}
        onClick={() => isAvailable && onSelect && onSelect(product)}
      >
        <div className="flex justify-between">
          {isAvailable ? (
            <p className="text-[#047000] w-fit bg-[#D0FDD0] rounded-full py-[2px] px-[10px] font-normal text-sm">
              Supply available
            </p>
          ) : (
            <p className="text-[#C53030] w-fit bg-red-400 rounded-full py-[2px] px-[10px] font-normal text-sm">
              Out of stock
            </p>
          )}
          {isSelected && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-[#A7885A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        
        <h2 className="text-xl md:text-2xl text-[#000000] font-medium">
          {productName}
          {showRegistered && (
            <span className="text-sm md:text-base align-top">®</span>
          )}
        </h2>
        
        <p className="text-sm md:text-base text-[#212121]">
          {product.description || product.product_tagline}
        </p>
        
        {product.image && product.image.trim() && (
          <div className="w-full h-full mt-2 relative">
            <img
              src={product.image}
              alt={productName || "Product"}
              className="w-full h-full object-contain rounded-2xl"
              onError={(e) => {
                e.target.style.display = "none";
                const fallback = e.target.nextElementSibling;
                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
            <div className="w-full h-32 bg-gray-200 rounded-lg hidden items-center justify-center text-gray-400 text-sm">
              Product Image
            </div>
          </div>
        )}
        
        {product.details && (
          <p className="text-sm text-[#212121] mt-1">{product.details}</p>
        )}

        {/* Show popup trigger for Rybelsus (oral semaglutide) */}
        {(product.id === "490537" || productName === "Rybelsus") && (
          <p
            className="text-[#AE7E56] text-sm underline text-center mt-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobilePopup(true);
            }}
          >
            See why people are switching to oral.
          </p>
        )}
      </div>

      {/* Oral Semaglutide Popup */}
      {showMobilePopup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-2xl w-full p-6 pb-10 relative sm:rounded-2xl sm:max-w-2xl sm:w-full sm:pb-6">
            <div className="flex justify-end items-center mb-2 cursor-pointer">
              <button
                className="text-xl bg-[#0000001A] rounded-full px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobilePopup(false);
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <h3 className="text-xl font-medium text-[#000000] mb-2">
              The 3 Advantages Of Oral Semaglutide
            </h3>
            <p className="mb-5 text-[#212121] text-sm">
              Oral semaglutide delivers injectable-level results—with none of
              the needles, and all of the lifestyle benefits.
            </p>
            <ol className="list-decimal pl-4 space-y-5">
              <li className="text-[#212121] text-sm">
                <span className="font-semibold text-base text-[#212121]">
                  Equal Weight Loss Results
                </span>
                <br />
                Sublingual semaglutide delivers weight loss results on par with
                injections.
              </li>
              <li className="text-[#212121] text-sm">
                <span className="font-semibold text-base text-[#212121]">
                  Needle-Free Option
                </span>
                <br />
                No injections – Just a quick under-tongue dose any time of the
                day.
              </li>
              <li className="text-[#212121] text-sm">
                <span className="font-semibold text-base text-[#212121]">
                  No Refrigeration Needed
                </span>
                <br />
                Room-temperature stable—stash it in a purse, desk, or carry-on
                with zero cold-chain hassle.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};

export default WLProductCard;
