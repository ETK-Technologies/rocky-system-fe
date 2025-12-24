import { useState, useEffect } from "react";

export default function MultiSelectInput({ id, label, placeholder, options, value, onChange }) {
  const [selectedOptions, setSelectedOptions] = useState(
    value ? (Array.isArray(value) ? value : [value]) : []
  );

  useEffect(() => {
    if (value && Array.isArray(value)) {
      setSelectedOptions(value);
    }
  }, [value]);

  const handleOptionToggle = (optionValue) => {
    let newSelection;
    
    if (selectedOptions.includes(optionValue)) {
      newSelection = selectedOptions.filter((opt) => opt !== optionValue);
    } else {
      newSelection = [...selectedOptions, optionValue];
    }

    setSelectedOptions(newSelection);
    onChange(id, newSelection);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      {placeholder && (
        <p className="text-sm text-gray-500 mb-2">{placeholder}</p>
      )}
      <div className="space-y-2">
        {options.map((option, idx) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          const isSelected = selectedOptions.includes(optionValue);
          
          return (
            <button
              type="button"
              key={idx}
              onClick={() => handleOptionToggle(optionValue)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-[#A7885A] bg-[#FBF9F7]"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "border-[#A7885A] bg-[#A7885A]"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900">{optionLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
      {selectedOptions.length === 0 && (
        <p className="text-xs text-red-500 mt-1">Please select at least one option</p>
      )}
    </div>
  );
}
