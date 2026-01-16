"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import QuizRenderer from "@/components/Quiz/QuizRenderer";
import QuizLoading from "@/components/Quiz/QuizLoading";
import { logger } from "@/utils/devLogger";
import { isAuthenticated } from "@/services/userDataService";

export default function QuizClient({ initialQuizData, slug }) {
  const router = useRouter();
  const [quizData, setQuizData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [existingAnswers, setExistingAnswers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initializeSession() {
      try {
        setLoading(true);
        setError(null);

        const quiz = initialQuizData;

        logger.log("Quiz data received from server:", quiz);
        logger.log("Steps count:", quiz.steps?.length || 0);
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
        if (quiz.requireLogin) {
          sessionStorage.removeItem("_rocky_main_quiz_redirect");
          logger.log("[SessionStorage] Cleared mainQuizId - starting main quiz");
        }

        // Process steps based on authentication and requiredLogin
        const userAuthenticated = isAuthenticated();
        const processedSteps = quiz.steps?.map(step => {
          // If user is authenticated and step requires login, mark it as skippable
          if (userAuthenticated && step.requiredLogin === true) {
            return {
              ...step,
              shouldSkip: true
            };
          }
          return {
            ...step,
            shouldSkip: false
          };
        });

        // Update quiz data with processed steps
        const processedQuiz = {
          ...quiz,
          steps: processedSteps,
          isUserAuthenticated: userAuthenticated
        };

        logger.log("Processed steps with requiredLogin logic:", processedSteps?.filter(s => s.shouldSkip).length || 0, "steps marked to skip");
        
        setQuizData(processedQuiz);

        // Check for sessionId in URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const urlSessionId = urlParams.get('sessionId');

        let sessionInfo;
        let answersPromise = null;

        if (urlSessionId) {
          // Use sessionId from URL
          logger.log("📎 Using sessionId from URL:", urlSessionId);
          sessionInfo = {
            sessionId: urlSessionId,
            responseId: urlSessionId,
          };
          logger.log("Session info from URL:", sessionInfo);
          setSessionData(sessionInfo);

          // Fetch existing answers in parallel
          answersPromise = fetch(`/api/quizzes/answers/${urlSessionId}`)
            .then(res => res.ok ? res.json() : null)
            .catch(err => {
              logger.log("Could not fetch existing answers:", err);
              return null;
            });
        } else {
          // Start new quiz session
          const quizId = quiz.id || quiz._id || quiz.quiz_id;
          if (!quizId) {
            throw new Error("Quiz ID not found in response");
          }

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

          sessionInfo = {
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

          // Fetch existing answers if session was created
          const sessionIdForAnswers = sessionInfo.sessionId || sessionInfo.session_id;
          if (sessionIdForAnswers) {
            answersPromise = fetch(`/api/quizzes/answers/${sessionIdForAnswers}`)
              .then(res => res.ok ? res.json() : null)
              .catch(err => {
                logger.log("Could not fetch existing answers:", err);
                return null;
              });
          }
        }

        // Wait for answers if we have a promise
        if (answersPromise) {
          const answersResult = await answersPromise;
          
          if (answersResult?.success && answersResult.data?.answers) {
            logger.log("Existing answers found:", answersResult.data.answers);
            
            const answersObject = {};
            answersResult.data.answers.forEach(answer => {
              if (answer.questionId && answer.answer !== undefined) {
                answersObject[answer.questionId] = { value: answer.answer };
              }
            });
            
            logger.log("Transformed answers object:", answersObject);
            setExistingAnswers(answersObject);
          } else {
            logger.log("No existing answers found");
          }
        }

      } catch (err) {
        logger.log("Session initialization error:", err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (initialQuizData) {
      initializeSession();
    }
  }, [initialQuizData, slug, router]);

  const handleQuizComplete = useCallback(
    (result, finalAnswers, recommendationProduct, totalResults, AlternativeProds) => {
      logger.log("=== Quiz Completed ===");
      logger.log("🔷 [ALTERNATIVES] Step 5: Received in handleQuizComplete:", AlternativeProds);
      logger.log("🔷 [ALTERNATIVES] Step 6: Array length:", AlternativeProds?.length || 0);
      logger.log("Alternative Prods", AlternativeProds);
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

      const isMainQuiz =
        quizData.quizDetails.requireLogin === true &&
        quizData.quizDetails.preQuiz === false;
      const isPreQuiz = quizData.quizDetails.preQuiz === true || !isMainQuiz;

      if (isPreQuiz) {
        logger.log("Pre-quiz completed - showing product recommendations");

        const responseId =
          sessionData?.responseId ||
          sessionData?.response_id ||
          sessionData?.id;

        const mainQuizId = quizData.quizDetails?.mainQuiz;
        logger.log(
          "[SessionStorage] DEBUG - quizData.mainQuiz value:",
          mainQuizId
        );

        if (mainQuizId) {
          logger.log(
            "[SessionStorage] Attempting to store mainQuizId:",
            mainQuizId
          );
          sessionStorage.setItem("_rocky_main_quiz_redirect", mainQuizId);

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

        logger.log("🔷 [ALTERNATIVES] Step 7: Storing in sessionStorage:", AlternativeProds);
        sessionStorage.setItem(
          "quiz-results",
          JSON.stringify({
            recommendations: recommendationProduct,
            allProducts: totalResults,
            quizData: quizData,
            sessionId: sessionData?.sessionId || sessionData?.session_id,
            responseId: responseId,
            slug: slug,
            completeResult: result,
            preQuiz: true,
            mainQuizId: mainQuizId,
            answers: finalAnswers,
            AlternativeProds: AlternativeProds
          })
        );
        logger.log("🔷 [ALTERNATIVES] Step 8: SessionStorage saved successfully");

        router.push(`/quiz/${slug}/results`);
      } else {
        logger.log("Main quiz completed - showing thank you page");

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
        <div className="w-full md:w-[520px] px-5 md:px-0 mx-auto">
          <QuizRenderer
            quizData={quizData}
            sessionData={sessionData}
            existingAnswers={existingAnswers}
            onComplete={handleQuizComplete}
          />
        </div>
      </div>
    </>
  );
}
