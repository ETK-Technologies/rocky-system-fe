import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { logger } from "@/utils/devLogger";

const BASE_URL = process.env.ROCKY_BE_BASE_URL || "https://rocky-be-production.up.railway.app";

/**
 * PATCH /api/cart/items/[id]
 * Update cart item quantity using the new backend API
 * Supports both authenticated users and guest users
 * 
 * @param {string} id - Cart item ID (from route params)
 * @param {number} quantity - New quantity (0 to remove item)
 */
export async function PATCH(req, { params }) {
    try {
        const { id } = params;
        const { quantity } = await req.json();
        const cookieStore = await cookies();
        const authToken = cookieStore.get("authToken");

        // Get sessionId from query parameters (for guest users)
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        // Validate required fields
        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cart item ID is required",
                },
                { status: 400 }
            );
        }

        if (quantity === undefined || quantity === null) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Quantity is required",
                },
                { status: 400 }
            );
        }

        // Validate: Either authToken or sessionId must be provided
        if (!authToken && !sessionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Either authentication token or sessionId is required",
                },
                { status: 400 }
            );
        }

        try {
            // Build URL - only add sessionId if user is NOT authenticated
            // If both authToken and sessionId are provided, prioritize authToken (authenticated user)
            let url = `${BASE_URL}/api/v1/cart/items/${id}`;
            const useSessionId = !authToken && sessionId; // Only use sessionId if no authToken

            if (useSessionId) {
                url += `?sessionId=${encodeURIComponent(sessionId)}`;
            }

            // Prepare headers
            const headers = {
                "Content-Type": "application/json",
                accept: "application/json",
                "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
                "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
            };

            // Add Authorization header ONLY if user is authenticated
            // Do NOT send both Authorization and sessionId
            if (authToken) {
                headers["Authorization"] = authToken.value;
            }

            logger.log("Updating cart item quantity with new API:", {
                url,
                itemId: id,
                quantity,
                hasAuth: !!authToken,
                hasSessionId: useSessionId,
                method: "PATCH",
            });

            const response = await axios.patch(
                url,
                { quantity },
                { headers }
            );

            logger.log("Cart item quantity updated successfully:", response.data);

            // Fetch updated cart to return full cart data
            let cartUrl = `${BASE_URL}/api/v1/cart`;
            if (useSessionId) {
                const encodedSessionId = encodeURIComponent(sessionId);
                cartUrl += `?sessionId=${encodedSessionId}`;
            }
            const cartHeaders = {
                accept: "application/json",
                "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
                "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
            };

            if (authToken) {
                cartHeaders["Authorization"] = authToken.value;
            }

            const cartResponse = await axios.get(cartUrl, { headers: cartHeaders });
            const cartData = cartResponse.data;

            return NextResponse.json(cartData);
        } catch (error) {
            logger.error(
                "Error updating cart item quantity with new API:",
                error.response?.data || error.message
            );

            // Handle specific error responses from the API
            if (error.response?.status === 400) {
                return NextResponse.json(
                    {
                        success: false,
                        error: error.response.data?.message || "Invalid request",
                        items: [],
                        total_items: 0,
                        total_price: "0.00",
                    },
                    { status: 400 }
                );
            }

            if (error.response?.status === 404) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Cart item not found",
                        items: [],
                        total_items: 0,
                        total_price: "0.00",
                    },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: error.response?.data?.message || "Failed to update cart item quantity",
                    items: [],
                    total_items: 0,
                    total_price: "0.00",
                },
                { status: error.response?.status || 500 }
            );
        }
    } catch (error) {
        logger.error("Error in update cart item route:", error.message);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to update cart item. Please try again.",
                items: [],
                total_items: 0,
                total_price: "0.00",
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/cart/items/[id]
 * Remove cart item using the new backend API
 * Supports both authenticated users and guest users
 * 
 * @param {string} id - Cart item ID (from route params)
 */
export async function DELETE(req, { params }) {
    try {
        const { id } = params;
        const cookieStore = await cookies();
        const authToken = cookieStore.get("authToken");

        // Get sessionId from query parameters (for guest users)
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        // Validate required fields
        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cart item ID is required",
                },
                { status: 400 }
            );
        }

        // Validate: Either authToken or sessionId must be provided
        if (!authToken && !sessionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Either authentication token or sessionId is required",
                },
                { status: 400 }
            );
        }

        try {
            // Build URL - only add sessionId if user is NOT authenticated
            // If both authToken and sessionId are provided, prioritize authToken (authenticated user)
            let url = `${BASE_URL}/api/v1/cart/items/${id}`;
            const useSessionId = !authToken && sessionId; // Only use sessionId if no authToken

            if (useSessionId) {
                url += `?sessionId=${encodeURIComponent(sessionId)}`;
            }

            // Prepare headers
            const headers = {
                "Content-Type": "application/json",
                accept: "application/json",
                "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
                "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
            };

            // Add Authorization header ONLY if user is authenticated
            // Do NOT send both Authorization and sessionId
            if (authToken) {
                headers["Authorization"] = authToken.value;
            }

            logger.log("Removing cart item with new API:", {
                url,
                itemId: id,
                hasAuth: !!authToken,
                hasSessionId: useSessionId,
                method: "DELETE",
            });

            await axios.delete(url, {
                headers,
            });

            // API returns 204 No Content on success, so we need to fetch updated cart
            // Fetch updated cart to return full cart data
            let cartUrl = `${BASE_URL}/api/v1/cart`;
            if (useSessionId) {
                const encodedSessionId = encodeURIComponent(sessionId);
                cartUrl += `?sessionId=${encodedSessionId}`;
            }

            logger.log("Cart item removed successfully, fetching updated cart");
            const cartHeaders = {
                accept: "application/json",
                "X-App-Key": "app_04ecfac3213d7b179dc1e5ae9cb7a627",
                "X-App-Secret": "sk_2c867224696400bc2b377c3e77356a9e",
            };

            if (authToken) {
                cartHeaders["Authorization"] = authToken.value;
            }

            const cartResponse = await axios.get(cartUrl, { headers: cartHeaders });
            const cartData = cartResponse.data;

            return NextResponse.json(cartData);
        } catch (error) {
            logger.error(
                "Error removing cart item with new API:",
                error.response?.data || error.message
            );

            // Handle specific error responses from the API
            if (error.response?.status === 400) {
                return NextResponse.json(
                    {
                        success: false,
                        error: error.response.data?.message || "Invalid request",
                        items: [],
                        total_items: 0,
                        total_price: "0.00",
                    },
                    { status: 400 }
                );
            }

            if (error.response?.status === 404) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Cart item not found",
                        items: [],
                        total_items: 0,
                        total_price: "0.00",
                    },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: error.response?.data?.message || "Failed to remove cart item",
                    items: [],
                    total_items: 0,
                    total_price: "0.00",
                },
                { status: error.response?.status || 500 }
            );
        }
    } catch (error) {
        logger.error("Error in delete cart item route:", error.message);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to remove cart item. Please try again.",
                items: [],
                total_items: 0,
                total_price: "0.00",
            },
            { status: 500 }
        );
    }
}

