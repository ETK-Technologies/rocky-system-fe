import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QuestionLayout } from "../EdQuestionnaire/QuestionLayout";
import { QuestionOption } from "../EdQuestionnaire/QuestionOption";
import { getCookieName } from "@/utils/storagePrefix";

const QuestionOne = ({ currentPage, answer, onAnswerChange }) => {
  // Move authentication check to a useEffect hook to ensure client-side only execution
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // This code only runs on the client, after hydration
    // Only check prefixed cookies - no fallback to unprefixed to ensure project isolation
    const prefixedAuthToken = getCookieName("authToken");
    const hasAuthToken = document.cookie.includes(`${prefixedAuthToken}=`);
    setIsAuthenticated(hasAuthToken);
  }, []);

  return (
    <div className="flex flex-col">
      <QuestionLayout
        title="Have you taken ED meds in the past?"
        currentPage={currentPage}
        pageNo={1}
        questionId={1}
        inputType="radio"
        titleClassName="font-felix"
      >
        <QuestionOption
          id="1_1"
          name="1"
          value="Yes"
          checked={answer === "Yes"}
          onChange={() => onAnswerChange(1, "Yes")}
          type="radio"
          label="Yes"
          className="mb-4"
        />
        <QuestionOption
          id="1_2"
          name="1"
          value="No"
          checked={answer === "No"}
          onChange={() => onAnswerChange(1, "No")}
          type="radio"
          label="No"
        />
      </QuestionLayout>

      {/* Only render this section after client-side hydration is complete */}
      {currentPage === 1 && (
        <div className="text-center mt-6" suppressHydrationWarning={true}>
          {!isAuthenticated && (
            <p className="text-sm font-normal">
              Already have an account?{" "}
              <a
                href="/login-register?viewshow=login&ed-flow=1"
                className="font-[400] text-[#C19A6B] underline ml-1"
              >
                Sign in
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionOne;
