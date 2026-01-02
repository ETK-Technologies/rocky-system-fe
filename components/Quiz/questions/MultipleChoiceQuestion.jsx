import { useState, useEffect } from "react";

export default function MultipleChoiceQuestion({ step, answer, onAnswerChange }) {
  // Helper function to extract answer from nested structure
  const extractAnswer = (answer) => {
    console.log("🔍 MultipleChoice extractAnswer - RAW INPUT:", answer);
    
    if (!answer) return [];
    
    let answerValue;
    
    // If answer is already an array, check if it contains objects that need extraction
    if (Array.isArray(answer)) {
      console.log("📦 Answer is already an array:", answer);
      // Check if first item has nested structure
      if (answer[0] && typeof answer[0] === 'object' && answer[0].value) {
        answerValue = answer[0].value.answer;
      } else {
        answerValue = answer;
      }
    } else if (typeof answer === 'object') {
      // Check for triple-nested value.value.value.answer structure (from backend)
      if (answer.value?.value?.value?.answer) {
        console.log("🔑🔑🔑 Found answer.value.value.value.answer (triple nested):", answer.value.value.value.answer);
        answerValue = answer.value.value.value.answer;
      }
      // Check for double-nested value.value.answer structure
      else if (answer.value?.value?.answer) {
        console.log("🔑🔑 Found answer.value.value.answer (double nested):", answer.value.value.answer);
        answerValue = answer.value.value.answer;
      }
      // Check if answer has value.answer structure (from backend)
      else if (answer.value && answer.value.answer) {
        console.log("🔑 Found answer.value.answer:", answer.value.answer);
        answerValue = answer.value.answer;
      }
      // Check if answer has answer property directly (from UI interaction)
      else if (answer.answer) {
        console.log("🔑 Found answer.answer:", answer.answer);
        answerValue = answer.answer;
      }
      // Otherwise use answer as is
      else {
        console.log("⚠️ Using answer as is");
        answerValue = answer;
      }
    } else {
      answerValue = answer;
    }
    
    const result = Array.isArray(answerValue) ? answerValue : [answerValue];
    console.log("✅ MultipleChoice extractAnswer - RESULT:", result);
    return result;
  };

  const [selectedOptions, setSelectedOptions] = useState(extractAnswer(answer));
  const [showTooltip, setShowTooltip] = useState(null);
  const [zoomState, setZoomState] = useState({ show: false, image: null, x: 0, y: 0 });
  const [textareaValues, setTextareaValues] = useState({});

  const { title, description, options } = step;

  // Sync selectedOptions with answer prop when it changes
  useEffect(() => {
    const answerArray = extractAnswer(answer);
    setSelectedOptions(answerArray);
    console.log("🎯 MultipleChoice selectedOptions updated to:", answerArray);
  }, [JSON.stringify(answer)]);

  const handleOptionToggle = (option) => {
    const optionText = option.text;
    let newSelection;
    
    if (selectedOptions.includes(optionText)) {
      // Deselect this option
      newSelection = selectedOptions.filter((opt) => opt !== optionText);
    } else {
      // Handle unselectOther logic
      if (option.unselectOther) {
        // If this option unselects others, select only this one
        newSelection = [optionText];
      } else {
        // Check if any option with unselectOther is selected
        const unselectOtherOption = options.find(opt => opt.unselectOther);
        if (unselectOtherOption && selectedOptions.includes(unselectOtherOption.text)) {
          // Remove the unselectOther option and add this one
          newSelection = selectedOptions.filter(opt => opt !== unselectOtherOption.text);
          newSelection.push(optionText);
        } else {
          // Normal toggle
          newSelection = [...selectedOptions, optionText];
        }
      }
    }

    setSelectedOptions(newSelection);
    onAnswerChange({ answerType: "text", answer: newSelection });
  };

  const handleTextareaChange = (optionText, value) => {
    setTextareaValues(prev => ({
      ...prev,
      [optionText]: value
    }));
    
    // Don't update answer, just update local textarea state
    // The textarea data will be included in form submission
  };

  return (
    <div>
      <h2 className="subheaders-font text-[26px] md:text-[32px] font-medium leading-[120%] text-gray-900 mb-8">{title}</h2>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}

      <div className="space-y-4">
        {options.map((option, index) => {
          const isSelected = selectedOptions.includes(option.text);
          
          return (
            <div key={index}>
              <button
                onClick={() => handleOptionToggle(option)}
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
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? ""
                        : "border-gray-300"
                    }`}
                    style={{
                      borderColor: isSelected ? '#A7885A' : undefined,
                      backgroundColor: isSelected ? '#A7885A' : undefined,
                    }}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
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
