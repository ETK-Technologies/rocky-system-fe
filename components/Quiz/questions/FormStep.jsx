import { useState, useEffect } from "react";
import RadioInput from "./inputs/RadioInput";
import DateInput from "./inputs/DateInput";
import TextInput from "./inputs/TextInput";
import TextareaInput from "./inputs/TextareaInput";
import SelectInput from "./inputs/SelectInput";
import MultiSelectInput from "./inputs/MultiSelectInput";
import QuestionTitle from "./Shared/QuestionTitle";

export default function FormStep({ step, answer, onAnswerChange }) {
  const { title, description, formInputs } = step;
  const [formData, setFormData] = useState(answer || {});

  // Sync formData with answer prop when it changes
  useEffect(() => {
    if (answer) {
      // Extract the actual answer from nested structure
      let answerValue;
      
      if (typeof answer === 'object') {
        // Check if answer has value.answer structure (from backend)
        if (answer.value && answer.value.answer) {
          answerValue = answer.value.answer;
        }
        // Check if answer has answer property directly (from UI interaction)
        else if (answer.answer) {
          answerValue = answer.answer;
        }
        // Otherwise use answer as is
        else {
          answerValue = answer;
        }
      } else {
        answerValue = answer;
      }
      
      setFormData(answerValue || {});
    } else {
      setFormData({});
    }
  }, [JSON.stringify(answer)]);

  const handleInputChange = (inputId, value) => {
    const updated = { ...formData, [inputId]: value };
    setFormData(updated);
    onAnswerChange({ answerType: "text", answer: updated });
  };

  return (
    <div>
      <QuestionTitle title={title} description={description} />

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
