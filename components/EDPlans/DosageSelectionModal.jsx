"use client";

import { useEffect, useState } from "react";
import { logger } from "@/utils/devLogger";
import CustomImage from "../utils/CustomImage";
import { saveDosageSelection } from "@/utils/dosageCookieManager";

const DosageSelectionModal = ({
  isOpen,
  onClose,
  product,
  selectedDose,
  setSelectedDose,
  onContinue,
  isLoading = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Log product info when modal opens
      logger.log("DosageSelectionModal opened with product:", product);

      // Save the default dosage selection when modal opens
      if (product?.id && selectedDose) {
        logger.log(
          "Saving default dosage for product:",
          product.id,
          "with dose:",
          selectedDose
        );
        saveDosageSelection(product.id.toString(), selectedDose);
      }
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup on component unmount or when isOpen changes
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, product, selectedDose]);
  if (!isOpen) return null;

  const handleRadioChange = (e) => {
    const newDose = e.target.value;
    logger.log("Radio changed to:", newDose);
    logger.log("Current product in modal:", product);
    setSelectedDose(newDose);

    // Save the dosage selection to cookie if we have a product ID
    if (product?.id) {
      logger.log(
        "Saving dosage for product:",
        product.id,
        "with dose:",
        newDose
      );
      saveDosageSelection(product.id.toString(), newDose);
    } else {
      logger.log("No product ID available for saving dosage");
    }
  };

  return (
    <div className="fixed w-screen h-screen m-auto bg-[#FFFFFF] z-[9999] top-[0] left-[0] flex flex-col tracking-tight">
      <div className="w-[100%] p-5 mt-5 min-h-fit mx-auto pb-4 flex flex-col items-center h-full overflow-y-scroll">
        <div className="w-full max-w-[500px] p-2">
          <p className="mb-4 text-3xl lg:text-5xl font-bold headers-font">
            Select preferred dose
          </p>
          <p className="text-sm mb-10 text-[#00000073]">
            Please note this is only a request. The prescription remains at the
            clinician's discretion. If you already have a prescription with us,
            please message your clinician for changes as selections here will
            not be seen.
          </p>

          {(product.name === "Viagra" || product.name === "Sildenafil") && (
            <div className="flex flex-col gap-4">
              <p>
                If this is your first time trying this medication, we recommend
                the following dosage strength:
              </p>
              <label htmlFor="50" className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id="50"
                    value="50mg"
                    checked={selectedDose === "50mg"}
                    onChange={handleRadioChange}
                  />{" "}
                  50mg
                </div>
              </label>
              <p className="mt-5">
                If you've used the medication before, you can request the
                following dosage strength:
              </p>
              <label htmlFor="100" className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id="100"
                    value="100mg"
                    checked={selectedDose === "100mg"}
                    onChange={handleRadioChange}
                  />{" "}
                  100mg
                </div>
              </label>
            </div>
          )}

          {(product.name === "Cialis" || product.name === "Tadalafil" || product.name === "Chewalis") && (
            <div className="flex flex-col gap-4">
              <p>
                If this is your first time trying this medication, we recommend
                the following dosage strength:
              </p>
              <label htmlFor="10" className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id="10"
                    value="10mg"
                    checked={selectedDose === "10mg"}
                    onChange={handleRadioChange}
                  />{" "}
                  10mg
                </div>
              </label>
              <p className="mt-5">
                If you've used the medication before, you can request the
                following dosage strength:
              </p>
              <label htmlFor="20" className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id="20"
                    value="20mg"
                    checked={selectedDose === "20mg"}
                    onChange={handleRadioChange}
                  />{" "}
                  20mg
                </div>
              </label>
            </div>
          )}

          {product.name === "Cialis + Viagra" && (
            <div className="flex flex-col gap-4">
              <p>
                If this is your first time trying this medication, we recommend
                the following dosage strength:
              </p>
              <label htmlFor="10/50" className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id="10/50"
                    value="10/50mg"
                    checked={selectedDose === "10/50mg"}
                    onChange={handleRadioChange}
                  />{" "}
                  10/50mg
                </div>
              </label>
              <p className="mt-5">
                If you've used the medication before, you can request the
                following dosage strength:
              </p>
              <label htmlFor="20/100" className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id="20/100"
                    value="20/100mg"
                    checked={selectedDose === "20/100mg"}
                    onChange={handleRadioChange}
                  />{" "}
                  20/100mg
                </div>
              </label>
            </div>
          )}

          <div className="w-full flex justify-center">
            <button
              onClick={onContinue}
              disabled={isLoading}
              className="bg-[#814B00] p-[13px] px-[60px] rounded-lg text-white font-bold mt-[46px] disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Adding to cart...</span>
                </>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="leading-[21px] font-bold new-popup-dialog-close-button absolute top-[5px] right-[5px] md:top-[20px] md:right-[40px] z-[99999] cursor-pointer border border-gray-400 border-solid rounded-[25px] w-[25px] h-[25px] text-center text-black"
      >
        x
      </button>
    </div>
  );
};

export default DosageSelectionModal;
