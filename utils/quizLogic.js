/**
 * Quiz Branching Logic Engine
 * Determines the next step based on current answer and flow rules
 */

/**
 * Get the next step index based on quiz flow logic
 * @param {Object} quizData - The complete quiz data
 * @param {number} currentStepIndex - Current step index
 * @param {any} currentAnswer - The answer provided for current step
 * @param {Object} allAnswers - All answers so far
 * @returns {number} - Next step index, or -1 if quiz should complete
 */
export function getBranchingLogic(quizData, currentStepIndex, currentAnswer, allAnswers) {
  const steps = quizData.steps || [];
  const flow = quizData.flow || [];
  const currentStep = steps[currentStepIndex];

  if (!currentStep) return -1;

  const currentQuestionId = currentStep.id;

  // Find matching flow rule for current question
  const matchingFlow = flow.find((rule) => {
    // Check if this rule applies to current question
    if (rule.from.questionId !== currentQuestionId) return false;

    // If option is specified in the rule, check if it matches current answer
    if (rule.from.option) {
      const optionText = rule.from.option.text;
      
      // Handle array answers (multiple choice)
      if (Array.isArray(currentAnswer)) {
        return currentAnswer.includes(optionText);
      }
      
      // Handle single value answers
      return currentAnswer === optionText;
    }

    // If no option specified, rule applies to any answer
    return true;
  });

  // If matching flow rule found, navigate to target question
  if (matchingFlow && matchingFlow.to) {
    const targetQuestionId = matchingFlow.to.questionId;
    let targetIndex = steps.findIndex((step) => step.id === targetQuestionId);
    
    if (targetIndex !== -1) {
      // Skip steps marked with shouldSkip
      while (targetIndex < steps.length && steps[targetIndex].shouldSkip === true) {
        targetIndex++;
      }
      
      // Check if we've reached the end after skipping
      if (targetIndex >= steps.length) {
        return -1;
      }
      
      return targetIndex;
    }
  }

  // Default: Go to next step sequentially, skipping steps with shouldSkip = true
  let nextIndex = currentStepIndex + 1;
  
  // Skip all steps marked with shouldSkip
  while (nextIndex < steps.length && steps[nextIndex].shouldSkip === true) {
    nextIndex++;
  }
  
  // Check if we've reached the end
  if (nextIndex >= steps.length) {
    return -1; // Quiz complete
  }

  return nextIndex;
}

/**
 * Build a map of question IDs to step indices for quick lookup
 * @param {Array} steps - Array of quiz steps
 * @returns {Object} - Map of question IDs to indices
 */
export function buildStepIndexMap(steps) {
  const map = {};
  steps.forEach((step, index) => {
    map[step.id] = index;
  });
  return map;
}

/**
 * Validate if an answer is complete for a given step
 * @param {Object} step - The quiz step
 * @param {any} answer - The answer to validate
 * @returns {boolean} - True if answer is valid
 */
export function validateAnswer(step, answer) {
  if (!step) return false;
  if (answer === null || answer === undefined) return false;

  const { stepType, questionType, formInputs } = step;

  // Question validation
  if (stepType === "question") {
    if (questionType === "multiple-choice") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (questionType === "single-choice" || questionType === "dropdown-list") {
      return typeof answer === "string" && answer.length > 0;
    }
  }

  // Form validation
  if (stepType === "form") {
    if (typeof answer !== "object") return false;
    
    // Check if all required inputs have values
    return formInputs.every((input) => {
      const value = answer[input.id];
      return value !== undefined && value !== null && value !== "";
    });
  }

  // Component validation (any answer means viewed)
  if (stepType === "component") {
    return answer === "viewed" || !!answer;
  }

  return false;
}

/**
 * Format answer for API submission
 * @param {any} answer - The raw answer
 * @returns {Object} - Formatted answer object
 */
export function formatAnswerForAPI(answer) {
  if (Array.isArray(answer)) {
    return { value: answer };
  }
  
  if (typeof answer === "object" && answer !== null) {
    return { value: answer };
  }
  
  return { value: answer };
}
