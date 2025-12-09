"use client";

import { useEffect, useState, Suspense } from "react";
import { logger } from "@/utils/devLogger";
import { CiCircleAlert, CiCircleCheck } from "react-icons/ci";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Loader from "../Loader";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import CustomImage from "../utils/CustomImage";
import { analyticsService } from "@/utils/analytics/analyticsService";
import { formatPrice } from "@/utils/priceFormatter";
import { getCurrency } from "@/lib/constants/currency";

// AWIN API configuration
const AWIN_CONFIG = {
  endpoint: "/api/awin/track-order", // Proxy to WP BASE_URL
  timeout: 5000, // 5 second timeout for non-critical tracking
};

// Helper: read cookie by name (client-only)
const readCookie = (name) => {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
};

// Configure AWIN.Tracking.Sale and explicitly fire the AWIN JS conversion (sread.js)
const fireAwinClientPixel = (orderData, s2sOrderData = null) => {
  try {
    if (!orderData || !orderData.id) return;
    const merchantId = process.env.NEXT_PUBLIC_AWIN_MERCHANT_ID || "101159";
    const subtotal = s2sOrderData
      ? Number.parseFloat(s2sOrderData.subtotal_amount || 0) || 0
      : Math.max(
          0,
          (Number.parseFloat(orderData.total || 0) || 0) -
            (Number.parseFloat(orderData.total_tax || 0) || 0) -
            (Number.parseFloat(orderData.shipping_total || 0) || 0)
        );
    const currency = s2sOrderData?.currency || orderData.currency || getCurrency();
    const orderRef =
      s2sOrderData?.order_reference || orderData.number || String(orderData.id);
    const commissionGroup = s2sOrderData?.commission_group || "DEFAULT";
    const vouchers =
      s2sOrderData?.voucher ??
      (Array.isArray(orderData.coupon_lines)
        ? orderData.coupon_lines.map((c) => c.code).filter(Boolean).join(",")
        : "");
    const awc = readCookie("_awin_awc") || readCookie("awc");
    const channel = awc ? "aw" : "other";
    const loc = typeof window !== "undefined" ? window.location.href : "";

    // Map products to AWIN format
    const products = Array.isArray(orderData.line_items)
      ? orderData.line_items.map((it) => {
          const qty = parseInt(it.quantity || 1, 10) || 1;
          const lineTotal = Number.parseFloat(it.total || 0) || 0;
          const unit = qty > 0 ? lineTotal / qty : 0;
          return {
            sku: String(it.sku || it.id || it.product_id || it.variation_id || ""),
            quantity: String(qty),
            unitPrice: formatPrice(unit),
          };
        })
      : [];

    window.AWIN = window.AWIN || {};
    window.AWIN.Tracking = window.AWIN.Tracking || {};
    window.AWIN.Tracking.Sale = {
      amount: formatPrice(subtotal),
      orderRef: String(orderRef),
      currency,
      test: String(parseInt(process.env.NEXT_PUBLIC_AWIN_TESTMODE || "0", 10) === 1 ? 1 : 0),
      parts: `${commissionGroup}:${formatPrice(subtotal)}`,
      voucher: vouchers,
      channel,
      products,
    };

    // Fire the official AWIN JS conversion pixel (sread.js)
    const params = new URLSearchParams();
    params.set("a", merchantId);
    params.set("b", formatPrice(subtotal));
    params.set("cr", currency);
    params.set("c", String(orderRef));
    params.set("d", `${commissionGroup}:${formatPrice(subtotal)}`);
    params.set("ch", channel);
    if (vouchers) params.set("vc", vouchers);
    if (awc) params.set("cks", awc);
    params.set("tv", "2");
    params.set("tt", "js");
    if (loc) params.set("l", loc);

    const src = `https://www.awin1.com/sread.js?${params.toString()}`;
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = src;
    (document.head || document.body).appendChild(s);
  } catch (e) {
    logger?.warn?.("[AWIN] Failed to configure client conversion:", e);
  }
};

