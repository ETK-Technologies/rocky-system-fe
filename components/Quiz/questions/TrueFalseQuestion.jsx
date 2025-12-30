import { useState } from "react";

export default function TrueFalseQuestion({ step, answer, onAnswerChange }) {
  const { title, description, options } = step;

  const handleOptionSelect = (option) => {
    onAnswerChange({ answerType: "text", answer: option.text });
  };

  // Extract answer text if answer is an object
  const selectedAnswer = answer && typeof answer === 'object' && !Array.isArray(answer) && answer.answer 
    ? answer.answer 
    : answer;

  return (
    <div>
      <h2 className="subheaders-font text-[26px] md:text-[32px] font-medium leading-[120%] text-gray-900 mb-8">{title}</h2>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}

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
