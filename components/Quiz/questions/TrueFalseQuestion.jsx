import { useState, useEffect } from "react";
import QuestionTitle from "./Shared/QuestionTitle";

export default function TrueFalseQuestion({ step, answer, onAnswerChange, onNext, isSubmitting }) {
  const { title, description, options } = step;
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

  // Reset auto-advancing state when component updates or isSubmitting changes
  useEffect(() => {
    if (isAutoAdvancing && !isSubmitting) {
      setIsAutoAdvancing(false);
    }
  }, [isSubmitting, isAutoAdvancing]);

  const handleOptionSelect = (option) => {
    const answerData = { answerType: "text", answer: option.text };
    onAnswerChange(answerData);
    
    // Auto-advance after selection
    if (onNext && !isSubmitting) {
      // Show loading state
      setIsAutoAdvancing(true);
      // Small delay for UX feedback and pass answer data
      setTimeout(() => {
        onNext(answerData);
      }, 300);
    }
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

      {/* Loading indicator for auto-advance */}
      {isAutoAdvancing && (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
