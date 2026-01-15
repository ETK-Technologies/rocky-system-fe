"use client";

import { useEffect, useState } from "react";
import { logger } from "@/utils/devLogger";
import { saveDosageSelection } from "@/utils/dosageCookieManager";

const DosageSelectionModal = ({
  isOpen,
  onClose,
  product,
  availableDosages = [],
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

  // Format dosage to add space before "mg"
  const formatDosage = (dosage) => {
    if (!dosage) return "";
    return dosage.replace(/mg/g, " mg");
  };

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
    <div className="fixed w-screen h-screen m-auto bg-[#F5F4EF] z-[9999] top-[0] left-[0] flex flex-col tracking-tight">
      <div className="w-[100%] p-5 mt-5 min-h-fit mx-auto pb-4 flex flex-col items-center h-full overflow-y-scroll">
        <div className="w-full max-w-[500px] p-2">
          <p className="text-[26px] md:text-[32px] mb-4 text-left font-medium">
            Select preferred dose
          </p>
          <p className="text-sm mb-10 text-[#000000] max-w-lg text-left leading-relaxed font-medium">
            Please note this is only a request. The prescription remains at the
            clinician's discretion. If you already have a prescription with us,
            please message your clinician for changes as selections here will
            not be seen.
          </p>

          {availableDosages.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className=" text-base text-left text-[#A0693B]">
                If this is your first time trying this medication, we recommend
                the following dosage strength:
              </p>
              <label htmlFor={`dosage-0`} className="cursor-pointer">
                <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                  <input
                    className="p-2 mr-2"
                    type="radio"
                    name="dose"
                    id={`dosage-0`}
                    value={availableDosages[0]}
                    checked={selectedDose === availableDosages[0]}
                    onChange={handleRadioChange}
                  />{" "}
                  {formatDosage(availableDosages[0])}
                </div>
              </label>

              {availableDosages.length > 1 && (
                <>
                  <p className="mt-5 text-base text-left text-[#A0693B]">
                    If you've used the medication before, you can request the
                    following dosage strength
                    {availableDosages.length > 2 ? "s" : ""}:
                  </p>
                  {availableDosages.slice(1).map(
                    (dosage, index) =>
                      formatDosage(dosage) == "20 mg" && (
                        <label
                          key={index}
                          htmlFor={`dosage-${index + 1}`}
                          className="cursor-pointer"
                        >
                          <div className="p-4 w-full flex gap-2 items-center border border-gray-400 border-solid rounded-lg">
                            <input
                              className="p-2 mr-2"
                              type="radio"
                              name="dose"
                              id={`dosage-${index + 1}`}
                              value={dosage}
                              checked={selectedDose === dosage}
                              onChange={handleRadioChange}
                            />{" "}
                            {formatDosage(dosage)}
                          </div>
                        </label>
                      )
                  )}
                </>
              )}
            </div>
          )}

          {availableDosages.length === 0 && (
            <p className="text-center text-gray-500">
              No dosages available for this product.
            </p>
          )}


    
          <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto px-5 md:px-0 md:w-[520px]  pb-4 flex items-center justify-center z-50">
            <button
              onClick={onContinue}
              disabled={isLoading}
              className=" w-full py-3 bg-black text-white rounded-full font-medium disabled:bg-gray-400 flex items-center justify-center gap-2"
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
      
     
     
    </div>
  );
};

export default DosageSelectionModal;
