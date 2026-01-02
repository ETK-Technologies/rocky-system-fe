import React, { useEffect, useState } from "react";

export default function BMICalculator({ step, answer, onAnswerChange }) {
  // Extract the actual answer data from nested structure
  const getInitialAnswer = () => {
    if (!answer) return { weight: "", height: { feet: "", inches: "" }, bmi: "" };
    
    let answerData;
    if (typeof answer === 'object') {
      // Check if answer has value.answer structure (from backend)
      if (answer.value && answer.value.answer) {
        answerData = answer.value.answer;
      }
      // Check if answer has answer property directly (from UI interaction)
      else if (answer.answer) {
        answerData = answer.answer;
      }
      // Otherwise use answer as is
      else {
        answerData = answer;
      }
    } else {
      answerData = answer;
    }
    
    return {
      weight: answerData?.weight || "",
      height: {
        feet: answerData?.height?.feet || "",
        inches: answerData?.height?.inches || "",
      },
      bmi: answerData?.bmi || "",
    };
  };

  const [userData, setUserData] = useState(getInitialAnswer());

  // Sync userData with answer prop when it changes (for loading existing answers)
  useEffect(() => {
    if (answer) {
      const initialData = getInitialAnswer();
      setUserData(initialData);
      console.log("✅ BMICalculator: Loaded existing answer:", initialData);
    }
  }, [JSON.stringify(answer)]);

  const { weight: weightPounds, height = {}, bmi } = userData || {};
  const { feet: heightFeet = "", inches: heightInches = "" } = height;

  useEffect(() => {
    const feetNum = parseFloat(heightFeet) || 0;
    const inchesNum = parseFloat(heightInches) || 0;
    const weightNum = parseFloat(weightPounds) || 0;
    let bmiValue = "";
    if (feetNum > 0 && inchesNum >= 0 && inchesNum < 12 && weightNum > 0) {
      const heightInInches = feetNum * 12 + inchesNum;
      bmiValue = (
        (weightNum / (heightInInches * heightInInches)) *
        703
      ).toFixed(2);
    }
    const newUserData = {
      ...userData,
      bmi: bmiValue,
      height: { feet: heightFeet, inches: heightInches },
      weight: weightPounds,
    };
    setUserData(newUserData);
    onAnswerChange({ answerType: "text", answer: newUserData });
  }, [weightPounds, heightFeet, heightInches]);

  const PrivacyText = () => (
    <p className="text-[10px] my-6 text-[#00000059] text-left font-[400] leading-[140%] tracking-[0%] mb-64">
      We respect your privacy. All of your information is securely stored on our
      HIPPA Compliant server.
    </p>
  );

  const isEligible = bmi && !isNaN(parseFloat(bmi)) && parseFloat(bmi) >= 27;
  const bmiDisplay =
    bmi && !isNaN(parseFloat(bmi)) ? parseFloat(bmi).toFixed(1) : 0;

  return (
    <div className="w-full h-full flex flex-col">
        <div className="w-full">
          <div className="mb-4">
          <h1 className="subheaders-font text-[26px] md:text-[32px]  font-medium leading-[120%] ">
            What is your height and weight?
          </h1>
        </div>
        <p className="text-[14px] text-[#AE7E56] mb-[24px] md:w-full font-medium">
          <span className="text-[#B4845A] text-[16px]">
            This helps calculate your BMI (Body Mass Index), a general screening
            tool for body composition.
          </span>
        </p>
        <div className="mb-6">
          <label className="block mb-2 text-[14px] md:text-[16px] font-medium leading-[140%] tracking-[0%] text-black">
            Your height is:
          </label>
          <div className="flex items-center mb-4 gap-2">
            <input
              type="number"
              min="0"
              className="h-[60px] w-full p-3 border border-gray-300 rounded-md "
              placeholder="Feet"
              value={
                heightFeet !== undefined && heightFeet !== null
                  ? heightFeet
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                setUserData((prev) => ({
                  ...prev,
                  height: {
                    ...prev.height,
                    feet: value === "" ? "" : parseInt(value) || 0,
                    inches: heightInches,
                  },
                  weight: weightPounds,
                }));
              }}
            />
            <button
              className="min-w-[60px] h-[60px] p-3 text-2xl border border-gray-300 rounded-md flex items-center justify-center"
              onClick={() => {
                setUserData((prev) => ({
                  ...prev,
                  height: {
                    ...prev.height,
                    feet: Math.max(0, (parseInt(heightFeet) || 0) - 1),
                    inches: heightInches,
                  },
                  weight: weightPounds,
                }));
              }}
              type="button"
            >
              −
            </button>
            <button
              className="min-w-[60px] h-[60px] p-3 text-2xl border border-gray-300 rounded-md flex items-center justify-center"
              onClick={() => {
                setUserData((prev) => ({
                  ...prev,
                  height: {
                    ...prev.height,
                    feet: (parseInt(heightFeet) || 0) + 1,
                    inches: heightInches,
                  },
                  weight: weightPounds,
                }));
              }}
              type="button"
            >
              +
            </button>
          </div>

          <div className="flex items-center">
            <input
              type="number"
              min="0"
              className="h-[60px] w-full p-3 border border-gray-300 rounded-md mr-2"
              placeholder="Inches"
              value={
                heightInches !== undefined && heightInches !== null
                  ? heightInches
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                setUserData((prev) => ({
                  ...prev,
                  height: {
                    ...prev.height,
                    feet: heightFeet,
                    inches: value === "" ? "" : parseInt(value) || 0,
                  },
                  weight: weightPounds,
                }));
              }}
            />
            <button
              className="min-w-[60px] h-[60px] p-3 text-2xl border border-gray-300 rounded-md flex items-center justify-center"
              onClick={() => {
                setUserData((prev) => ({
                  ...prev,
                  height: {
                    ...prev.height,
                    feet: heightFeet,
                    inches: Math.max(0, (parseInt(heightInches) || 0) - 1),
                  },
                  weight: weightPounds,
                }));
              }}
              type="button"
            >
              −
            </button>
            <button
              className="min-w-[60px] h-[60px] p-3 text-2xl border border-gray-300 rounded-md flex items-center justify-center ml-2"
              onClick={() => {
                setUserData((prev) => ({
                  ...prev,
                  height: {
                    ...prev.height,
                    feet: heightFeet,
                    inches: Math.min(11, (parseInt(heightInches) || 0) + 1),
                  },
                  weight: weightPounds,
                }));
              }}
              type="button"
            >
              +
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-[14px] md:text-[16px] font-medium leading-[140%] tracking-[0%] text-black">
            Your weight is:
          </label>
          <input
            type="number"
            className="h-[60px] w-full p-3 border border-gray-300 rounded-md"
            placeholder="Weight (Pounds)"
            value={
              weightPounds !== undefined && weightPounds !== null
                ? weightPounds
                : ""
            }
            onChange={(e) => {
              const value = e.target.value;
              setUserData((prev) => ({
                ...prev,
                weight: value === "" ? "" : parseInt(value) || 0,
                height: { feet: heightFeet, inches: heightInches },
              }));
            }}
          />
        </div>

        <div className="bg-gradient-to-b from-[#F5F4EF] to-[#F7F7F7]/0 flex justify-center items-center flex-col rounded-md p-6 h-[181px]">
          <div className="text-center">
            <p className="text-sm mb-2">Your BMI</p>
            <p className="text-6xl font-bold">{bmiDisplay}</p>
          </div>
        </div>

        {bmi && !isEligible ? (
          <p className="text-center text-sm text-red-700 mb-2 font-bold">
            Based on your BMI ({bmiDisplay}), you may not qualify for medical
            weight loss
          </p>
        ) : null}
      </div>
    </div>
  );
}
