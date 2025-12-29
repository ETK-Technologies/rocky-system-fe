"use client";

import { useState } from "react";

export default function AboutYourMedication({ step, answer, onAnswerChange, onBack }) {
  const [acknowledged, setAcknowledged] = useState(answer || "");

  const handleSelect = (value) => {
    setAcknowledged(value);
    onAnswerChange({ answerType: "text", answer: value });
  };

  return (
    <div className="w-full subheaders-font">
      <div className="pt-6 pb-4">
        <h1 className="text-[26px] md:text-[32px] mb-6">
          About your medication
        </h1>

        <div className="text-left md:mx-auto">
          <h3 className="quiz-subheading text-[14px] md:text-[16px] text-left pt-1">
            Intended benefits of Cialis(Tadalafil) /
            Viagra(Sildenafil) for sexual health:
          </h3>
          <ul className="list-disc ml-7 mt-3 text-[#AE7E56] marker:text-[#AE7E56]">
            <li className="text-[16px] md:text-[18px] text-left font-medium mb-3">
              To help get and/or maintain an erection
            </li>
          </ul>

          <span className="block border-b border-gray-300 mt-2"></span>

          <h3 className="quiz-subheading text-[12px] text-left font-normal pt-2 text-gray-600 mb-4">
            *This isn't a full list of potential side
            effects. To learn more, please book an
            appointment or send a message to your clinician
          </h3>
          <h3 className="quiz-subheading md:text-[18px] text-left font-semibold pt-4 mt-2">
            Possible Side Effects:
          </h3>

          <ul className="list-disc pl-4 mb-4 mt-3">
            <li className="md:text-[14px] text-left font-normal mb-1">
              Headaches
            </li>
            <li className="md:text-[14px] text-left font-normal mb-1">
              Facial flushing
            </li>
            <li className="md:text-[14px] text-left font-normal mb-1">
              Muscle pain
            </li>
            <li className="md:text-[14px] text-left font-normal mb-1">
              Indigestion
            </li>
            <li className="md:text-[14px] text-left font-normal">
              Low blood pressure
            </li>
          </ul>

          <span className="block border-b border-gray-300 mt-2"></span>

          <h3 className="quiz-subheading md:text-[12px] text-left font-normal pt-2 text-gray-600">
            *This isn't a full list of potential side
            effects. To learn more, please book an
            appointment or send a message to your clinician
          </h3>

          <span className="block border-b border-gray-300 mt-2"></span>
        </div>

        <div className="quiz-options-wrapper flex flex-col flex-wrap items-center justify-center py-3 pb-6 md:mx-auto">
          <div
            className="quiz-option-1 text-left w-full flex items-start mb-4"
            data-option="1"
          >
            <input
              id="medication_0"
              className="mt-[5px] w-3 h-3 min-w-3 min-h-3 flex-shrink-0 appearance-none border-2 border-gray-400 rounded-full checked:bg-[#AE7E56] checked:border-transparent focus:outline-none"
              type="radio"
              name="medication"
              value="I have read and understood the intended benefits and possible side effects and do not have any questions"
              checked={
                acknowledged ===
                "I have read and understood the intended benefits and possible side effects and do not have any questions"
              }
              onChange={() =>
                handleSelect(
                  "I have read and understood the intended benefits and possible side effects and do not have any questions"
                )
              }
            />
            <label
              htmlFor="medication_0"
              className="quiz-option-label leading-[140%] cursor-pointer pl-2 text-md"
            >
              I have read and understood the intended
              benefits and possible side effects and do not
              have any questions
            </label>
          </div>

          <div
            className="quiz-option-1 text-left w-full flex items-start mb-4"
            data-option="1"
          >
            <input
              id="medication_1"
              className="mt-[3px] w-3 h-3 min-w-3 min-h-3 flex-shrink-0 appearance-none border-2 border-gray-400 rounded-full checked:bg-[#AE7E56] checked:border-transparent focus:outline-none"
              type="radio"
              name="medication"
              value="I have questions and will book a phone call"
              checked={
                acknowledged ===
                "I have questions and will book a phone call"
              }
              onChange={() =>
                handleSelect(
                  "I have questions and will book a phone call"
                )
              }
            />
            <label
              htmlFor="medication_1"
              className="quiz-option-label leading-[140%] cursor-pointer pl-2 text-md"
            >
              I have questions and will book a phone call
            </label>
          </div>
        </div>

        <p className="error-box text-red-500 hidden m-2 text-center text-sm"></p>
      </div>
    </div>
  );
}
