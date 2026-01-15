import { NextResponse } from "next/server";
import axios from "axios";
import { logger } from "@/utils/devLogger";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/utils/getOrigin";
import { getAuthTokenFromCookies, getUserIdFromCookies } from "@/services/userDataService";

const BASE_URL = process.env.BASE_URL;

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);

    // Check if user is authenticated
    if (!authToken || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
          cards: [],
        },
        { status: 401 }
      );
    }

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(request);

    // Call the custom endpoint in WordPress
    const response = await axios.get(
      `${BASE_URL}/wp-json/custom/v1/payment_tokens?customer_id=${userId.value}`,
      {
        headers: {
          Authorization: `${authToken.value}`,
          "Origin": origin,
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        },
      }
    );

    const raw = response.data;

    const savedCards = Array.isArray(raw.cards)
      ? raw.cards.map((card) => ({
          id: card.id.toString(),
          last4: card.last4,
          brand: card.brand?.toLowerCase() ?? "unknown",
          exp_month: parseInt(card.expiry_month),
          exp_year: parseInt(card.expiry_year),
          is_default: card.is_default,
          token: card.token,
        }))
      : [];

    return NextResponse.json({
      success: true,
      message: response.message,
      data: response.data,
      cards: savedCards,
    });
  } catch (error) {
    logger.error(
      "Error fetching saved payment methods:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch saved payment methods",
        error: error.message,
        respone: error.response?.data,
        cards: [],
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);
    const { cardId } = await req.json();

    if (!authToken || !userId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // Call the new backend endpoint to remove the card
    const response = await axios.delete(
      `${BASE_URL}/wp-json/custom/v1/payment_tokens/remove`,
      {
        data: { customer_id: userId.value, card_id: cardId },
        headers: {
          Authorization: `${authToken.value}`,
          "Origin": origin,
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Card deleted",
      data: response.data,
    });
  } catch (error) {
    logger.error(
      "Error deleting saved card:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete card",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);
    const { cardId, makeDefault } = await req.json();

    if (!authToken || !userId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    if (makeDefault) {
      // Get origin for Origin header (required for backend domain whitelist)
      const origin = getOrigin(req);

      // Call the new backend endpoint to set default card
      const response = await axios.post(
        `${BASE_URL}/wp-json/custom/v1/payment_tokens/default`,
        { customer_id: userId.value, card_id: cardId },
        {
          headers: {
            Authorization: `${authToken.value}`,
            "Origin": origin,
            "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
            "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
          }
        }
      );
      return NextResponse.json({
        success: true,
        message: "Card set as default",
        data: response.data,
      });
    }

    return NextResponse.json(
      { success: false, message: "No valid PATCH action provided." },
      { status: 500 }
    );
  } catch (error) {
    logger.error(
      "Error updating saved card:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update card",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const authToken = getAuthTokenFromCookies(cookieStore);
    const userId = getUserIdFromCookies(cookieStore);
    const { cardId, expiry_month, expiry_year } = await req.json();

    if (!authToken || !userId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get origin for Origin header (required for backend domain whitelist)
    const origin = getOrigin(req);

    // Call the new backend endpoint to edit card expiry
    const response = await axios.post(
      `${BASE_URL}/wp-json/custom/v1/payment_tokens/edit`,
      {
        customer_id: userId.value,
        card_id: cardId,
        expiry_month,
        expiry_year,
      },
      {
        headers: {
          Authorization: `${authToken.value}`,
          "Origin": origin,
          "X-App-Key": process.env.NEXT_PUBLIC_APP_KEY,
          "X-App-Secret": process.env.NEXT_PUBLIC_APP_SECRET,
        }
      }
    );
    return NextResponse.json({
      success: true,
      message: "Card updated",
      data: response.data,
    });
  } catch (error) {
    logger.error(
      "Error editing saved card:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update card",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
