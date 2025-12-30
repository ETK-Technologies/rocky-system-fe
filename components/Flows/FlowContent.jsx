"use client";

import { useSearchParams } from "next/navigation";
import EdProducts from "../EDPlans/EdProducts";
import EdFaqs from "./EdFaqs";
import HairProducts from "../Hair/HairProducts";
import HairFaqs from "./HairFaqs";

const FlowContent = ({ flowType = "ED", pageType = null, initialProducts = null }) => {
  switch (flowType) {
    case "ED":
      // Get the query parameters from the URL
      const searchParams = useSearchParams();
      const showonly = searchParams.get("showonly");
      return (
        <>
          <div className="ed-flow flex flex-col min-h-screen">
            {/* Main Content */}
            <main className="flex-grow bg-white">
              <div className="max-w-[1184px] mx-auto px-5 py-10">
                {/* ED Products Section - Pass the filter parameter and initial products */}
                <EdProducts showonly={showonly} initialProducts={initialProducts} />

                {/* FAQs Section */}
                <EdFaqs></EdFaqs>
              </div>
            </main>

            {/* No footer as requested */}
          </div>
        </>
      );
    case "Hair":
      return (
        <>
          <div className="hair-flow flex flex-col min-h-screen">
            {/* Main Content */}
            <main className="flex-grow bg-white">
              <div className="max-w-[1184px] mx-auto px-5 py-10">
                {/* Hair Products Section */}
                <HairProducts pageType={pageType} />

                {/* FAQs Section */}
                <HairFaqs />
              </div>
            </main>

            {/* No footer as requested */}
          </div>
        </>
      );
  }
};

export default FlowContent;
