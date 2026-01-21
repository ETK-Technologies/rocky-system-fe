import React, { useState, useEffect } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";
import { isAuthenticated } from "@/lib/cart/cartService";
import {
  TryLogin,
  isValidEmail,
  isValidPassword,
} from "../functions/authFunctions";
import Counter from "./Counter";
import CustomImage from "@/components/utils/CustomImage";
import { logger } from "@/utils/devLogger";

export default function PotentialWeightLoss({
  step,
  answer,
  onAnswerChange,
  onBack,
  onNext,
  allAnswers
}) {
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState(answer?.email || "");
  const [password, setPassword] = useState(answer?.password || "");
  const [showPassword, setShowPassword] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(
    answer?.agreePrivacy || false
  );
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counterCompleted, setCounterCompleted] = useState(
    answer?.counterCompleted || false
  );

  const [hideCounter, setHideCounter] = useState(false);

  logger.log("PotentialWeightLoss Component - answer:", allAnswers["1765827707460"].value.answer);

  logger.log("PotentialWeightLoss Component - step:", step);
  // Set timeout to hide counter after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHideCounter(true);
    }, 6000); // Hide counter after 6 seconds

    return () => clearTimeout(timer);
  }, []);

  // Check if user is already authenticated
  useEffect(() => {
    try {
      if (isAuthenticated()) {
        setIsAuth(true);
        setCounterCompleted(true); // Skip counter if already authenticated
        // Auto-submit if already authenticated
        onAnswerChange({
          answerType: "text",
          answer: {
            viewed: true,
            authenticated: true,
            email: email || "",
            password: password || "",
            agreePrivacy: true,
            counterCompleted: true,
          },
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleCounterComplete = (counterData) => {
    console.log("Counter completed, showing form...");

    // Wait 6 seconds before showing the form
    setTimeout(() => {
      setCounterCompleted(true);
      // Save counter completion to answer
      onAnswerChange({
        answerType: "text",
        answer: {
          ...answer,
          counterCompleted: true,
          counterData,
        },
      });
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    logger.log("Submitting form with:", { email, password, agreePrivacy });
    // Save data
    const userData = {
      email,
      // password,
      agreePrivacy,
      viewed: true,
      counterCompleted: true,
    };

    // Try login
    // const goNext = await TryLogin({ email, password, setLoading });
    // if (goNext === 0) return;

    // Submit answer to continue
    const answerData = {
      answerType: "text",
      answer: userData
    };
    onAnswerChange(answerData);

    onNext(answerData);
  };

  //

  const isButtonDisabled =
    !email ||
    !isValidEmail(email) ||
    !password ||
    !agreePrivacy ||
    !isValidPassword(password);

  // If authenticated, don't show anything (it will auto-continue)
  // if (isAuth) {
  //   return onAnswerChange({});
  // }

  return (
    <div className="w-full">
      {!hideCounter && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#e2e2e2] ">
          <div className="w-full max-w-[520px] px-4">
            <Counter
              step={step}
              answer={allAnswers["1765827707460"].value.answer}
              onAnswerChange={handleCounterComplete}
            />
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-t-2xl">
        <div className="w-full mx-auto">
          {/* <h2 className="subheaders-font text-[26px] md:text-[32px] font-medium leading-[120%] text-gray-900 mb-8">
            {step.title || "See how much weight you could lose"}
          </h2> */}

          <CustomImage
            src="https://pub-1aa26f93db354c659b0c049a51fe7fbe.r2.dev/lose-20-mob-b17421a3.png"
            width={520}
            height={400}
          />
          {!isAuth && (
            <div className="fixed inset-0 z-[2000] flex items-end justify-center backdrop-blur-[2px] bg-[rgba(245,244,239,0.7)]">
              <div className="w-full bg-white rounded-t-2xl">
                <div className="w-full md:w-[420px] max-w-[440px] rounded-t-[32px] bg-white  px-6 pt-8 pb-10 mx-auto">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                      <label className="block text-[14px] font-medium mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full border border-[#E5E5E5] rounded-lg px-4 py-4 text-[14px] focus:outline-none focus:border-black"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (!emailTouched) setEmailTouched(true);
                        }}
                        onBlur={() => {
                          if (!emailTouched) setEmailTouched(true);
                          if (String(email || "").trim().length > 0) {
                            setShowPasswordSection(true);
                          }
                        }}
                        aria-invalid={emailTouched && !isValidEmail(email)}
                        aria-describedby={
                          emailTouched && !isValidEmail(email)
                            ? "email-error"
                            : undefined
                        }
                        required
                      />
                      {emailTouched && !isValidEmail(email) && (
                        <p
                          id="email-error"
                          className="mt-2 text-[12px] text-red-600"
                          role="alert"
                        >
                          Please enter a valid email address (e.g.
                          name@domain.com)
                        </p>
                      )}
                    </div>

                    {showPasswordSection && (
                      <div>
                        <label className="block text-[14px] font-medium mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            className="w-full border border-[#E5E5E5] rounded-lg px-4 py-4 text-[14px] focus:outline-none focus:border-black pr-12"
                            placeholder="Enter Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 22 22"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M2 11C3.5 6.5 7.5 4 11 4C14.5 4 18.5 6.5 20 11C19.5 12.5 18.5 14 17 15.2M14.5 17C13.4 17.6 12.2 18 11 18C7.5 18 3.5 15.5 2 11C2.6 9.3 3.7 7.9 5.2 6.8M9 9.5C9.6 9.2 10.3 9 11 9C13.2 9 15 10.8 15 13C15 13.7 14.8 14.4 14.5 15M9 9.5L14.5 15M9 9.5L5.2 6.8"
                                  stroke="#888"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 22 22"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M2 11C3.5 6.5 7.5 4 11 4C14.5 4 18.5 6.5 20 11C18.5 15.5 14.5 18 11 18C7.5 18 3.5 15.5 2 11Z"
                                  stroke="#888"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle
                                  cx="11"
                                  cy="11"
                                  r="3"
                                  stroke="#888"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="privacy"
                        checked={agreePrivacy}
                        onChange={() => setAgreePrivacy((v) => !v)}
                        className="w-5 h-5 accent-black"
                      />
                      <label htmlFor="privacy" className="text-[12px]">
                        <span className="font-medium leading-[140%]">
                          By clicking "Continue" I agree to the{" "}
                          <Link
                            href="/terms-of-use"
                            className="text-[#00000080] font-bold underline"
                          >
                            Terms and Conditions
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/telehealth-consent"
                            className="text-[#00000080] font-bold underline"
                          >
                            Telehealth Consent
                          </Link>{" "}
                          and acknowledge the{" "}
                          <Link
                            href="/privacy-policy"
                            className="text-[#00000080] font-bold underline"
                          >
                            Privacy Policy.
                          </Link>
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className={`w-full mt-2 py-4 rounded-full h-[52px] text-[14px] font-semibold transition bg-black text-white ${
                        isButtonDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-900"
                      }`}
                      disabled={isButtonDisabled}
                    >
                      View Results
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
