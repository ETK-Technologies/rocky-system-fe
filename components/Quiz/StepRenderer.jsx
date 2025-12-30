import MultipleChoiceQuestion from "./questions/MultipleChoiceQuestion";
import SingleChoiceQuestion from "./questions/SingleChoiceQuestion";
import DropdownQuestion from "./questions/DropdownQuestion";
import FormStep from "./questions/FormStep";
import ComponentStep from "./questions/ComponentStep";
import PrivacyText from "./PrivacyText";
import TrueFalseQuestion from "./questions/TrueFalseQuestion";

export default function StepRenderer({ step, answer, onAnswerChange, onBack, onNext }) {
  if (!step) return null;

  const { stepType, questionType, title, description } = step;

  // Render based on step type
  if (stepType === "question") {
    switch (questionType) {
      case "multiple-choice":
        return (
          <>
            <MultipleChoiceQuestion
              step={step}
              answer={answer}
              onAnswerChange={onAnswerChange}
            />
            <PrivacyText />
          </>
        );

      case "single-choice":
        return (
          <>
            <SingleChoiceQuestion
              step={step}
              answer={answer}
              onAnswerChange={onAnswerChange}
            />
            <PrivacyText />
          </>
        );


       case "true-false":
        return (
          <>
            <TrueFalseQuestion
              step={step}
              answer={answer}
              onAnswerChange={onAnswerChange}
            />
            <PrivacyText />
          </>
        );

      case "dropdown-list":
        return (
          <>
            <DropdownQuestion
              step={step}
              answer={answer}
              onAnswerChange={onAnswerChange}
            />
            <PrivacyText />
          </>
        );

      default:
        return (
          <div className="text-center text-gray-500">
            <p>Unknown question type: {questionType}</p>
          </div>
        );
    }
  }

  if (stepType === "form") {
    return (
      <>
        <FormStep
          step={step}
          answer={answer}
          onAnswerChange={onAnswerChange}
        />
        <PrivacyText />
      </>
    );
  }

  if (stepType === "component") {
    return (
      <>
        <ComponentStep
          step={step}
          answer={answer}
          onAnswerChange={onAnswerChange}
          onBack={onBack}
          onNext={onNext}
        />
        <PrivacyText />
      </>
    );
  }

  return (
    <div className="text-center text-gray-500">
      <p>Unknown step type: {stepType}</p>
    </div>
  );
}
