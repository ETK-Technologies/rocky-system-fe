import { useState } from "react";
import QuestionTitle from "./Shared/QuestionTitle";

export default function TrueFalseQuestion({ step, answer, onAnswerChange }) {
  const { title, description, options } = step;

  const handleOptionSelect = (option) => {
    onAnswerChange({ answerType: "text", answer: option.text });
  };

  // Extract answer text if answer is an object
  let selectedAnswer;
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    // Check if answer has value.answer structure (from backend)
    if (answer.value && answer.value.answer) {
      selectedAnswer = answer.value.answer;
    }
    // Check if answer has answer property directly (from UI interaction)
    else if (answer.answer) {
      selectedAnswer = answer.answer;
    }
    // Otherwise use answer as is
    else {
      selectedAnswer = answer;
    }
  } else {
    selectedAnswer = answer;
  }

  return (
    <div>
      <QuestionTitle title={title} description={description} />

      <div className="space-y-4">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === option.text;
          
          return (
            <button
              key={index}
              onClick={() => handleOptionSelect(option)}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                isSelected
                  ? "bg-white shadow-md"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              style={{
                borderColor: isSelected ? '#A7885A' : undefined,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? ""
                      : "border-gray-300"
                  }`}
                  style={{
                    borderColor: isSelected ? '#A7885A' : undefined,
                  }}
                >
                  {isSelected && (
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#A7885A' }} />
                  )}
                </div>

                <span className="text-[14px] md:text-[16px] font-medium leading-[140%] tracking-[0%] text-black flex-1">
                  {option.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
