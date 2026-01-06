"use client";

import { logger } from "@/utils/devLogger";
import React, { useState, useEffect } from "react";

const Counter = ({ step, answer, onAnswerChange }) => {
  // Get configuration from step or use defaults
  const seconds = 3;
  const texts = [
    `Your height is ${answer.height.feet},${answer.height.inches}"`,
    `Your weight is ${answer.weight} lbs`,
    "Calculating based on clinical data",
  ];
  const title = "Calculating your potential weight loss";

  const [visibleTextIndex, setVisibleTextIndex] = useState(0);
  const [count, setCount] = useState(seconds);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
        if (visibleTextIndex < texts.length - 1) {
          setVisibleTextIndex(visibleTextIndex + 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!completed) {
      setCompleted(true);
      if (onAnswerChange) {
        onAnswerChange({
          answerType: "text",
          answer: {
            completed: true,
            timestamp: new Date().toISOString(),
            duration: seconds,
          },
        });
      }
    }
  }, [count, visibleTextIndex, completed, onAnswerChange, texts.length, seconds]);

  const size = 150;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress =
    count > 0 ? ((seconds - count) / seconds) * circumference : circumference;

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative w-[150px] h-[150px] flex justify-center items-center mb-[72px]">
          <svg width={size} height={size} className="absolute top-0 left-0">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F0E6DA"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#AE7E56"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          {count > 0 ? (
            <span className="relative text-[#AE7E56] text-[32px] z-10">
              {count}
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center z-10">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d={`M${size * 0.32} ${size * 0.48} L${size * 0.48} ${
                    size * 0.64
                  } L${size * 0.68} ${size * 0.32}`}
                  stroke="#AE7E56"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
      {title && (
        <p className="headers-font font-medium text-[26px] leading-[120%] mb-[16px]">
          {title}
        </p>
      )}

      {texts && texts.length > 0 && (
        <>
          {texts.map((item, index) => (
            <p
              key={index}
              className={`text-[16px] leading-[140%] mb-[4px] text-[#AE7E56] transition-opacity duration-700 ${
                index <= visibleTextIndex ? "opacity-100" : "opacity-0"
              }`}
              style={{ transition: "opacity 0.7s" }}
            >
              {item}
            </p>
          ))}
        </>
      )}
    </div>
  );
};

export default Counter;
