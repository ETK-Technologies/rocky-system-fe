import { useState, useRef, useEffect, useCallback } from "react";
import { logger } from "@/utils/devLogger";
import { toast } from "react-toastify";

const PostCanadaAddressAutocomplete = ({
  title,
  name,
  value,
  placeholder,
  required,
  onChange,
  onAddressSelected,
  country = "US", // Default to USA
  ...props
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Update local state when prop value changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch address suggestions from AddressComplete API (Canada/USA)
  const fetchSuggestions = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.log("Fetching suggestions for:", searchTerm, "Country:", country);
      const response = await fetch("/api/postcanada/address-autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchTerm, country }),
      });

      logger.log("Response status:", response.status);
      const responseText = await response.text();
      logger.log("Response text:", responseText);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      logger.log("Parsed response data:", data);

      if (data.error) {
        // Handle API errors (like URL restrictions)
        logger.error("API Error:", data);
        setError(`${data.error}: ${data.details || "Unknown error"}`);
        setSuggestions([]);
      } else if (data.addresses && Array.isArray(data.addresses)) {
        setSuggestions(data.addresses);
      } else {
        logger.log("No addresses in response:", data);
        setSuggestions([]);
      }
    } catch (err) {
      logger.error("Error fetching address suggestions:", err);
      setError("Failed to fetch address suggestions");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get full address details from AddressComplete API (Canada/USA)
  const getAddressDetails = async (addressId) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.log("Fetching address details for ID:", addressId);
      const response = await fetch("/api/postcanada/address-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addressId,
          searchTerm: inputValue,
        }),
      });

      logger.log("Response status:", response.status);
      const responseText = await response.text();
      logger.log("Response text:", responseText);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      logger.log("Parsed response data:", data);

      if (data.error) {
        // Handle API errors (unsupported states, URL restrictions, etc.)
        logger.error("API Error:", data);
        logger.log("Service Coverage URL:", data.serviceCoverageUrl);

        const errorMessage = data.details || data.error || "Unknown error";
        const serviceCoverageUrl =
          data.serviceCoverageUrl || "/service-coverage/";

        setError(errorMessage);

        // Show user-friendly toast notification with link to service coverage
        const ToastMessage = () => (
          <div>
            <span>{errorMessage}</span>
            <br />
            <a
              href={serviceCoverageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#fff",
                textDecoration: "underline",
                fontWeight: "bold",
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Check the states we currently support
            </a>
          </div>
        );

        toast.error(<ToastMessage />, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else if (data.address) {
        const address = data.address;

        // Format address for our form
        const formattedAddress = {
          address_1: address.street || "",
          address_2: address.unit || "",
          city: address.city || "",
          state: address.province || "",
          postcode: address.postalCode || "",
        };

        logger.log("Formatted address:", formattedAddress);

        const streetValue = address.street || "";
        setInputValue(streetValue);

        if (onAddressSelected) {
          onAddressSelected(formattedAddress);
        }
      } else {
        logger.log("No address in response:", data);
      }
    } catch (err) {
      logger.error("Error retrieving address details:", err);

      // Try to parse error message from API response
      let errorMessage = "Failed to retrieve address details";
      let serviceCoverageUrl = "/service-coverage/"; // Default fallback

      try {
        const errorText = err.message || err.toString();
        // Check if error contains JSON response with details
        const jsonMatch = errorText.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          logger.log("Parsed error data:", errorData);

          if (errorData.details) {
            errorMessage = errorData.details;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.serviceCoverageUrl) {
            serviceCoverageUrl = errorData.serviceCoverageUrl;
          }
        }
      } catch (parseError) {
        // If parsing fails, use default message
        logger.error("Could not parse error:", parseError);
      }

      logger.log("Final error message:", errorMessage);
      logger.log("Final service coverage URL:", serviceCoverageUrl);

      setError(errorMessage);

      // Show user-friendly toast notification with link
      const ToastMessage = () => (
        <div>
          <span>{errorMessage}</span>
          <br />
          <a
            href={serviceCoverageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#fff",
              textDecoration: "underline",
              fontWeight: "bold",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            Check the states we currently support
          </a>
        </div>
      );

      toast.error(<ToastMessage />, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setShowSuggestions(false);
    }
  };

  // Debounced fetch suggestions function
  const debouncedFetchSuggestions = useCallback((searchTerm) => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout to fetch suggestions after 300ms delay
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Use debounced fetch to avoid calling API on every keystroke
    debouncedFetchSuggestions(newValue);
    setShowSuggestions(true);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    logger.log("Selected suggestion:", suggestion);

    // Parse the address from the formatted address string
    const parseAddressFromSuggestion = (suggestion) => {
      const formattedAddress = suggestion.formattedAddress;
      const description = suggestion.originalData?.Description || "";

      logger.log("Parsing address from:", formattedAddress);
      logger.log("Description:", description);

      // Parse the description which contains "City, Province, PostalCode"
      const parts = description.split(",").map((part) => part.trim());

      if (parts.length >= 3) {
        const city = parts[0];
        const province = parts[1];
        // Clean the postal code by removing any text after " - " (e.g., "L4W 0G7 - 22 Addresses" becomes "L4W 0G7")
        const postalCodeRaw = parts[2];
        const postalCode = postalCodeRaw.split(" - ")[0].trim();

        // Extract street address from the formatted address
        const streetMatch = formattedAddress.match(/^([^,]+),/);
        const street = streetMatch ? streetMatch[1].trim() : "";

        const parsedAddress = {
          address_1: street,
          address_2: "",
          city: city,
          state: province,
          postcode: postalCode,
        };

        logger.log("Parsed address:", parsedAddress);
        return parsedAddress;
      }

      // Fallback to API call if parsing fails
      return null;
    };

    // Try to parse from suggestion first
    const parsedAddress = parseAddressFromSuggestion(suggestion);

    if (parsedAddress) {
      // Use parsed address directly
      if (onAddressSelected) {
        onAddressSelected(parsedAddress);
      }
      setInputValue(parsedAddress.address_1);
      setShowSuggestions(false);
    } else {
      // Fallback to API call
      getAddressDetails(suggestion.id);
    }
  };

  return (
    <div className="mb-4 md:mb-0 w-full" ref={wrapperRef}>
      <label
        htmlFor={name}
        className="block text-[14px] leading-[19.6px] font-[500] text-[#212121] mb-2"
      >
        {title}
        {required && "*"}
      </label>
      <div className="relative">
        <input
          type="text"
          id={name}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full !bg-white !rounded-[8px] !border !border-solid !border-[#E2E2E1] !px-[16px] py-[12px] h-[44px] !focus:outline-none !focus:border-gray-500"
          autoComplete="off"
          {...props}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg
              className="animate-spin"
              width="20px"
              height="20px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#757575"
                strokeWidth="4"
                strokeDasharray="32"
                strokeDashoffset="16"
                fill="none"
              />
            </svg>
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id || index}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="text-sm text-gray-900">
                  {suggestion.formattedAddress}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="absolute z-50 w-full mt-1 bg-red-50 border border-red-200 rounded-md shadow-lg p-3">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCanadaAddressAutocomplete;
