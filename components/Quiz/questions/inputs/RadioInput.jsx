export default function RadioInput({ id, label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex">
        {options.map((option, idx) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          const isSelected = value === optionValue;
          
          return (
            <button
              type="button"
              key={idx}
              className={`flex-1 py-3 border text-[16px] font-medium ${
                isSelected
                  ? "border-black bg-white"
                  : "border-[#E5E5E5] bg-white"
              }`}
              onClick={() => onChange(id, optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
