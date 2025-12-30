"use client";

import { useEffect } from "react";

export default function TimeToGet({ step, answer, onAnswerChange }) {
  // Auto-proceed to next step after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAnswerChange) {
        onAnswerChange({ answerType: "text", answer: { acknowledged: true } });
      }
    }, 2000);

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, [onAnswerChange]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg">
      <div className="text-center space-y-6">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
          {step?.title || "Time to get your hair back"}
        </h2>

        {/* Before/After Image */}
        <div className="my-6">
          <img
            src="https://myrocky.com/wp-content/uploads/2023/03/review-aanton-before-after-e1678831383630.jpg"
            alt="Hair restoration before and after - 6 months"
            className="max-w-full h-auto mx-auto rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
