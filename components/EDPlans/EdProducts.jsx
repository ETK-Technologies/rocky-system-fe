"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import ScrollArrows from "../ScrollArrows";
import EdProductCard from "./EdProductCard";
import CustomImage from "../utils/CustomImage";
// import HighesttRate from "../convert_test/Flows/HighestRate"; // Removed - convert_test directory deleted
import EdComparisonTable from "../Sex/EdComparisonTable";
import { transformEdFlowProducts, filterEdFlowProducts } from "@/utils/transformEdFlowProducts";
import { logger } from "@/utils/devLogger";

const EdProducts = ({ showonly, initialProducts = null }) => {
  const scrollContainerRef = useRef(null);
  const [products, setProducts] = useState(() => {
    // If initial products are provided (from server), use them immediately
    if (initialProducts) {
      const transformed = transformEdFlowProducts(initialProducts);
      logger.log(`[ED Products] Using ${transformed.length} product(s) from server`);
      return transformed;
    }
    return [];
  });
  const [loading, setLoading] = useState(!initialProducts); // Only loading if no initial products
  const [error, setError] = useState(null);

  // Fetch products from API on mount only if not provided initially
  useEffect(() => {
    // Skip fetching if we already have initial products from server
    if (initialProducts) {
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        logger.log("[ED Products] Fetching products from API (client-side)");

        const response = await fetch("/api/products/ed-flow");

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.products || data.products.length === 0) {
          throw new Error("No products returned from API");
        }

        logger.log(`[ED Products] Received ${data.products.length} product(s) from API`);

        // Transform products to EdProductCard format
        const transformed = transformEdFlowProducts(data.products);

        if (!transformed || transformed.length === 0) {
          throw new Error("Failed to transform products");
        }

        logger.log(`[ED Products] Transformed ${transformed.length} product(s)`);

        setProducts(transformed);
      } catch (err) {
        logger.error("[ED Products] Error fetching products:", err);
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [initialProducts]);

  // Filter products based on the showonly parameter
  const getFilteredProducts = () => {
    if (loading || error) {
      return [];
    }

    return filterEdFlowProducts(products, showonly);
  };

  const filteredProducts = getFilteredProducts();

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading products: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show empty state
  if (!filteredProducts || filteredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No products available at this time.</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-start mb-[23px] md:mb-[31px]">
        <h2 className="text-[32px] md:text-[48px] leading-[36.8px] md:leading-[53.52px] font-[550] tracking-[-0.01em] md:tracking-[-0.02em] headers-font mb-23 md:mb-[16px]">
          Choose Your Plan
        </h2>
        <p className="text-[18px] md:text-[20px] leading-[25.2px] md:leading-[30px] font-[400] ">
          Pause or cancel at any time
        </p>
      </div>
      <div className="overflow-x-auto !no-scrollbar relative">
        <div className="mx-auto">
          <div className="relative">
            {/* Only show scroll arrows when there's more than one product */}
            {filteredProducts.length > 1 && (
              <ScrollArrows scrollContainerRef={scrollContainerRef} />
            )}

            <div
              ref={scrollContainerRef}
              className={`flex gap-2 md:gap-4 items-start ${
                filteredProducts.length > 1
                  ? "overflow-x-auto snap-x snap-mandatory no-scrollbar"
                  : "justify-center"
              }`}
            >
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id || product.slug || index}
                  className={`${
                    filteredProducts.length === 1
                      ? "w-full max-w-[450px]"
                      : "flex-shrink-0"
                  }`}
                >
                  <EdProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ED Treatment Comparison Table */}
      {/* <div className="mt-12 mb-12">
        <EdComparisonTable leftAlign={true} />
      </div> */}

      {/* Find What's Best for Me Button */}
      <div className="flex justify-center mt-8 mb-8">
        <Link
          href="/ed-pre-consultation-quiz/"
          className="bg-white border-2 border-black text-black px-8 py-3 rounded-full flex items-center justify-center space-x-3 hover:bg-gray-50 transition font-medium"
        >
          <span>Find What's Best For Me</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* <div className="md:flex justify-center items-center mt-[50px] mb-[65px] hidden">
        <CustomImage
          src="/OCP-IMGS.webp"
          className="w-auto"
          width="344"
          height="100"
        />
      </div> */}
      {/* <div className="md:mt-0 mt-[33px]">
        <HighesttRate blockMode={true} />
      </div> */}

      <div className="md:hidden justify-center items-center flex mt-[32px]">
        <CustomImage
          src="/OCP-IMGS.webp"
          className="w-auto"
          width="344"
          height="100"
        />
      </div>
    </>
  );
};

export default EdProducts;
