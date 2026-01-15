import { useEffect, useRef, useState } from "react";
import { useStepNavigation } from "../../hooks/useStepNavigation";
import { useQuizData } from "../../hooks/useQuizData";
import { quizConfig } from "../config/quizConfig";
import { logger } from "@/utils/devLogger";
import { getCookieName } from "@/utils/storagePrefix";

export function useAcneQuiz() {
  // Local storage + background queue (mirrors hair questionnaire resilience)
  const storageKey = "quiz-form-data-acne";
  const storageExpiryKey = "quiz-form-data-acne-expiry";

  // Read stored step index before initializing navigation
  const getStoredStepIndex = () => {
    if (typeof window === "undefined") return 1;
    try {
      const ttl = window.localStorage.getItem(storageExpiryKey);
      if (ttl && Date.now() < parseInt(ttl)) {
        const stored = JSON.parse(
          window.localStorage.getItem(storageKey) || "{}"
        );
        return stored.stepIndex || 1;
      }
      return 1;
    } catch (e) {
      return 1;
    }
  };

  const initialStep = getStoredStepIndex();

  // Track the highest step the user has reached (to prevent skipping forward)
  const [maxReachedStep, setMaxReachedStep] = useState(initialStep);
  // Track if we're currently submitting data from popup (for loading states)
  const [isSubmittingPopupData, setIsSubmittingPopupData] = useState(false);

  const {
    currentStep: stepIndex,
    progressPercent: progress,
    goToStep,
    handleContinue: baseHandleContinue,
    handleBack: baseHandleBack,
  } = useStepNavigation(quizConfig, initialStep);

  // Read stored data synchronously for initial state
  const getInitialData = () => {
    if (typeof window === "undefined") return {};
    try {
      const ttl = window.localStorage.getItem(storageExpiryKey);
      if (ttl && Date.now() < parseInt(ttl)) {
        const stored = JSON.parse(
          window.localStorage.getItem(storageKey) || "{}"
        );
        return stored.answers || {};
      }
      return {};
    } catch (e) {
      return {};
    }
  };

  // Read DOB and phone number from cookies
  const getCookieData = () => {
    if (typeof window === "undefined") return { dob: "", phone: "" };
    try {
      // Get prefixed cookie names - only read prefixed to ensure project isolation
      const prefixedDOB = getCookieName("DOB");
      const prefixedDob = getCookieName("dob");
      const prefixedPn = getCookieName("pn");
      
      // Only read prefixed DOB cookie names (uppercase and lowercase)
      const dobUpper =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${prefixedDOB}=`))
          ?.split("=")[1] || "";

      const dobLower =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${prefixedDob}=`))
          ?.split("=")[1] || "";

      const dobRaw = dobUpper || dobLower;
      const dob = dobRaw ? decodeURIComponent(dobRaw) : "";

      const phoneRaw =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${prefixedPn}=`))
          ?.split("=")[1] || "";

      const phone = phoneRaw ? decodeURIComponent(phoneRaw) : "";

      // Debug logging
      logger.log("Cookie data read:", { dob, phone });
      logger.log("DOB raw:", dobRaw);
      logger.log("Phone raw:", phoneRaw);

      return { dob, phone };
    } catch (e) {
      logger.warn("Error reading cookies:", e);
      return { dob: "", phone: "" };
    }
  };

  const {
    userData: answers,
    setUserData: setAnswers,
    activePopup: popupType,
    selectedProduct: recommendedProduct,
    setSelectedProduct: setRecommendedProduct,
    handleAction: baseHandleAction,
    closePopup,
    handleRecommendationContinue: baseHandleRecommendationContinue,
  } = useQuizData(() => {
    const storedData = getInitialData();
    const cookieData = getCookieData();

    // Include DOB and phone number from cookies with correct IDs
    const initialData = {
      ...storedData,
      158: cookieData.dob || storedData[158],
      132: cookieData.phone || storedData[132],
    };

    // Debug logging
    logger.log("Initial data with DOB and phone:", initialData);
    logger.log("DOB value:", initialData[158]);
    logger.log("Phone value:", initialData[132]);

    return initialData;
  });

  const pendingRef = useRef([]);
  const syncingRef = useRef(false);
  const metaRef = useRef({ id: "", token: "", acne_entrykey: "" });
  const isInitializedRef = useRef(false); // Track if initial restoration is complete

  const readLocalStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      const ttl = window.localStorage.getItem(storageExpiryKey);
      if (ttl && Date.now() < parseInt(ttl)) {
        return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      }
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(storageExpiryKey);
      return null;
    } catch (e) {
      return null;
    }
  };

  const writeLocalStorage = (data) => {
    if (typeof window === "undefined") return;
    try {
      const now = Date.now();
      const ttl = now + 1000 * 60 * 60; // 1h
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      window.localStorage.setItem(storageExpiryKey, ttl.toString());
    } catch (e) { }
  };

  // Initialize entrykey cookie and restore any saved progress
  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/Acne", { method: "GET", credentials: "include" });
      } catch (e) {
        logger.warn("Failed to prefetch acne entrykey", e);
      }
      const stored = readLocalStorage();
      if (stored) {
        try {
          // Restore meta (answers are already restored via initial state)
          if (stored.meta)
            metaRef.current = { ...metaRef.current, ...stored.meta };

          // Restore the step index and max reached step
          if (stored.stepIndex !== undefined) {
            goToStep(stored.stepIndex);
            setMaxReachedStep(stored.maxReachedStep || stored.stepIndex);
          }
        } catch (e) {
          logger.error("Error restoring quiz state:", e);
        }
      }
      // Mark initialization as complete
      isInitializedRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on changes (but only after initial restoration is complete)
  useEffect(() => {
    // Skip persisting on initial mount to avoid overwriting restored meta
    if (!isInitializedRef.current) return;

    writeLocalStorage({
      answers,
      stepIndex,
      progress,
      maxReachedStep,
      meta: metaRef.current,
    });
  }, [answers, stepIndex, progress, maxReachedStep]);

  // Track last submitted question to prevent duplicate submissions
  const lastSubmittedRef = useRef({});

  const enqueueSubmission = (payload, skipDuplicateCheck = false) => {
    // Avoid enqueuing empty payloads
    const clean = Object.fromEntries(
      Object.entries(payload || {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    );
    if (Object.keys(clean).length === 0) return;

    // For single question submissions, check if we've already submitted this exact answer
    // But skip this check if it's from a Continue button click
    if (Object.keys(clean).length === 1 && !skipDuplicateCheck) {
      const questionId = Object.keys(clean)[0];
      const answerValue = clean[questionId];

      // Skip if we've already submitted this exact answer for this question
      if (lastSubmittedRef.current[questionId] === answerValue) {
        return;
      }

      // Update our tracking of the last submitted answer
      lastSubmittedRef.current[questionId] = answerValue;
    }

    pendingRef.current = [
      ...pendingRef.current,
      { data: clean, ts: Date.now() },
    ];
    processQueue();
  };

  const processQueue = async () => {
    if (syncingRef.current || pendingRef.current.length === 0) return;
    syncingRef.current = true;
    try {
      // Oldest first
      pendingRef.current.sort((a, b) => a.ts - b.ts);
      const { data } = pendingRef.current[0];
      const result = await submitFormData(data);
      if (result && (result.id || result.token || result.acne_entrykey)) {
        metaRef.current = {
          id: result.id || metaRef.current.id,
          token: result.token || metaRef.current.token,
          acne_entrykey: result.acne_entrykey || metaRef.current.acne_entrykey,
        };
        writeLocalStorage({
          answers,
          stepIndex,
          progress,
          meta: metaRef.current,
        });
      }
    } catch (e) {
      logger.error("Acne sync error:", e);
    } finally {
      pendingRef.current = pendingRef.current.slice(1);
      syncingRef.current = false;
      if (pendingRef.current.length > 0) processQueue();
    }
  };

  const submitFormData = async (specificData = null, cleanedAnswers = null) => {
    try {
      const essentialData = {
        form_id: quizConfig.form_id || 10,
        action: "skincare_acne",
        acne_entrykey: metaRef.current.acne_entrykey || "",
        id: metaRef.current.id || "",
        token: metaRef.current.token || "",
        stage: "consultation-after-checkout",
        page_step: stepIndex,
        completion_state: specificData?.completion_state || "Partial",
        completion_percentage: specificData?.completion_percentage || progress,
        source_site: "https://myrocky.com",
      };

      // Transform answers into {questionId: answerLabel}

      // Use cleaned answers if provided, otherwise use current answers
      const answersToUse = cleanedAnswers || answers;
      let allData = transformAnswersForApi(answersToUse);

      // If we have specific data, clean any textarea data that shouldn't be included
      if (specificData) {
        // Find the current step config to check if it's a radio-text question
        const currentStepConfig = quizConfig.steps[stepIndex];
        if (
          currentStepConfig &&
          currentStepConfig.type === "radio-text" &&
          currentStepConfig.textField
        ) {
          // Get the current answer from specificData
          const currentAnswer = specificData[currentStepConfig.id];
          const selectedOption = currentStepConfig.options?.find(
            (opt) => opt.label === currentAnswer
          );

          // If the selected option doesn't require text input, remove textarea data
          if (!selectedOption?.showTextInput) {
            const textareaKey = `${currentStepConfig.id}-textarea`;
            delete allData[textareaKey];
          }
        }
      }

      // If we have specific data, merge it with all existing answers
      // This ensures we send complete form data with the new question data
      const dataToSubmit = specificData
        ? { ...allData, ...specificData }
        : allData;

      const response = await fetch("/api/Acne", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...essentialData, ...dataToSubmit }),
        credentials: "include",
      });

      const data = await response.json();
      if (data.error) {
        logger.error("Acne submission error:", data.msg || data.error_message);
        return null;
      }
      // Update meta from server
      metaRef.current = {
        id: data.id || metaRef.current.id,
        token: data.token || metaRef.current.token,
        acne_entrykey: data.acne_entrykey || metaRef.current.acne_entrykey,
      };
      writeLocalStorage({
        answers,
        stepIndex,
        progress,
        meta: metaRef.current,
      });
      return data;
    } catch (error) {
      logger.error("Error submitting acne form:", error);
      return null;
    }
  };

  // Only submit once per step: we enqueue on handleNext rather than on every change
  // so remove automatic enqueue from setAnswers calls.

  // Separate function to submit data - only called when Continue button is clicked
  const submitCurrentStepData = async (overrideData = null) => {
    // Use override data if provided, otherwise use current answers
    let dataToUse = overrideData || answers;

    // Clean up text fields for radio-text questions where the selected option doesn't require text input
    const currentStepConfig = quizConfig.steps[stepIndex];
    if (
      currentStepConfig &&
      currentStepConfig.type === "radio-text" &&
      currentStepConfig.textField
    ) {
      const currentAnswer = dataToUse[currentStepConfig.field];
      const selectedOption = currentStepConfig.options?.find(
        (opt) => opt.id === currentAnswer
      );

      // If the selected option doesn't require text input, ensure text field is cleared
      if (
        !selectedOption?.showTextInput &&
        dataToUse[currentStepConfig.textField]
      ) {
        dataToUse = { ...dataToUse };
        delete dataToUse[currentStepConfig.textField];
      }
    }

    // Clear dependent fields when conditional navigation skips steps
    // This ensures we don't submit data from skipped steps
    if (currentStepConfig && currentStepConfig.conditionalNavigation) {
      const currentAnswer = dataToUse[currentStepConfig.field];
      const targetStep = currentStepConfig.conditionalNavigation[currentAnswer];

      // If we're skipping steps due to conditional navigation, clear those skipped steps' data
      if (targetStep && targetStep > stepIndex + 1) {
        dataToUse = { ...dataToUse };
        // Clear data for all skipped steps
        for (
          let skippedStep = stepIndex + 1;
          skippedStep < targetStep;
          skippedStep++
        ) {
          const skippedStepConfig = quizConfig.steps[skippedStep];
          if (skippedStepConfig && skippedStepConfig.field) {
            delete dataToUse[skippedStepConfig.field];
            // Also clear any associated text fields
            if (skippedStepConfig.textField) {
              delete dataToUse[skippedStepConfig.textField];
            }
          }
        }
        // Update the answers state with cleared data immediately
        setAnswers(dataToUse);
      }
    }

    // Handle checkbox questions - send complete data when Continue is clicked
    if (currentStepConfig && currentStepConfig.type === "checkbox") {
      const currentAnswer = dataToUse[currentStepConfig.field];
      if (
        currentAnswer &&
        Array.isArray(currentAnswer) &&
        currentAnswer.length > 0
      ) {
        const payload = {
          page_step: stepIndex,
          completion_percentage: progress,
        };

        // Send each selected answer ID with its label as separate key-value pairs
        currentAnswer.forEach((optionId) => {
          const selectedOption = currentStepConfig.options?.find(
            (opt) => opt.id === optionId
          );
          if (selectedOption) {
            payload[optionId] = selectedOption.label;
          }
        });

        // Call submitFormData directly instead of using the queue
        // Pass dataToUse as cleanedAnswers to ensure transformed answers use cleaned data
        await submitFormData(payload, dataToUse);
      }
      return;
    }

    // Only send progress update and the current question's answer
    if (currentStepConfig && currentStepConfig.field && currentStepConfig.id) {
      const currentAnswer = dataToUse[currentStepConfig.field];
      if (currentAnswer !== undefined) {
        const payload = {
          page_step: stepIndex,
          completion_percentage: progress,
        };

        // Special handling for radio-text questions
        if (
          currentStepConfig.type === "radio-text" &&
          currentStepConfig.options
        ) {
          const selectedOption = currentStepConfig.options.find(
            (opt) => opt.id === currentAnswer
          );
          if (selectedOption) {
            payload[currentStepConfig.id] = selectedOption.label;
          } else {
            payload[currentStepConfig.id] = currentAnswer;
          }

          // Only include text field if the selected option requires text input
          if (currentStepConfig.textField && selectedOption?.showTextInput) {
            const textValue = dataToUse[currentStepConfig.textField];
            if (textValue && textValue.trim()) {
              payload[`${currentStepConfig.id}-textarea`] = textValue.trim();
            }
          }
        }
        // Handle other radio types
        else if (
          (currentStepConfig.type === "radio" ||
            currentStepConfig.type === "radio-image") &&
          currentStepConfig.options
        ) {
          const selectedOption = currentStepConfig.options.find(
            (opt) => opt.id === currentAnswer
          );
          if (selectedOption) {
            payload[currentStepConfig.id] = selectedOption.label;
          } else {
            payload[currentStepConfig.id] = currentAnswer;
          }
        } else {
          payload[currentStepConfig.id] = currentAnswer;
        }

        // Call submitFormData directly instead of using the queue
        // Pass dataToUse as cleanedAnswers to ensure transformed answers use cleaned data
        await submitFormData(payload, dataToUse);
      }
    }
  };

  const handleNext = (overrideData = null) => {
    // Use override data if provided, otherwise use current answers
    let dataToUse = overrideData || answers;

    // Clean up text fields for radio-text questions where the selected option doesn't require text input
    const currentStepConfig = quizConfig.steps[stepIndex];
    if (
      currentStepConfig &&
      currentStepConfig.type === "radio-text" &&
      currentStepConfig.textField
    ) {
      const currentAnswer = dataToUse[currentStepConfig.field];
      const selectedOption = currentStepConfig.options?.find(
        (opt) => opt.id === currentAnswer
      );

      // If the selected option doesn't require text input, ensure text field is cleared
      if (
        !selectedOption?.showTextInput &&
        dataToUse[currentStepConfig.textField]
      ) {
        dataToUse = { ...dataToUse };
        delete dataToUse[currentStepConfig.textField];
      }
    }

    // Clear dependent fields when conditional navigation skips steps
    if (currentStepConfig && currentStepConfig.conditionalNavigation) {
      const currentAnswer = dataToUse[currentStepConfig.field];
      const targetStep = currentStepConfig.conditionalNavigation[currentAnswer];

      // If we're skipping steps due to conditional navigation, clear those skipped steps' data
      if (targetStep && targetStep > stepIndex + 1) {
        dataToUse = { ...dataToUse };
        // Clear data for all skipped steps
        for (
          let skippedStep = stepIndex + 1;
          skippedStep < targetStep;
          skippedStep++
        ) {
          const skippedStepConfig = quizConfig.steps[skippedStep];
          if (skippedStepConfig && skippedStepConfig.field) {
            delete dataToUse[skippedStepConfig.field];
            // Also clear any associated text fields
            if (skippedStepConfig.textField) {
              delete dataToUse[skippedStepConfig.textField];
            }
          }
        }
        // Update the answers state with cleared data
        setAnswers(dataToUse);
      }
    }

    // Update max reached step when moving forward
    const nextStep = stepIndex + 1;
    if (nextStep > maxReachedStep) {
      setMaxReachedStep(nextStep);
    }

    // Only handle navigation - data submission is handled separately
    baseHandleContinue(dataToUse);
  };

  const handleBack = () => {
    // Custom logic for AcneQuiz
    let targetStep;
    if (stepIndex === 8) {
      // Going back from step 8 (prescription question) - go to step 7
      targetStep = 7;
    } else if (stepIndex === 9) {
      // Going back from step 9 (prescription types) - go to step 8 (prescription question)
      targetStep = 8;
    } else if (stepIndex === 10) {
      // Coming back from step 10 - check if step 9 was skipped
      // If user answered "No" on step 8, they skipped step 9, so go back to step 8
      const step8Answer = answers.hasPrescriptionExperience; // Field for step 8
      if (step8Answer === "1007_2") {
        // "No" option
        targetStep = 8; // Go back to step 8 (skipping step 9)
      } else {
        targetStep = 9; // Normal back navigation to step 9
      }
    } else {
      targetStep = stepIndex - 1;
    }

    // Preserve all previously answered questions - don't clear any data
    // The user should be able to go back and change any question without losing other answers

    // Update max reached step to current target
    setMaxReachedStep(Math.max(targetStep, maxReachedStep));

    // Navigate to target step
    goToStep(targetStep);
    setRecommendedProduct(null);
  };

  // Custom goToStep that prevents forward navigation beyond maxReachedStep
  const customGoToStep = (targetStep) => {
    // Check if this is a conditional navigation from current step
    const currentStepConfig = quizConfig.steps[stepIndex];
    const isConditionalNavigation =
      currentStepConfig?.conditionalNavigation &&
      Object.values(currentStepConfig.conditionalNavigation).includes(
        targetStep
      );

    // Allow navigation to:
    // 1. Previous steps (targetStep < stepIndex)
    // 2. Steps that have been reached (targetStep <= maxReachedStep)
    // 3. Conditional navigation targets from current step
    if (
      targetStep <= maxReachedStep ||
      targetStep < stepIndex ||
      isConditionalNavigation
    ) {
      goToStep(targetStep);
      // Update maxReachedStep if we're going to a new step
      if (targetStep > maxReachedStep) {
        setMaxReachedStep(targetStep);
      }
    }
  };

  const handleAction = async (action, payload) => {
    if (action === "navigate") {
      customGoToStep(payload);
    } else if (action === "continue") {
      // Prevent multiple submissions
      if (isSubmittingPopupData) return;

      // Set submitting state to show loading and prevent duplicate calls
      setIsSubmittingPopupData(true);
      try {
        // Submit current step data before closing popup and navigating
        await submitCurrentStepData();
        // Close popup after successful submission
        closePopup();
        // Then navigate to next step
        handleNext();
      } catch (error) {
        logger.error("Error submitting data from popup:", error);
        // Still close popup and navigate even if submission fails
        closePopup();
        handleNext();
      } finally {
        // Re-enable the button after submission
        setIsSubmittingPopupData(false);
      }
    } else {
      baseHandleAction(action, payload, handleNext);
    }
  };

  const handleRecommendationNext = () => {
    baseHandleRecommendationContinue();
    goToStep(18); // Go to final completion step
  };

  const handleThankYouComplete = () => {
    goToStep(17); // Go to recommendations step
  };

  // Simple setAnswers function that doesn't automatically submit data
  // Data submission is now handled only when Continue button is clicked
  const setAnswersWithSync = (updater) => {
    setAnswers(updater);
  };

  const transformAnswersForApi = (ans) => {
    const out = {};
    const steps = quizConfig.steps;
    Object.values(steps).forEach((cfg) => {
      if (!cfg || typeof cfg !== "object" || !cfg.id || !cfg.field) return;
      const questionId = cfg.id; // numeric like 904
      const value = ans[cfg.field];
      if (value === undefined || value === null) return;

      // For radio, radio-image, and radio-text types, find and send the label instead of the ID
      if (cfg.type === "checkbox") {
        if (Array.isArray(value) && value.length > 0) {
          // For checkbox, send each selected answer ID with its label as separate key-value pairs
          value.forEach((optionId) => {
            const selectedOption = cfg.options?.find(
              (opt) => opt.id === optionId
            );
            if (selectedOption) {
              out[optionId] = selectedOption.label;
            }
          });
        }
      } else if (cfg.type === "radio-text") {
        // Send radio selection as main field
        const selectedOption = cfg.options?.find((opt) => opt.id === value);
        out[questionId] = selectedOption?.label || value;

        // Send text input as separate field only if:
        // 1. The selected option requires text input (showTextInput: true)
        // 2. Text field has content and is not empty/whitespace
        // 3. CRITICAL: Never send text field if the selected option doesn't support text input
        const textFieldValue = ans[cfg.textField];
        if (
          value &&
          selectedOption?.showTextInput === true &&
          textFieldValue &&
          textFieldValue.trim() !== ""
        ) {
          out[`${questionId}-textarea`] = textFieldValue;
        }
        // For debugging: if selectedOption.showTextInput is false/undefined, textFieldValue is ignored
      } else if (cfg.type === "radio" || cfg.type === "radio-image") {
        // Find the label for the selected option
        const selectedOption = cfg.options?.find((opt) => opt.id === value);
        out[questionId] = selectedOption?.label || value;
      }
    });
    // Include photo URLs if present
    if (ans.frontPhotoUrl) out["197"] = ans.frontPhotoUrl;
    if (ans.sidePhotoUrl) out["198"] = ans.sidePhotoUrl;
    if (ans.idPhotoUrl) out["196"] = ans.idPhotoUrl;

    // Include DOB and phone number from cookies/user data
    if (ans[132]) out["132"] = ans[132]; // Phone number
    if (ans[158]) out["158"] = ans[158]; // DOB

    // Debug logging
    logger.log("TransformAnswersForApi - ans[132] (phone):", ans[132]);
    logger.log("TransformAnswersForApi - ans[158] (DOB):", ans[158]);
    logger.log("TransformAnswersForApi - out object:", out);

    return out;
  };

  return {
    stepIndex,
    progress,
    answers,
    setAnswers: setAnswersWithSync,
    recommendedProduct,
    setRecommendedProduct,
    popupType,
    handleNext,
    handleBack,
    handleAction,
    closePopup,
    handleRecommendationNext,
    handleThankYouComplete,
    goToStep: customGoToStep, // Use custom goToStep that prevents forward navigation
    submitFormData,
    submitCurrentStepData, // New function to submit data when Continue button is clicked
    maxReachedStep, // Expose maxReachedStep for debugging/UI purposes
    isSubmittingPopupData, // Expose submitting state for popup loading indicators
  };
}
