"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import QuizRenderer from "@/components/Quiz/QuizRenderer";
import QuizLoading from "@/components/Quiz/QuizLoading";
import { logger } from "@/utils/devLogger";
import { isAuthenticated } from "@/services/userDataService";
import { processRecommendations } from "@/utils/recommendationLogic";

export default function QuizPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [quizData, setQuizData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [existingAnswers, setExistingAnswers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initializeQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch quiz runtime data (includes steps)
      const quizResponse = await fetch(`/api/quizzes/runtime/${slug}`);
      const quizResult = await quizResponse.json();

      if (!quizResponse.ok || !quizResult.success) {
        throw new Error(quizResult.error || "Failed to load quiz");
      }

      const quiz = quizResult.data;
      logger.log("Quiz runtime data loaded:", quiz);
      logger.log("Steps count:", quiz.steps?.length || 0);
      logger.log("Recommendation rules:", quiz.recommendationRules);
      logger.log("Quiz requireLogin:", quiz.requireLogin);
      logger.log("Quiz preQuiz:", quiz.preQuiz);

      // Check if quiz requires login (main quizzes only)
      if (quiz.requireLogin && !isAuthenticated()) {
        logger.log("Main quiz requires authentication - redirecting to login");
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const currentUrl = `${origin}/quiz/${slug}`;
        const redirectUrl = encodeURIComponent(currentUrl);
        toast.error("Please login to continue with this consultation");
        router.push(
          `/login-register?redirect_to=${redirectUrl}&viewshow=login`
        );
        return;
      }

      // If this is a main quiz (requires login), clear any stored mainQuizId redirect
      // This prevents redirect loops if user creates another order without pre-quiz
      if (quiz.requireLogin) {
        sessionStorage.removeItem("_rocky_main_quiz_redirect");
        logger.log("[SessionStorage] Cleared mainQuizId - starting main quiz");
      }

      setQuizData(quiz);

      // Step 2: Start quiz session
      const quizId = quiz.id || quiz._id || quiz.quiz_id;
      if (!quizId) {
        throw new Error("Quiz ID not found in response");
      }

      // Check user authentication again before starting session
      const Headers = { "Content-Type": "application/json" };
      const Body = {};

      if (!isAuthenticated()) {
        logger.log("🔓 Starting quiz session with guest user");
        const { getSessionId } = await import("@/services/sessionService");
        const sessionId = getSessionId();
        if(sessionId) {
          Body['cartSessionId'] = sessionId;
          logger.log("👤 Using sessionId from request:", sessionId);
        }
      }
      

      const sessionResponse = await fetch(`/api/quizzes/${quizId}/start`, {
        method: "POST",
        headers: Headers,
        body: JSON.stringify(Body),
      });

      const sessionResult = await sessionResponse.json();

      if (!sessionResponse.ok || !sessionResult.success) {
        throw new Error(sessionResult.error || "Failed to start quiz session");
      }

      logger.log("Session data:", sessionResult.data);

      // Extract session ID and response ID from the session data
      const sessionInfo = {
        sessionId:
          sessionResult.data.session_id ||
          sessionResult.data.sessionId ||
          sessionResult.data.id,
        responseId:
          sessionResult.data.response_id ||
          sessionResult.data.responseId ||
          sessionResult.data.id,
        ...sessionResult.data,
      };

      logger.log("Processed session info:", sessionInfo);
      setSessionData(sessionInfo);

      // Step 3: Fetch existing answers if any
      try {
        const sessionIdForAnswers = sessionInfo.sessionId || sessionInfo.session_id;
        if (sessionIdForAnswers) {
          logger.log("Fetching existing answers for session:", sessionIdForAnswers);
          
          const answersResponse = await fetch(
            `/api/quizzes/answers/${sessionIdForAnswers}`
          );
          
          if (answersResponse.ok) {
            const answersResult = await answersResponse.json();
            
            if (answersResult.success && answersResult.data?.answers) {
              logger.log("Existing answers found:", answersResult.data.answers);
              
              // Transform answers array to object format {questionId: {value: answer}}
              const answersObject = {};
              answersResult.data.answers.forEach(answer => {
                if (answer.questionId && answer.answer !== undefined) {
                  answersObject[answer.questionId] = { value: answer.answer };
                }
              });
              
              logger.log("Transformed answers object:", answersObject);
              setExistingAnswers(answersObject);
              toast.info("Resuming your previous progress");
            } else {
              logger.log("No existing answers found");
            }
          } else {
            logger.log("No existing answers response:", answersResponse.status);
          }
        }
      } catch (answersErr) {
        // Don't fail the quiz load if answers fetch fails
        logger.log("Could not fetch existing answers:", answersErr);
      }

      toast.success("Quiz loaded successfully!");
    } catch (err) {
      logger.log("Quiz initialization error:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      initializeQuiz();
    }
  }, [slug, initializeQuiz]);

  const handleQuizComplete = useCallback(
    (result, finalAnswers, recommendationProduct, totalResults) => {
      logger.log("=== Quiz Completed ===");
      logger.log(
        "Complete result FULL OBJECT:",
        JSON.stringify(result, null, 2)
      );
      logger.log("Complete result keys:", Object.keys(result));
      logger.log("Complete result structure:", {
        hasAnswers: "answers" in result,
        hasData: "data" in result,
        hasResponse: "response" in result,
        answerType: typeof result.answers,
        dataType: typeof result.data,
      });
      logger.log("Quiz Data at completion:", result);
      logger.log("Recommendations from backend:", result.recommendations);
      logger.log("Results from backend:", result.results);
      logger.log("Quiz logicResults:", quizData.logicResults);
      logger.log("Quiz results:", quizData.results);
      logger.log("Is pre-quiz:", quizData.preQuiz);
      logger.log("User answers direct:", finalAnswers);

      toast.success("Quiz completed successfully!");

      // Check if this is a main quiz (requireLogin = true and preQuiz = false)
      // Default to pre-quiz (recommendations) if not explicitly marked as main quiz
      const isMainQuiz =
        quizData.quizDetails.requireLogin === true &&
        quizData.quizDetails.preQuiz === false;
      const isPreQuiz = quizData.quizDetails.preQuiz === true || !isMainQuiz;

      // Different flow for pre-quiz vs main quiz
      if (isPreQuiz) {
        // PRE-QUIZ: Show product recommendations
        logger.log("Pre-quiz completed - showing product recommendations");

        const responseId =
          sessionData?.responseId ||
          sessionData?.response_id ||
          sessionData?.id;

        // Store mainQuiz ID in sessionStorage for post-checkout redirect
        const mainQuizId = quizData.quizDetails?.mainQuiz;
        logger.log(
          "[SessionStorage] DEBUG - quizData.mainQuiz value:",
          mainQuizId
        );
        logger.log(
          "[SessionStorage] DEBUG - quizData keys:",
          Object.keys(quizData)
        );
        logger.log("[SessionStorage] DEBUG - Full quizData:", quizData);

        if (mainQuizId) {
          logger.log(
            "[SessionStorage] Attempting to store mainQuizId:",
            mainQuizId
          );
          sessionStorage.setItem("_rocky_main_quiz_redirect", mainQuizId);

          // Verify it was stored
          const storedValue = sessionStorage.getItem(
            "_rocky_main_quiz_redirect"
          );
          logger.log("[SessionStorage] ✅ Verified stored value:", storedValue);

          if (storedValue !== mainQuizId) {
            logger.error(
              "[SessionStorage] ❌ Storage failed! Expected:",
              mainQuizId,
              "Got:",
              storedValue
            );
          }
        } else {
          logger.warn(
            "[SessionStorage] ⚠️ No mainQuizId found in quizData - will not store"
          );
        }

        sessionStorage.setItem(
          "quiz-results",
          JSON.stringify({
            recommendations: recommendationProduct, // Filtered recommendations (user's choice)
            allProducts: totalResults, // All products for transformation
            quizData: quizData,
            sessionId: sessionData?.sessionId || sessionData?.session_id,
            responseId: responseId,
            slug: slug,
            completeResult: result,
            preQuiz: true,
            mainQuizId: mainQuizId, // Keep for backwards compatibility
            answers: finalAnswers, // Store answers for debugging
          })
        );

        // Navigate to results page with product recommendations
        router.push(`/quiz/${slug}/results`);
      } else {
        // MAIN QUIZ: Show thank you page (consultation completed)
        logger.log("Main quiz completed - showing thank you page");

        // Clear mainQuiz redirect since user completed the main consultation
        sessionStorage.removeItem("_rocky_main_quiz_redirect");
        logger.log("[SessionStorage] Cleared mainQuizId - main quiz completed");

        sessionStorage.setItem(
          "quiz-submission",
          JSON.stringify({
            success: true,
            quizData: quizData,
            result: result,
            completedAt: new Date().toISOString(),
          })
        );

        // Navigate to thank you page
        router.push(`/quiz/${slug}/thank-you`);
      }
    },
    [quizData, sessionData, slug, router]
  );

  if (loading) {
    return <QuizLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Quiz
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!quizData || !sessionData) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        #launcher {
          display: none !important;
        }
      `}</style>
      <div className="min-h-screen">
        <QuizRenderer
          quizData={quizData}
          sessionData={sessionData}
          existingAnswers={existingAnswers}
          onComplete={handleQuizComplete}
        />
      </div>
    </>
  );
}
