import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Validation utilities - pure functions outside component
const isValidDate = (dateStr) => {
  if (!dateStr || dateStr.length !== 10) return false;

  const parts = dateStr.split("/");
  if (parts.length !== 3) return false;

  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Basic validation
  if (
    isNaN(month) ||
    isNaN(day) ||
    isNaN(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900 ||
    year > new Date().getFullYear()
  ) {
    return false;
  }

  // Create date and verify it's valid
  const date = new Date(year, month - 1, day);
  return (
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getFullYear() === year
  );
};

const calculateAge = (birthDate) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const formatDateToDisplay = (value) => {
  if (!value) return "";
  
  if (value.includes("-")) {
    // Handle YYYY-MM-DD format
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[1].padStart(2, "0")}/${parts[2].padStart(2, "0")}/${parts[0]}`;
    }
  } else if (/^\d{8}$/.test(value)) {
    // Handle legacy YYYYMMDD format
    const year = value.substring(0, 4);
    const month = value.substring(4, 6);
    const day = value.substring(6, 8);
    return `${month}/${day}/${year}`;
  }
  
  return value;
};

const formatDateToBackend = (dateStr) => {
  if (!dateStr || dateStr.length !== 10) return dateStr;
  
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  
  return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
};

export default function DateInput({ id, label, placeholder = "MM/DD/YYYY", value, onChange, minAge = 18, required = false }) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const [lastKeyWasBackspace, setLastKeyWasBackspace] = useState(false);

  // Initialize and sync with external value changes
  useEffect(() => {
    const formatted = formatDateToDisplay(value);
    if (formatted !== inputValue) {
      setInputValue(formatted);
    }
  }, [value]);

  const handleKeyDown = useCallback((e) => {
    setLastKeyWasBackspace(e.key === "Backspace" || e.key === "Delete");
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const prevValue = inputValue;

    // Detect if user is deleting (backspace/delete key or input is shorter)
    const isDeleting = input.length < prevValue.length || lastKeyWasBackspace;

    // Reset the backspace flag
    setLastKeyWasBackspace(false);

    // If user is deleting, allow them to remove anything including slashes
    if (isDeleting) {
      // Clean the input
      let cleaned = input.replace(/[^\d/]/g, "");

      // If we have digits without proper slash structure, try to maintain structure
      // This handles cases like "091998" -> should become "09//1998" if we had "09/10/1998"
      const prevParts = prevValue.split("/");
      const newParts = cleaned.split("/");

      // If we went from 3 parts to fewer, but still have digits in all positions,
      // we need to preserve the slash structure
      if (prevParts.length === 3 && newParts.length < 3) {
        const digitsOnly = cleaned.replace(/\//g, "");

        // If we have 6+ digits (like "091998"), assume structure was lost
        if (digitsOnly.length >= 6 && newParts.length === 1) {
          // Reconstruct as MM//YYYY or similar based on what was likely deleted
          const month = digitsOnly.substring(0, 2);
          const rest = digitsOnly.substring(2);

          // Check if rest looks like a year (4 digits) or has more
          if (rest.length === 4 && parseInt(rest) > 1900) {
            // Likely deleted the day, keep structure as MM//YYYY
            cleaned = `${month}//${rest}`;
          } else if (rest.length > 4) {
            // Extract potential day and year
            const possibleDay = rest.substring(0, rest.length - 4);
            const possibleYear = rest.substring(rest.length - 4);
            cleaned = `${month}/${possibleDay}/${possibleYear}`;
          }
        }
        // If we have "MM/YYYY" format, keep the slash structure as "MM//YYYY"
        else if (
          newParts.length === 2 &&
          newParts[1].length === 4 &&
          parseInt(newParts[1]) > 1900
        ) {
          cleaned = `${newParts[0]}//${newParts[1]}`;
        }
      }

      setInputValue(cleaned);

      // Preserve cursor position after deletion
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);

      // Call onChange with proper format
      const formattedValue = cleaned.length === 10 && isValidDate(cleaned) 
        ? formatDateToBackend(cleaned)
        : cleaned;
      onChange?.(id, formattedValue);
      return;
    }

    // Allow direct editing with slashes for typing/adding characters
    let formatted = input;

    // Remove any non-digit characters except slashes
    formatted = formatted.replace(/[^\d/]/g, "");

    // Split into parts
    const parts = formatted.split("/");

    // Limit each part to appropriate length
    let month = parts[0] ? parts[0].substring(0, 2) : "";
    let day = parts[1] ? parts[1].substring(0, 2) : "";
    let year = parts[2] ? parts[2].substring(0, 4) : "";

    // Rebuild the formatted string, preserving slashes that exist
    let result = month;

    // Add first slash if we have day part or if month is complete
    if (parts.length > 1) {
      result += "/";
      result += day;

      // Add second slash if we have year part or if day is complete (2 digits)
      if (parts.length > 2) {
        result += "/";
        result += year;
      } else if (
        day.length === 2 &&
        cursorPosition >= 5 &&
        cursorPosition <= 6
      ) {
        // Auto-add slash after completing day
        result += "/";
      }
    } else if (
      month.length === 2 &&
      cursorPosition >= 2 &&
      cursorPosition <= 3
    ) {
      // Auto-add slash after completing month (works on re-entry too)
      result += "/";
    }

    setInputValue(result);

    // Handle cursor position for adding characters
    setTimeout(() => {
      if (inputRef.current) {
        let newCursorPos = cursorPosition;
        let selectionEnd = cursorPosition; // For auto-selecting next section

        // If we just completed the month (2 digits) and slash exists after it
        if (
          month.length === 2 &&
          result.charAt(2) === "/" &&
          cursorPosition >= 2 &&
          cursorPosition <= 3
        ) {
          // Jump cursor after the slash
          newCursorPos = 3;

          // If there's already a day value, select it for easy overwriting
          if (day.length > 0) {
            selectionEnd = 3 + day.length;
          } else {
            selectionEnd = 3;
          }
        }
        // If we just completed the day (2 digits) and slash exists after it
        else if (
          day.length === 2 &&
          result.charAt(5) === "/" &&
          cursorPosition >= 5 &&
          cursorPosition <= 6
        ) {
          // Jump cursor after the slash
          newCursorPos = 6;

          // If there's already a year value, select it for easy overwriting
          if (year.length > 0) {
            selectionEnd = 6 + year.length;
          } else {
            selectionEnd = 6;
          }
        }
        // Otherwise keep cursor where it is
        else {
          newCursorPos = cursorPosition;
        }

        inputRef.current.setSelectionRange(newCursorPos, selectionEnd);
      }
    }, 0);

    // Call onChange with appropriate format
    const formattedValue = result.length === 10 && isValidDate(result)
      ? formatDateToBackend(result)
      : result;
    onChange?.(id, formattedValue);
  };

  // Memoized validation for age check
  const isValidAge = useMemo(() => {
    if (!inputValue || !isValidDate(inputValue)) return false;

    const parts = inputValue.split("/");
    const birthDate = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[0], 10) - 1,
      parseInt(parts[1], 10)
    );

    return calculateAge(birthDate) >= minAge;
  }, [inputValue, minAge]);

  const handleDatePickerChange = useCallback((e) => {
    if (e.target.value) {
      // Convert YYYY-MM-DD to MM/DD/YYYY format
      const [year, month, day] = e.target.value.split("-");
      const formatted = `${month}/${day}/${year}`;

      setInputValue(formatted);

      // Call onChange with backend format
      const formattedValue = isValidDate(formatted) 
        ? formatDateToBackend(formatted)
        : formatted;
      onChange?.(id, formattedValue);
    }
  }, [id, onChange]);

  const handleDatePickerBlur = useCallback(() => {
    // Trigger final validation when user finishes selecting date
    if (inputValue && isValidDate(inputValue)) {
      onChange?.(id, formatDateToBackend(inputValue));
    }
  }, [inputValue, id, onChange]);

  // Memoized date picker value conversion
  const datePickerValue = useMemo(() => {
    if (inputValue && inputValue.length === 10 && isValidDate(inputValue)) {
      return formatDateToBackend(inputValue);
    }
    return "";
  }, [inputValue]);

  // Memoized validation state
  const isValid = useMemo(() => {
    return inputValue && isValidDate(inputValue) && isValidAge;
  }, [inputValue, isValidAge]);

  // Memoized error message
  const errorMessage = useMemo(() => {
    if (!inputValue || isValid) return null;
    
    return !isValidDate(inputValue)
      ? "Please enter a valid date in MM/DD/YYYY format"
      : `You must be ${minAge} years of age or older to continue.`;
  }, [inputValue, isValid, minAge]);

  return (
    <div>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      <div className="relative w-full">
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
            required={required}
            name={id}
            id={id}
            maxLength={10}
            aria-label={label}
            aria-invalid={inputValue && !isValid}
            aria-describedby={errorMessage ? `${id}-error` : undefined}
            autoComplete="bday"
          />

          {/* Date Picker Icon */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="relative">
              <svg
                className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>

              {/* Hidden Date Input */}
              <input
                type="date"
                value={datePickerValue}
                onChange={handleDatePickerChange}
                onBlur={handleDatePickerBlur}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                max={new Date().toISOString().split("T")[0]}
                min="1900-01-01"
                tabIndex={-1}
                aria-label={`${label} calendar picker`}
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div 
            id={`${id}-error`}
            className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <p className="text-red-600 text-sm">
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