// Function to send AWIN tracking
const sendAwinTracking = async (orderData) => {
  if (!orderData || !orderData.id) {
    logger.warn("[AWIN] No order data provided for tracking");
    return null;
  }

  try {
    logger.log(`[AWIN] Sending tracking for order ${orderData.id}...`);

    const trackingData = {
      order_id: parseInt(orderData.id, 10),
      order_data: orderData,
    };

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AWIN_CONFIG.timeout);

    const response = await fetch(AWIN_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(trackingData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const responseData = await response.json();
      logger.log("[AWIN] ✅ Order tracking successful", {
        order_id: orderData.id,
        order_total: orderData.total,
        currency: orderData.currency,
        order_number: orderData.number,
        awc_sent: !!trackingData.order_data?.meta_data?.find(
          (m) => m.key === "_awin_awc"
        )?.value,
        awin_response: responseData,
      });
      return responseData?.order_data || null;
    } else {
      logger.warn(
        `[AWIN] Tracking response not OK: ${response.status} ${response.statusText}`
      );
      return null;
    }
  } catch (error) {
    // Silently log error since this shouldn't affect user experience
    if (error.name === "AbortError") {
      logger.warn("[AWIN] Tracking request timed out (non-critical)");
    } else {
      logger.error("[AWIN] Error sending tracking (non-critical):", error);
    }
    return null;
  }
};

// sendGA4PurchaseEvent replaced by analyticsService.trackPurchase

// Function to check if a questionnaire has already been completed
const checkQuestionnaireCompletion = async (questionnaireId) => {
  try {
    const response = await fetch("/api/check-questionnaire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionnaire_id: questionnaireId,
      }),
    });

    const data = await response.json();
    logger.log("[Debug] Questionnaire completion data:", data);
    return data.completed;
  } catch (error) {
    logger.error("Error checking questionnaire completion:", error);
    return false;
  }
};

