export default function SelectInput({ id, label, placeholder, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <select
        required
        value={value || ""}
        onChange={(e) => onChange(id, e.target.value)}
        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
      >
        <option value="" disabled>
          {placeholder || "Select an option"}
        </option>
        {options.map((option, idx) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          
          return (
            <option key={idx} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}
