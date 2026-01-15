import OrderReceivedPageContent from "@/components/OrderReceived/OrderReceivedPageContent";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getUserIdFromCookies } from "@/services/userDataService";

const OrderReceivedPage = async ({ params }) => {
  const cookieStore = await cookies();
  const userId = getUserIdFromCookies(cookieStore)?.value;
  const { id } = await params;
  const orderId = id || "";

  return (
    <Suspense fallback={<></>}>
      <OrderReceivedPageContent userId={userId} />
      {/* AWIN noscript fallback: use order_id when available so server computes values */}
      <noscript>
        <img
          src={`/api/awin/track-order?order_id=${orderId}`}
          width="1"
          height="1"
          style={{ display: "none" }}
          alt=""
        />
      </noscript>
    </Suspense>
  );
};

export default OrderReceivedPage;
