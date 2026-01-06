"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import QuizProgress from "./QuizProgress";
import QuizNavigation from "./QuizNavigation";
import StepRenderer from "./StepRenderer";
import { getBranchingLogic } from "@/utils/quizLogic";
import { logger } from "@/utils/devLogger";
import Logo from "../Navbar/Logo";
import { isAuthenticated } from "@/services/userDataService";
import { createRules } from "@/utils/recommendationRulesEngine";
import Link from "next/link";
import Image from "next/image";
import SignInLink from "./CustomComponents/SignInLink";

export default function QuizRenderer({
  quizData,
  sessionData,
  existingAnswers,
  onComplete,
}) {
  // Find last answered question index when resuming
  const getInitialStepIndex = () => {
    if (!existingAnswers || Object.keys(existingAnswers).length === 0) {
      return 0; // Start from beginning if no existing answers
    }

    const steps = quizData?.steps || [];
    let lastAnsweredIndex = 0;

    // Find the last question that has an answer
    for (let i = steps.length - 1; i >= 0; i--) {
      const questionId = String(steps[i].id);
      if (existingAnswers[questionId]) {
        lastAnsweredIndex = i;
        break;
      }
    }

    logger.log("📍 Resuming quiz at step index:", lastAnsweredIndex);
    return lastAnsweredIndex;
  };

  const initialStepIndex = getInitialStepIndex();
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [answers, setAnswers] = useState(existingAnswers || {});
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState([initialStepIndex]);

  const [matchedRule, setMatchedRule] = useState(null);
  const [recommendationProduct, setRecommendationProduct] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  const steps = quizData.steps || [];
  const currentStep = steps[currentStepIndex];
  const responseId =
    sessionData?.responseId || sessionData?.response_id || sessionData?.id;
  const sessionId = sessionData?.sessionId || sessionData?.session_id;

  const [Authenticated, setAuthenticated] = useState(false);

  // Debug logging
  useEffect(() => {
    logger.log("QuizRenderer initialized Steps:", steps);
    logger.log("QuizRenderer - Steps:", steps.length);
    logger.log("QuizRenderer - Current Step:", currentStep);
    logger.log("QuizRenderer - Response ID:", responseId);
    logger.log("QuizRenderer - Session ID:", sessionId);
    logger.log("QuizRenderer - Session Data:", sessionData);
    logger.log("QuizRenderer - Existing Answers:", existingAnswers);
  }, [
    steps.length,
    currentStep,
    responseId,
    sessionId,
    sessionData,
    existingAnswers,
  ]);

  // Initialize with existing answers if available
  useEffect(() => {
    if (existingAnswers && Object.keys(existingAnswers).length > 0) {
      logger.log("Initializing quiz with existing answers:", existingAnswers);
      setAnswers(existingAnswers);

      // Set current answer if the first question has an existing answer
      const firstQuestionId = String(steps[0]?.id);
      if (existingAnswers[firstQuestionId]) {
        setCurrentAnswer(existingAnswers[firstQuestionId].value);
        logger.log(
          "Set current answer for first question:",
          existingAnswers[firstQuestionId].value
        );
      }
    }

    if( isAuthenticated()){
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }

  }, [existingAnswers, steps]);

  // Load existing answer when navigating to a new step
  useEffect(() => {
    if (currentStep && answers) {
      const currentQuestionId = String(currentStep.id);
      if (answers[currentQuestionId]) {
        setCurrentAnswer(answers[currentQuestionId].value);
        logger.log(
          "Loaded existing answer for current step:",
          currentQuestionId,
          answers[currentQuestionId].value
        );
      } else {
        // Only clear if we're not on the first load with existing answers
        if (currentStepIndex > 0 || !existingAnswers) {
          setCurrentAnswer(null);
        }
      }
    }
  }, [currentStepIndex, currentStep, answers]);

  // Save answer to backend (DISABLED FOR NOW)
  const saveAnswer = useCallback(
    async (questionId, answer) => {
      // TODO: Re-enable when backend is ready
      logger.log("Answer saved (skipped):", { questionId, answer, responseId });
      //return true;

      /* COMMENTED OUT - RE-ENABLE LATER */
      if (!responseId) {
        console.error("No response ID available");
        logger.log("Session data:", sessionData);
        toast.error("No response ID available");
        return false;
      }

      try {
        logger.log("Saving answer:", { questionId, answer, responseId });

        const response = await fetch(
          `/api/quizzes/responses/${responseId}/answers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId, answer }),
          }
        );

        const result = await response.json();
        logger.log("Save answer response:", result);

        if (!response.ok || !result.success) {
          console.error("Save answer failed:", result);
          throw new Error(
            result.error || result.details || "Failed to save answer"
          );
        }

        logger.log("Answer saved successfully");
        return true;
      } catch (error) {
        console.error("Error saving answer:", error);
        toast.error(`Failed to save answer: ${error.message}`);
        return false;
      }
    },
    [responseId, sessionData]
  );

  // Handle answer change
  const handleAnswerChange = useCallback((answer) => {
    setCurrentAnswer(answer);
  }, []);

  // Navigate to next step
  const handleNext = useCallback(async () => {
    if (!currentAnswer) {
      toast.warning("Please provide an answer before continuing");
      return;
    }

    setIsSubmitting(true);

    // Save current answer
    const questionId = String(currentStep.id);
    logger.log("=== Saving Answer ===");
    logger.log("Question:", currentStep.title || currentStep.text);
    logger.log("Question ID:", currentStep.id);
    logger.log("Answer:", currentAnswer);

    const saved = await saveAnswer(questionId, { value: currentAnswer });

    if (!saved) {
      setIsSubmitting(false);
      return;
    }

    // Update answers state
    const updatedAnswers = {
      ...answers,
      [questionId]: { value: currentAnswer },
    };
    setAnswers(updatedAnswers);
    logger.log("All answers collected:", updatedAnswers);

    // Log matching flow rules for this question
    const matchingRules = quizData.flow?.filter(
      (rule) => rule.from.questionId === currentStep.id
    );
    logger.log("Flow rules for this question:", matchingRules);

    // Extract actual answer value for branching logic
    const answerValue =
      currentAnswer?.answer !== undefined
        ? currentAnswer.answer
        : currentAnswer;
    logger.log("Answer value for branching:", answerValue);

    // Determine next step using branching logic
    const nextStepIndex = getBranchingLogic(
      quizData,
      currentStepIndex,
      answerValue,
      updatedAnswers
    );
    logger.log("Next step index from branching logic:", nextStepIndex);

    if (nextStepIndex === -1) {
      // Quiz complete
      await completeQuiz(updatedAnswers);
    } else {
      setCurrentStepIndex(nextStepIndex);
      setVisitedSteps([...visitedSteps, nextStepIndex]);
      // Don't clear currentAnswer here - let the useEffect handle it based on existing answers
    }

    setIsSubmitting(false);
  }, [
    currentAnswer,
    currentStep,
    answers,
    currentStepIndex,
    quizData,
    visitedSteps,
    saveAnswer,
  ]);

  // Navigate to previous step
  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex =
        visitedSteps[visitedSteps.length - 2] || currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setVisitedSteps(visitedSteps.slice(0, -1));

      // Load previous answer if exists
      const prevQuestionId = steps[prevIndex].id;
      if (answers[prevQuestionId]) {
        setCurrentAnswer(answers[prevQuestionId].value);
      } else {
        setCurrentAnswer(null);
      }
    }
  }, [currentStepIndex, visitedSteps, steps, answers]);

  // Complete quiz
  const completeQuiz = useCallback(
    async (finalAnswers) => {
      try {
        setIsSubmitting(true);
        logger.log("Completing quiz with answers:", finalAnswers);

        // Format answers for completion
        const answersArray = Object.entries(finalAnswers).map(
          ([questionId, answer]) => ({
            questionId,
            answer,
          })
        );

        // ===== USE RULES ENGINE TO GET RECOMMENDATIONS =====
        logger.log("🔧 Starting Rules Engine Recommendation");

        // Get edges from quiz data
        logger.log("📦 Quiz Data for Rules Engine:", quizData);
        logger.log("📊 Quiz Steps:", quizData?.steps);
        logger.log("📊 Quiz Results:", quizData?.results);
        logger.log(
          "🔷 [ALTERNATIVES] DEBUG: All result IDs in quizData.results:",
          quizData?.results?.map((r) => r.id)
        );
        const edges = quizData?.logicResults?.edges || [];
        logger.log("📊 Edges from quizData:", edges);
        logger.log(
          "🔷 [ALTERNATIVES] DEBUG: All edge targets:",
          edges.map((e) => e.target)
        );

        // Store matched product and all results in local variables for immediate use
        let matchedProduct = null;
        let allResults = quizData.results || [];
        let AlternativeProds = [];

        if (edges.length > 0 && quizData.quizDetails.preQuiz === true) {
          // Generate rules from edges
          const rules = createRules(edges, quizData);
          logger.log("📋 Generated Rules:", rules);

          // Match answers against rules
          logger.log("🎯 Matching answers:", finalAnswers);

          // Find matching rule
          const matched = rules.find((rule) => {
            // Check if all rule conditions match the user's answers
            const ruleKeys = Object.keys(rule).filter(
              (key) => key !== "result" && key !== "alternativeProds"
            );

            return ruleKeys.every((questionId) => {
              const userAnswer = finalAnswers[questionId];
              const ruleOptionIndex = rule[questionId];

              // Extract answer value
              const answerValue =
                userAnswer?.value?.answer !== undefined
                  ? userAnswer.value.answer
                  : userAnswer?.value;

              logger.log(
                `Checking Q${questionId}: User answered "${answerValue}" vs Rule expects option index "${ruleOptionIndex}"`
              );

              logger.log(
                "result check => ",
                String(answerValue) === String(ruleOptionIndex)
              );
              // Check if answer matches rule (answer should be option index)
              return String(answerValue) === String(ruleOptionIndex);
            });
          });

          // Store in state for later use
          setMatchedRule(matched);

          logger.log("Matched Rule:", matched);

          if (matched) {
            logger.log("✅ MATCHED RULE:", matched);
            logger.log("🎁 RECOMMENDED PRODUCT ID:", matched.result);

            // Find product details from results
            matchedProduct = quizData.results?.find(
              (result) => String(result.id) === String(matched.result)
            );

            // Get alternative products using the alternativeProds array
            logger.log(
              "🔷 [ALTERNATIVES] Step 1: Checking matched.alternativeProds:",
              matched.alternativeProds
            );
            if (
              matched.alternativeProds &&
              matched.alternativeProds.length > 0
            ) {
              logger.log(
                "🔷 [ALTERNATIVES] Step 2: Filtering from quizData.results (total:",
                quizData.results?.length,
                ")"
              );
              AlternativeProds =
                quizData.results?.filter((result) => {
                  const isMatch = matched.alternativeProds.includes(
                    String(result.id)
                  );
                  logger.log(
                    "🔷 [ALTERNATIVES] Checking result ID:",
                    result.id,
                    "- Match:",
                    isMatch
                  );
                  return isMatch;
                }) || [];
              logger.log(
                "🔷 [ALTERNATIVES] Step 3: Filtered products count:",
                AlternativeProds.length
              );
              logger.log(
                "🔷 [ALTERNATIVES] Step 4: Final AlternativeProds array:",
                AlternativeProds
              );
            } else {
              logger.log(
                "🔷 [ALTERNATIVES] Step 2: No alternativeProds in matched rule or empty array"
              );
            }

            if (matchedProduct) {
              setRecommendationProduct(matchedProduct);
              setTotalResults(allResults);
              logger.log("🎁 RECOMMENDED PRODUCT DETAILS:", matchedProduct);
              logger.log(
                "📦 ALTERNATIVE PRODUCTS COUNT:",
                AlternativeProds.length
              );
            } else {
              logger.log(
                "⚠️ Product not found in results array for ID:",
                matched.result
              );
            }
          } else {
            logger.log("❌ No matching rule found for answers");
          }
        } else {
          logger.log("⚠️ No edges found in quizData - cannot generate rules");
        }

        // ===== END RULES ENGINE =====

        // ===== EXTRACT UPLOADS (CDN URLs) FROM ANSWERS =====
        const uploads = {};

        Object.entries(finalAnswers).forEach(([questionId, answerObj]) => {
          const answerData = answerObj?.value?.answer;

          if (answerData && typeof answerData === "object") {
            // Find all keys ending with "CdnUrl" or "cdnUrl"
            Object.keys(answerData).forEach((key) => {
              if (key.toLowerCase().endsWith("cdnurl") && answerData[key]) {
                // Determine type based on the key name
                let type = "image"; // Default to image

                // Map known CDN URL keys to their types
                const urlTypeMapping = {
                  frontPhotoCdnUrl: "image",
                  sidePhotoCdnUrl: "image",
                  topPhotoCdnUrl: "image",
                  idPhotoCdnUrl: "image",
                  // Add more mappings here as needed
                };

                type = urlTypeMapping[key] || "image";

                uploads[key] = {
                  url: answerData[key],
                  type: type,
                };

                logger.log(
                  `📎 Found CDN URL in Q${questionId}: ${key} = ${answerData[key]} (type: ${type})`
                );
              }
            });
          }
        });

        logger.log("📦 Extracted uploads object:", uploads);
        // ===== END UPLOADS EXTRACTION =====

        const body = {
          answers: answersArray,
          prescriptions: { items: [] },
          uploads: uploads,
        };

        if (!isAuthenticated()) {
          logger.log("🔓 Starting quiz session with guest user");
          const { getSessionId } = await import("@/services/sessionService");
          const sessionId = getSessionId();
          if (sessionId) {
            body["cartSessionId"] = sessionId;
            logger.log("👤 Using sessionId from request:", sessionId);
          }
        }

        logger.log("Submitting quiz completion with body:", body);

        const response = await fetch(
          `/api/quizzes/responses/${responseId}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        const result = await response.json();
        logger.log("Quiz completion result:", result);

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to complete quiz");
        }

        // Mock result for testing while API is disabled

        logger.log("recommednation Product is ==>", matchedProduct);
        logger.log("totalResults  is ==>", allResults);

        onComplete(
          result,
          finalAnswers,
          matchedProduct,
          allResults,
          AlternativeProds
        );

        setIsSubmitting(false);
      } catch (error) {
        console.error("Error completing quiz:", error);
        toast.error("Failed to complete quiz");
        setIsSubmitting(false);
      }
    },
    [responseId, onComplete, quizData]
  );

  const progress =
    currentStepIndex == 0 ? 0 : ((currentStepIndex + 1) / steps.length) * 100;

  // Show error if no steps
  if (!steps || steps.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-2">
            No Quiz Steps Found
          </h2>
          <p className="text-red-700 mb-4">
            The quiz data doesn't contain any steps.
          </p>
          <details className="text-left mt-4">
            <summary className="cursor-pointer text-sm text-red-800 font-medium">
              Debug Info
            </summary>
            <pre className="mt-2 text-xs bg-white p-4 rounded overflow-auto">
              {JSON.stringify(quizData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="questionnaire-header w-full py-2 relative  ">
        <div className="w-full md:w-[520px] mx-auto px-5 md:px-0 relative h-[40px] flex items-center">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className={`p-2 rounded-lg transition-colors ${
                currentStepIndex > 0
                  ? "hover:bg-gray-100 text-gray-700"
                  : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div className={currentStepIndex > 0 ? "w-[85%]" : `w-[100%]`}>
            <div className="text-2xl py-4 font-bold text-gray-800 flex justify-center">
              <Link href="/" aria-label="Rocky Homepage">
                <div className="h-[100px] w-[100px] relative ml-[0]">
                  <Image
                    src="https://myrocky.b-cdn.net/WP%20Images/Global%20Images/my-rocky-black.webp"
                    alt="Rocky Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="max-w-2xl mx-auto md:px-0">
        {/* Progress Bar */}
        <QuizProgress
          current={currentStepIndex + 1}
          total={steps.length}
          percentage={progress}
        />

        {/* Current Step */}
        <div className="mb-6">
          {currentStep ? (
            <>
              <StepRenderer
                step={currentStep}
                answer={currentAnswer}
                allAnswers={answers}
                onAnswerChange={handleAnswerChange}
                onBack={handleBack}
                onNext={handleNext}
              />

              {!Authenticated && (
                <SignInLink quizSlug={quizData.quizDetails?.slug} />
              )}
            </>
          ) : (
            <div className="text-center text-gray-500">
              <p>Step not found</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation - Sticky at Bottom */}
      <QuizNavigation
        canGoBack={currentStepIndex > 0}
        canGoNext={
          currentStep?.stepType === "form"
            ? currentAnswer &&
              typeof currentAnswer === "object" &&
              currentAnswer.answer &&
              currentStep.formInputs.every(
                (input) =>
                  currentAnswer.answer[input.id] &&
                  currentAnswer.answer[input.id].toString().trim() !== ""
              )
            : !!currentAnswer
        }
        isLastStep={currentStepIndex === steps.length - 1}
        isSubmitting={isSubmitting}
        onBack={handleBack}
        onNext={handleNext}
       
      />
    </div>
  );
}