const OrderReceivedContent = ({ userId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [isQuestionnaireCompleted, setIsQuestionnaireCompleted] =
    useState(false);
  const [questionnaireCheckComplete, setQuestionnaireCheckComplete] =
    useState(false);
  const key = searchParams.get("key");
  const params = useParams();
  const orderId = params.id;

  // Get flow parameters
  const mhFlow = searchParams.get("mh-flow");
  const edFlow = searchParams.get("ed-flow");
  const wlFlow = searchParams.get("wl-flow");
  const hairFlow = searchParams.get("hair-flow");
  const smokingFlow = searchParams.get("smoking-flow");

  // Determine if we should redirect and where to
  const shouldRedirect =
    mhFlow === "1" ||
    edFlow === "1" ||
    wlFlow === "1" ||
    hairFlow === "1" ||
    smokingFlow === "1";

  // Function to generate the seskey
  const generateSeskey = (userId) => {
    const expiration = Math.floor(Date.now() / 1000) + 10 * 60;
    const seskeyData = {
      user_id: userId,
      expiration: expiration,
    };
    return btoa(JSON.stringify(seskeyData));
  };
  // Determine the redirect destination
  const getRedirectPath = () => {
    // Build the base path based on flow type
    let basePath = "";
    if (mhFlow === "1") basePath = "/mh-quiz";
    if (edFlow === "1") basePath = "/ed-consultation-quiz";
    if (wlFlow === "1") basePath = "/wl-consultation";
    if (hairFlow === "1") basePath = "/hair-main-questionnaire";
    if (smokingFlow === "1") basePath = "/smoking-consultation/?checked-out=1";

    logger.log("[Debug] Base path:", basePath);
    logger.log("[Debug] Flow parameters:", {
      mhFlow,
      edFlow,
      wlFlow,
      hairFlow,
      smokingFlow,
    });

    // Build the query parameters
    const queryParams = new URLSearchParams();

    // Add order_id if available
    if (order && order.id) {
      queryParams.append("order-id", order.id);
    }

    // Add standard parameters
    queryParams.append("stage", "consultation-after-checkout");
    queryParams.append("view", "consultation");

    // Add purchased_product parameter (use first product name from order if available)
    if (order && order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      const productName = firstItem.product?.name || firstItem.variant?.name || "";
      if (productName) {
        queryParams.append("purchased_product", productName);
      }
    }

    // Dynamically generate and add the seskey parameter
    const currentUserId = userId;
    const seskey = generateSeskey(currentUserId);
    queryParams.append("seskey", seskey);

    const finalUrl = `${basePath}?${queryParams.toString()}`;
    logger.log("[Debug] Final redirect URL:", finalUrl);
    return finalUrl;
  };

  // Start countdown after order loads and questionnaire check is complete
  useEffect(() => {
    logger.log("order", order);
    logger.log("shouldRedirect", shouldRedirect);
    logger.log("countdown", countdown);
    logger.log("isQuestionnaireCompleted", isQuestionnaireCompleted);
    logger.log("questionnaireCheckComplete", questionnaireCheckComplete);
    // Only start countdown if:
    // 1. Order has loaded successfully
    // 2. We have a flow parameter
    // 3. Countdown hasn't been initialized yet
    // 4. Questionnaire is not completed
    // 5. For ED/Hair flows: questionnaire check is complete
    // 6. For other flows: no questionnaire check needed
    const shouldStartCountdown =
      order &&
      shouldRedirect &&
      countdown === null &&
      !isQuestionnaireCompleted &&
      (edFlow === "1" || hairFlow === "1" ? questionnaireCheckComplete : true);

    if (shouldStartCountdown) {
      logger.log("Starting countdown for redirect to", getRedirectPath());
      setCountdown(10);
    }
  }, [
    order,
    shouldRedirect,
    countdown,
    isQuestionnaireCompleted,
    questionnaireCheckComplete,
    edFlow,
    hairFlow,
  ]);

  // Handle the countdown timer
  useEffect(() => {
    // Only run this effect if countdown has been initialized and is > 0
    if (countdown !== null && countdown > 0 && !isQuestionnaireCompleted) {
      logger.log(`Countdown: ${countdown} seconds remaining`);

      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
    // When countdown reaches 0, redirect
    else if (countdown === 0 && !isQuestionnaireCompleted) {
      logger.log("Countdown complete, redirecting now");

      const redirectPath = getRedirectPath();
      logger.log("[Debug] Final Redirect URL:", redirectPath);

      // Use Next.js router for internal navigation
      router.push(redirectPath);
    }
  }, [countdown, isQuestionnaireCompleted]);

  // Get order data and handle redirections
  useEffect(() => {
    const getOrderAndPrepareRedirect = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/order/?order_id=${orderId}&order_key=${key}`
        );
        const data = await res.json();
        setOrder(data);
        logger.log("Order loaded successfully");

        // Send GA4 event after successfully fetching the order
        if (data && data.id) {
          // Short delay to ensure GTM is ready
          setTimeout(() => {
            // Unified analytics purchase event (GA4 + Attentive hashes)
            analyticsService.trackPurchase(data);
            try {
              window._conv_q = window._conv_q || [];
              window._conv_q.push([
                "pushRevenue",
                `${parseFloat(data.total) || 0}`,
                `${data.line_items?.length || 0}`,
                "100430995",
              ]);
              window._conv_q.push([
                "pushRevenue",
                `${parseFloat(data.total) || 0}`,
                `${data.line_items?.length || 0}`,
                "100467959",
              ]);
              logger.log("[Convert] Revenue tracking pushed");
            } catch (err) {
              logger.error("[Convert] Error pushing revenue tracking:", err);
            }

            // Send AWIN tracking (await for parity values), then fire client pixel matching S2S
            (async () => {
              const s2s = await sendAwinTracking(data);
              fireAwinClientPixel(data, s2s);
            })();
          }, 1000);
        }

        // Check if we need to redirect to a questionnaire
        if (shouldRedirect) {
          // Only perform questionnaire completion check for ED and Hair flows
          if (edFlow === "1" || hairFlow === "1") {
            // Determine which questionnaire ID to check based on flow type
            let questionnaireId = null;
            if (edFlow === "1") questionnaireId = 2; // ED questionnaire
            if (hairFlow === "1") questionnaireId = 1; // Hair questionnaire

            if (questionnaireId) {
              // Check if questionnaire is already completed
              const isCompleted = await checkQuestionnaireCompletion(
                questionnaireId
              );

              if (isCompleted) {
                logger.log(
                  `Questionnaire ID ${questionnaireId} already completed, not redirecting`
                );
                setIsQuestionnaireCompleted(true); // Set the state to prevent redirect
                setQuestionnaireCheckComplete(true); // Mark check as complete
                return; // Add return statement to prevent further execution
              } else {
                logger.log(
                  `Questionnaire ID ${questionnaireId} not completed, will start redirect countdown`
                );
                setIsQuestionnaireCompleted(false); // Ensure state is false
                setQuestionnaireCheckComplete(true); // Mark check as complete
                // Countdown will start automatically via useEffect when questionnaireCheckComplete becomes true
              }
            }
          } else {
            // For other flows (mental health, weight loss), start redirect countdown without checking
            logger.log("Starting redirect countdown for non-ED/Hair flow");
            setIsQuestionnaireCompleted(false); // Ensure state is false
            // Don't set questionnaireCheckComplete to true here - let the useEffect handle the countdown
            // The countdown will start automatically via useEffect when all conditions are met
          }
        } else {
          // No redirect needed, mark check as complete
          setQuestionnaireCheckComplete(true);
        }
      } catch (error) {
        logger.error("Error fetching order:", error);
        // Mark questionnaire check as complete even on error to prevent infinite loading
        setQuestionnaireCheckComplete(true);
      } finally {
        setLoading(false);
      }
    };

    if (orderId && key) {
      getOrderAndPrepareRedirect();
    } else {
      logger.warn("Order ID or Key missing from URL params.");
      setLoading(false);
    }
  }, [orderId, key, shouldRedirect, mhFlow, edFlow, wlFlow, hairFlow]);

  if (loading) {
    return <Loader />;
  }

  if (!order) {
    return (
      <section className="px-5 sectionWidth:px-0 py-4 md:py-8 undefined">
        <div className="flex justify-center">
          <div className="border rounded-xl w-full max-w-[480px] p-6 text-center">
            <div className="flex justify-center">
              <CiCircleAlert size={60} color="red" className="mb-3" />
            </div>
            Sorry, couldn't get your order...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 sectionWidth:px-0 py-4 md:py-8 undefined">
      <div className="flex justify-center">
        <div className="border rounded-xl w-full max-w-[480px] p-6">
          <ThankYouMessage userEmail={order.user?.email || order.guestEmail || ""} />
          {countdown !== null && countdown > 0 && !isQuestionnaireCompleted && (
            <div className="mt-2 mb-2 py-4 px-6 bg-[#03A670] rounded-lg text-center rounded-lg">
              <p className="text-[16px] font-[600] text-white">
                You will be redirected to your consultation in {countdown}{" "}
                seconds....
              </p>
            </div>
          )}
          <BasicOrderInfo order={order} />
          <OrderItems order={order} />
          <Totals order={order} />
          {(!shouldRedirect ||
            (shouldRedirect && countdown <= 5 && !isQuestionnaireCompleted) ||
            (shouldRedirect && isQuestionnaireCompleted)) && (
            <Link
              href={
                shouldRedirect && !isQuestionnaireCompleted
                  ? getRedirectPath()
                  : "/"
              }
              className="mt-3 flex items-center justify-center gap-3 bg-black text-white px-5 py-3 rounded-[64px] hover:bg-gray-800 transition inline-block"
            >
              <span className="text-[14px] font-[500] text-[#FFFFFF] poppins-font">
                {shouldRedirect && !isQuestionnaireCompleted
                  ? "Continue to Consultation"
                  : "Continue to Home Page"}
              </span>
              <FaArrowRight color="white" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default function OrderReceivedPageContent({ userId }) {
  return (
    <div suppressHydrationWarning>
      <Suspense fallback={<Loader />}>
        <OrderReceivedContent userId={userId} />
      </Suspense>
    </div>
  );
}

const Totals = ({ order }) => {
  return (
    <ul>
      <li className="flex justify-between py-3 border-b">
        <span className="text-[#4E4E4E] text-[14px] font-[500] poppins-font">
          Subtotal:
        </span>
        <span className="text-[14px] font-[400] poppins-font">
          <span className="woocommerce-Price-amount amount">
            <bdi>
              <span className="woocommerce-Price-currencySymbol">$</span>
              {order.subtotal || 0}
            </bdi>
          </span>
        </span>
      </li>
      <li className="flex justify-between py-1.5">
        <span className="text-[#4E4E4E] text-[14px] font-[500] poppins-font">
          Applied Discount Code:
        </span>
        <span className="text-[14px] font-[400] poppins-font"></span>
      </li>
      <li className="flex justify-between py-1.5">
        <span className="text-[#4E4E4E] text-[14px] font-[500] poppins-font">
          Discount:
        </span>
        <span className="text-[14px] font-[400] poppins-font">
          -
          <span className="woocommerce-Price-amount amount">
            <bdi>
              <span className="woocommerce-Price-currencySymbol">$</span>
              {order.discountAmount || 0}
            </bdi>
          </span>
        </span>
      </li>
      <li className="flex justify-between pt-1.5 pb-3 border-b">
        <span className="text-[#4E4E4E] text-[14px] font-[500] poppins-font">
          Tax:
        </span>
        <span className="text-[14px] font-[400] poppins-font">
          <span className="woocommerce-Price-amount amount">
            <bdi>
              <span className="woocommerce-Price-currencySymbol">$</span>
              {order.taxAmount || 0}
            </bdi>
          </span>
        </span>
      </li>
      <li className="flex justify-between font-[600] text-black pt-5">
        <span className="text-[14px] poppins-font">Total:</span>
        <span className="text-[16px] poppins-font">
          <span className="woocommerce-Price-amount amount">
            <bdi>
              <span className="woocommerce-Price-currencySymbol">$</span>
              {order.totalAmount || order.subtotal || 0}
            </bdi>
          </span>
        </span>
      </li>
    </ul>
  );
};

const OrderItems = ({ order }) => {
  return (
    <>
      <h3 className="text-[14px] font-[500] pt-3">Your Order</h3>
      {order.items?.map((item) => {
        const productName = item.product?.name || item.variant?.name || "Product";
        const imageUrl = item.product?.primaryImage?.url || item.product?.images?.[0]?.url || item.variant?.imageUrl || "";
        return (
          <div key={item.id} className="flex items-start gap-3 py-3 border-b">
            <div className="min-w-[70px] w-[70px] min-h-[70px] h-[70px] rounded-[12px] overflow-hidden relative">
              {imageUrl ? (
                <CustomImage fill alt={productName} src={imageUrl} />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  No Image
                </div>
              )}
            </div>
            <div>
              <p className="text-[14px] font-[500]">{productName}</p>
              <p className="text-[12px] font-[500]">
                Quantity: {item.quantity}
              </p>
              <p className="text-[12px] font-[500]">
                Total:{" "}
                <span className="woocommerce-Price-amount amount">
                  <bdi>
                    <span className="woocommerce-Price-currencySymbol">$</span>
                    {item.totalPrice || 0}
                  </bdi>
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
};

const ThankYouMessage = ({ userEmail }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center">
      <CiCircleCheck size={60} color="#03A670" className="mb-3" />
      <h2 className="text-[20px] font-[500] text-[#251F20] mb-3">
        Thanks for your order!
      </h2>
      <p className="text-[14px] text-[#251F20] font-[400]">
        The order confirmation has been sent to
      </p>
      <p className="text-[14px] text-[#251F20] font-[400]">{userEmail}</p>
    </div>
  );
};

const BasicOrderInfo = ({ order }) => {
  return (
    <div className="border-y border-[#E2E2E1] mt-3">
      <div className="text-[#212121]">
        <div className="py-3 border-b border-[#E2E2E1]">
          <p className="text-[14px] font-[500] mb-3">Transaction Date</p>
          <p className="text-[12px] font-[400]">
            {formatDate(order.date_created)}
          </p>
        </div>
        <div className="py-3 border-b border-[#E2E2E1]">
          <p className="text-[14px] font-[500] mb-3">Payment Method</p>
          <p className="text-[12px] font-[400]">{order.payment?.method || "Credit Card"}</p>
        </div>
      </div>
    </div>
  );
};

const formatDate = (isoString) => {
  if (!isoString) return "Invalid Date";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    logger.error("Error formatting date:", error);
    return "Invalid Date";
  }
};
