"use client";

import { useState } from "react";

export default function UploadPhotoIDNote({ step, answer, onAnswerChange }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div>
      <h1 className="text-[26px] md:text-[32px] font-semibold mb-6">
        Upload Photo ID
      </h1>

      <p className="text-[#C8A76B] mb-4">
        Please note this step is mandatory. If you are unable to complete at this time, email your ID to{" "}
        <a
          className="text-[#C8A76B] underline"
          href="mailto:clinicadmin@myrocky.com"
        >
          clinicadmin@myrocky.com
        </a>
        .
      </p>

      <p className="mb-6">
        Your questionnaire will not be reviewed without this. As per our T&C's a{" "}
        <strong>$45 cancellation fee</strong> will be charged if we are unable to verify you.
      </p>

      <div className="mb-6">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 mr-3"
            checked={isChecked}
            onChange={(e) => {
              setIsChecked(e.target.checked);
              if (e.target.checked) {
                onAnswerChange("acknowledged");
              } else {
                onAnswerChange(null);
              }
            }}
          />
          <span>
            I hereby understand and acknowledge the above message
          </span>
        </label>
      </div>

      {/* <button
        onClick={() => {
          if (isChecked) {
            onAnswerChange("acknowledged");
          }
        }}
        disabled={!isChecked}
        className={`w-full py-4 px-4 rounded-full text-white font-medium text-lg ${
          isChecked ? "bg-black" : "bg-gray-400"
        }`}
      >
        I acknowledge
      </button> */}
    </div>
  );
}
