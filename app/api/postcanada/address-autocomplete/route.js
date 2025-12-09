import { NextResponse } from "next/server";
import { logger } from "@/utils/devLogger";
import { PHASE_1_STATES } from "@/lib/constants/usStates";
import { getOrigin } from "@/lib/utils/getOrigin";

const POSTCANADA_API_KEY = process.env.POSTCANADA_API_KEY;
const POSTCANADA_API_URL =
  "https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws";

export async function POST(request) {
  try {
    const { query, country = "US" } = await request.json();

    if (!query || query.length < 1) {
      return NextResponse.json(
        { error: "Query must be at least 1 character long" },
        { status: 400 }
      );
    }

    if (!POSTCANADA_API_KEY) {
      logger.error("Post Canada API key is missing");
      return NextResponse.json(
        { error: "Post Canada API key is not configured" },
        { status: 500 }
      );
    }

    // Convert country code to API format (CA -> CAN, US -> USA)
    const apiCountryCode =
      country === "CA" ? "CAN" : country === "US" ? "USA" : country;

    logger.log("Making request to Address API with query:", query);
    logger.log("Country:", apiCountryCode);
    logger.log("API Key present:", !!POSTCANADA_API_KEY);

    const url = new URL(POSTCANADA_API_URL);
    url.searchParams.append("Key", POSTCANADA_API_KEY);
    url.searchParams.append("SearchTerm", query);
    url.searchParams.append("Country", apiCountryCode);
    url.searchParams.append("MaxSuggestions", "10");
    url.searchParams.append("LanguagePreference", "en");

    // Get origin for Origin and Referer headers (required for PostCanada API)
    const origin = getOrigin(request);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Referer: origin,
      },
    });

    logger.log("Post Canada API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Post Canada API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Post Canada API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    logger.log("Post Canada API response data:", data);

    // Check for API errors first
    if (data.Error) {
      logger.error("Post Canada API error:", data);
      return NextResponse.json(
        {
          error: "Post Canada API Error",
          details: data.Description || data.Cause || "Unknown error",
          resolution: data.Resolution || "Please check your API configuration",
        },
        { status: 400 }
      );
    }

    if (!data.Items || !Array.isArray(data.Items)) {
      logger.error("Invalid response format from Post Canada:", data);
      return NextResponse.json(
        { error: "Invalid response format from Post Canada" },
        { status: 500 }
      );
    }

    // Helper function to extract state code from description
    const extractStateCode = (description) => {
      if (!description) return null;

      // Description format is typically: "City, State, ZIP"
      // Example: "Chicago, IL, 60601"
      const parts = description.split(",").map((part) => part.trim());

      if (parts.length >= 2) {
        // State is usually the second part
        const statePart = parts[1];

        // Extract 2-letter state code
        const stateMatch = statePart.match(/\b([A-Z]{2})\b/);
        if (stateMatch) {
          return stateMatch[1];
        }
      }

      return null;
    };

    // Log raw items before transformation
    logger.log("Raw API Items count:", data.Items.length);
    logger.log("Raw API Items:", data.Items);

    // Transform and filter addresses by supported states
    const addresses = data.Items.map((item, index) => {
      // Extract state code from description
      const stateCode = extractStateCode(item.Description);

      // Create full address with proper formatting
      const fullAddress = [item.Text, item.Description]
        .filter(Boolean)
        .join(", ");

      return {
        id: item.Id,
        formattedAddress: fullAddress,
        stateCode: stateCode,
        // Store original data for address details
        originalData: item,
      };
    }).filter((address) => {
      // Exclude addresses with "- X Addresses" suffix as they don't work properly
      if (
        address.formattedAddress.includes("- ") &&
        address.formattedAddress.match(/\d+ Addresses?$/)
      ) {
        logger.log(
          "Filtering out address with '- X Addresses' suffix:",
          address.formattedAddress
        );
        return false;
      }

      // For US addresses, filter by state
      if (country === "US" || apiCountryCode === "USA") {
        // If no state code detected (early in search/typing), INCLUDE it
        // This allows users to see suggestions while typing
        // if (!address.stateCode) {
        //   logger.log(
        //     "Including address without state code:",
        //     address.formattedAddress
        //   );
        //   return true;
        // }
        // // If state code is detected, only include if it's supported
        // const isSupported = PHASE_1_STATES.includes(address.stateCode);
        // if (!isSupported) {
        //   logger.log(
        //     `Filtering out unsupported state ${address.stateCode}:`,
        //     address.formattedAddress
        //   );
        // }
        // return isSupported;
        return true;
      }
      return true; // For non-US addresses, include all
    });

    logger.log("Filtered addresses count:", addresses.length);
    logger.log("Filtered addresses (supported states only):", addresses);
    logger.log("Supported states:", PHASE_1_STATES);

    return NextResponse.json({ addresses });
  } catch (error) {
    logger.error("Post Canada address autocomplete error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch address suggestions", details: error.message },
      { status: 500 }
    );
  }
}
