import { useState } from "react";
import RadioInput from "./inputs/RadioInput";
import DateInput from "./inputs/DateInput";
import TextInput from "./inputs/TextInput";
import TextareaInput from "./inputs/TextareaInput";
import SelectInput from "./inputs/SelectInput";
import MultiSelectInput from "./inputs/MultiSelectInput";

export default function FormStep({ step, answer, onAnswerChange }) {
  const { title, description, formInputs } = step;
  const [formData, setFormData] = useState(answer || {});

  const handleInputChange = (inputId, value) => {
    const updated = { ...formData, [inputId]: value };
    setFormData(updated);
    onAnswerChange({ answerType: "text", answer: updated });
  };

  return (
    <div>
      <h2 className="subheaders-font text-[26px] md:text-[32px] font-medium leading-[120%] text-gray-900 mb-2">{title}</h2>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}

      <div className="space-y-4">
        {formInputs.map((input) => {
          const { id, type, label, placeholder, options } = input;

          if (type === "radio") {
            return (
              <RadioInput
                key={id}
                id={id}
                label={label}
                options={options}
                value={formData[id]}
                onChange={handleInputChange}
              />
            );
          }

          if (type === "date") {
            return (
              <DateInput
                key={id}
                id={id}
                label={label}
                placeholder={placeholder}
                value={formData[id]}
                onChange={handleInputChange}
              />
            );
          }

          if (type === "textarea") {
            return (
              <TextareaInput
                key={id}
                id={id}
                label={label}
                placeholder={placeholder}
                value={formData[id]}
                onChange={handleInputChange}
              />
            );
          }

          if (type === "select") {
            return (
              <SelectInput
                key={id}
                id={id}
                label={label}
                placeholder={placeholder}
                options={options}
                value={formData[id]}
                onChange={handleInputChange}
              />
            );
          }

          if (type === "multi") {
            return (
              <MultiSelectInput
                key={id}
                id={id}
                label={label}
                placeholder={placeholder}
                options={options}
                value={formData[id]}
                onChange={handleInputChange}
              />
            );
          }

          return (
            <TextInput
              key={id}
              id={id}
              type={type}
              label={label}
              placeholder={placeholder}
              value={formData[id]}
              onChange={handleInputChange}
            />
          );
        })}
      </div>
    </div>
  );
}
