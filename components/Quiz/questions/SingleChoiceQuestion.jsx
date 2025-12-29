import { useState } from "react";

export default function SingleChoiceQuestion({ step, answer, onAnswerChange }) {
  const { title, description, options } = step;
  const [showTooltip, setShowTooltip] = useState(null);
  const [zoomState, setZoomState] = useState({ show: false, image: null, x: 0, y: 0 });
  const [textareaValues, setTextareaValues] = useState({});

  const handleOptionSelect = (option) => {
    const optionText = option.text;
    
    // Handle unselectOther logic
    if (option.unselectOther) {
      // If this option unselects others, just select this one
      onAnswerChange({ answerType: "text", answer: optionText });
    } else {
      // Check if any other option has unselectOther and is currently selected
      const unselectOtherOption = options.find(opt => opt.unselectOther);
      if (unselectOtherOption && answer === unselectOtherOption.text) {
        // If an unselectOther option is selected, replace it with this one
        onAnswerChange({ answerType: "text", answer: optionText });
      } else {
        onAnswerChange({ answerType: "text", answer: optionText });
      }
    }
  };

  const handleTextareaChange = (optionText, value) => {
    setTextareaValues(prev => ({
      ...prev,
      [optionText]: value
    }));
    
    // Don't update answer, just update local textarea state
    // The textarea data will be included in form submission
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
