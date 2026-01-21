import { useState, useEffect } from "react";
import QuestionTitle from "./Shared/QuestionTitle";

export default function SingleChoiceQuestion({ step, answer, onAnswerChange, onNext, isSubmitting }) {
  const { title, description, options } = step;
  const [showTooltip, setShowTooltip] = useState(null);
  const [zoomState, setZoomState] = useState({ show: false, image: null, x: 0, y: 0 });
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  
  // Reset auto-advancing state when component updates or isSubmitting changes
  useEffect(() => {
    if (isAutoAdvancing && !isSubmitting) {
      setIsAutoAdvancing(false);
    }
  }, [isSubmitting, isAutoAdvancing]);
  
  const [textareaValues, setTextareaValues] = useState({});

  // Update textareaValues when answer changes (for resuming or going back)
  useEffect(() => {
    if (!answer) return;
    
    let textareaValue = null;
    let answerText = null;
    
    if (typeof answer === 'object' && !Array.isArray(answer)) {
      // Extract from nested structures
      if (answer.value?.value?.textareaValue) {
        textareaValue = answer.value.value.textareaValue;
        answerText = answer.value.value.answer || answer.value.answer;
      } else if (answer.value?.textareaValue) {
        textareaValue = answer.value.textareaValue;
        answerText = answer.value.answer;
      } else if (answer.textareaValue) {
        textareaValue = answer.textareaValue;
        answerText = answer.answer;
      }
    }
    
    if (textareaValue && answerText) {
      setTextareaValues({ [answerText]: textareaValue });
    }
  }, [answer]);

  const handleOptionSelect = (option) => {
    const optionText = option.text;
    
    // Preserve textarea value if it exists
    const textareaValue = textareaValues[optionText];
    const answerData = {
      answerType: "text",
      answer: optionText
    };
    
    // Include textarea value if it exists
    if (textareaValue) {
      answerData.textareaValue = textareaValue;
    }
    
    // Handle unselectOther logic
    if (option.unselectOther) {
      // If this option unselects others, just select this one
      onAnswerChange(answerData);
    } else {
      // Check if any other option has unselectOther and is currently selected
      const unselectOtherOption = options.find(opt => opt.unselectOther);
      if (unselectOtherOption && answer === unselectOtherOption.text) {
        // If an unselectOther option is selected, replace it with this one
        onAnswerChange(answerData);
      } else {
        onAnswerChange(answerData);
      }
    }
    
    // Auto-advance if no textarea and onNext is provided
    if (!option.hasTextarea && onNext && !isSubmitting) {
      // Show loading state
      setIsAutoAdvancing(true);
      // Call onNext with the answer data to ensure proper state update
      setTimeout(() => {
        onNext(answerData);
      }, 300);
    }
  };

  const handleTextareaChange = (optionText, value) => {
    setTextareaValues(prev => ({
      ...prev,
      [optionText]: value
    }));
    
    // Update answer to include textarea value
    onAnswerChange({
      answerType: "text",
      answer: optionText,
      textareaValue: value
    });
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
            <div key={index}>
              <button
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

                  {/* Option Image */}
                  {option.hasImage && option.image && (
                    <div 
                      className="relative w-16 h-16 flex-shrink-0"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setZoomState({ show: true, image: option.image, x, y });
                      }}
                      onMouseLeave={() => setZoomState({ show: false, image: null, x: 0, y: 0 })}
                    >
                      <img
                        src={option.image}
                        alt={option.text}
                        className="w-full h-full object-cover rounded-lg cursor-zoom-in"
                      />
                    </div>
                  )}

                  <span className="text-[14px] md:text-[16px] font-medium leading-[140%] tracking-[0%] text-black flex-1">{option.text}</span>

                  {/* Tooltip Icon */}
                  {option.hasTooltip && option.tooltip && (
                    <div 
                      className="relative"
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setShowTooltip(index);
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        setShowTooltip(null);
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors cursor-help"
                      >
                        <span className="text-gray-600 text-sm font-bold">i</span>
                      </div>
                      
                      {showTooltip === index && (
                        <div className="absolute right-0 top-8 z-50 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm text-gray-700">{option.tooltip}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Textarea for selected option */}
              {isSelected && option.hasTextarea && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {option.textareaLabel} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={textareaValues[option.text] || ''}
                    onChange={(e) => handleTextareaChange(option.text, e.target.value)}
                    placeholder={option.textareaPlaceholder}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A7885A] focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading indicator for auto-advance */}
      {isAutoAdvancing && (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-[#A7885A]">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Zoomed Image on Hover */}
      {zoomState.show && zoomState.image && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '256px',
            height: '256px'
          }}
        >
          <div className="relative w-full h-full bg-white rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden">
            <div
              style={{
                width: '400%',
                height: '400%',
                backgroundImage: `url(${zoomState.image})`,
                backgroundSize: 'cover',
                backgroundPosition: `${zoomState.x}% ${zoomState.y}%`,
                transform: `translate(-${zoomState.x}%, -${zoomState.y}%)`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
