export default function DropdownQuestion({ step, answer, onAnswerChange }) {
  const { title, description, options } = step;

  const handleChange = (e) => {
    onAnswerChange({ answerType: "text", answer: e.target.value });
  };

  return (
    <div>
      <h2 className="subheaders-font text-[26px] md:text-[32px] font-medium leading-[120%] text-gray-900 mb-2">{title}</h2>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}

      <select
        value={answer || ""}
        onChange={handleChange}
        className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-[14px] md:text-[16px] font-medium leading-[140%] tracking-[0%] text-black"
      >
        <option value="">Select an option...</option>
        {options.map((option, index) => (
          <option key={index} value={option.text} className="text-[14px] md:text-[16px] font-medium leading-[140%] tracking-[0%] text-black">
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
}
