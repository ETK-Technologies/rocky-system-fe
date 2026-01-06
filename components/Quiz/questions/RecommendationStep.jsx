"use client";
import React, { useEffect, useState, useRef } from "react";
import CustomImage from "@/components/utils/CustomImage";
import Loader from "@/components/Loader";
import Variations from "@/components/SkincareConsultation/components/Variations";
import Logo from "@/components/Navbar/Logo";
import { logger } from "@/utils/devLogger";
import { getComponent } from '@/components/Quiz/CustomComponents/registry';
 
const RecommendationStep = ({
  step,
  selectedProduct,
  setSelectedProduct,
  onContinue,
  ProductCard, // Product card component to use
  showAlternatives = true,
  variations = [],
  showIncluded = true,
  isLoading = false,
  flowType, // Flow type to pass to ProductCard
  
}) => {
  const { title, description, recommended, alternatives = [], hasComponent, componentPath, selectedComponentId } = step;
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const containerRef = useRef(null);
  const [hasSelectedAlternative, setHasSelectedAlternative] = useState(false);
  const [DynamicComponent, setDynamicComponent] = useState(null);
  const [componentLoading, setComponentLoading] = useState(false);
  const [componentError, setComponentError] = useState(null);

  logger.log("RecommendationStep Render:",
    step,
    selectedProduct,
  flowType);

  // Load custom component if present
  useEffect(() => {
    if (hasComponent && componentPath) {
      loadComponent(componentPath);
    }
  }, [hasComponent, componentPath]);

  const loadComponent = async (path) => {
    try {
      setComponentLoading(true);
      setComponentError(null);
      
      // Clean path and extract component name
      let cleanPath = path.startsWith('/') ? path.slice(1) : path;
      cleanPath = cleanPath.replace(/\.(jsx|js|tsx|ts)$/, '');
      const componentName = cleanPath.split('/').pop();
      
      logger.log("Loading recommendation component:", componentName, "from path:", cleanPath);
      
      // Look up component in registry
      const componentEntry = getComponent(componentName);
      
      if (!componentEntry) {
        throw new Error(
          `Unknown component: ${componentName}. Please add it to components/Quiz/CustomComponents/registry.js`
        );
      }
      
      const Component = componentEntry.component;
      
      if (!Component) {
        throw new Error(`Component not found: ${componentName}`);
      }
      
      setDynamicComponent(() => Component);
      setComponentLoading(false);
      logger.log("✅ Recommendation component loaded successfully:", componentName);
    } catch (err) {
      console.error("Failed to load recommendation component:", err);
      setComponentError(err.message);
      setComponentLoading(false);
    }
  };

  // Privacy text component
  const PrivacyText = () => (
    <p className="text-xs text-[#353535] my-1 md:my-4">
      We respect your privacy. All of your information is securely stored on our
      PIPEDA Compliant server.
    </p>
  );

  // Auto-select the recommended product
  useEffect(() => {
    if (recommended && !selectedProduct) {
      setSelectedProduct(recommended);
    }
  }, [recommended, selectedProduct, setSelectedProduct]);

  // Track when an alternative product is selected
  useEffect(() => {
    if (selectedProduct && alternatives) {
      const isAlternativeSelected = alternatives.some(
        (alt) => alt.id === selectedProduct.id
      );
      setHasSelectedAlternative(isAlternativeSelected);
    }
  }, [selectedProduct, alternatives]);

  const handleShowMoreOptions = () => {
    if (hasSelectedAlternative) {
      // If an alternative is selected, clicking should show all products
      setHasSelectedAlternative(false);
      setShowMoreOptions(true);
    } else {
      // Normal toggle behavior when no alternative is selected
      setShowMoreOptions(!showMoreOptions);
    }
  };

  // Mount-only: ensure page is at the top immediately when this step loads
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (e) {
      // ignore
    }
  }, []);

  // When this screen opens or recommended becomes available, smooth-scroll it into view
  useEffect(() => {
    if (typeof window === "undefined") return;
    const doScroll = () => {
      try {
        if (containerRef.current && containerRef.current.scrollIntoView) {
          containerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (e) {
        // ignore
      }
    };
    const t = setTimeout(doScroll, 50);
    return () => clearTimeout(t);
  }, [recommended]);

  // Show loader for 2 seconds on mount, then hide
  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Prevent body scrolling while the full-screen preloader is visible
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = document.body.style.overflow;
    if (showLoader) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [showLoader]);

  const isContinueEnabled = selectedProduct !== null;

  if (!recommended) {
    return (
      <div className="w-full md:w-[520px] mx-auto px-5 md:px-0 mt-6">
        <div className="text-center">
          Loading your personalized recommendations...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full md:w-[520px] mx-auto md:px-0 flex flex-col min-h-screen relative">
      {/* Full-screen loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-30">
          <Loader />
        </div>
      )}

      {showLoader && (
        <div className="fixed inset-0 z-[20000] bg-white flex justify-center items-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Rotating dotted ring */}
            <svg
              className="absolute w-24 h-24 animate-[spin_5.5s_linear_infinite]"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#000"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="2 10"
                opacity="0.85"
              />
            </svg>

            {/* Center letter - stays still while ring spins */}
            <div className="relative text-2xl font-bold text-black">
              <CustomImage
                src="https://myrocky.b-cdn.net/WP%20Images/convert_test/reloader.png"
                width="30"
                height="30"
                alt="Loading"
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div>
        <div className="w-full md:w-[520px] mx-auto">
          <Logo />
          <div className="progress-indicator mb-2 text-[#A7885A] font-medium">
            <span className="text-sm">Here's what we recommended</span>
          </div>
          <div className="progress-bar-wrapper w-full block h-[8px] my-1 rounded-[10px] bg-gray-200">
            <div
              style={{ width: "100%" }}
              className="progress-bar bg-[#A7885A] rounded-[10px] block float-left h-[8px]"
            ></div>
          </div>
        </div>
      </div>

      <div className="flex-grow">
        {/* Title */}
        <h2 className="text-[26px] md:text-[32px] my-4 text-center font-medium">
          {title || "Your treatment plan"}
        </h2>

        {/* Recommended Product */}
        <div className="mb-6">
          <ProductCard
            product={recommended}
            variations={variations}
            onSelect={(product) => setSelectedProduct(product)}
            isSelected={selectedProduct?.id === recommended?.id}
            flowType={flowType}
            onContinue={onContinue}
            isRecommended={true}
          />
        </div>

      

        {/* Alternative Products */}
        {showAlternatives &&
          showMoreOptions &&
          alternatives &&
          alternatives.length > 0 && (
            <div className="space-y-4 mb-6">
              {alternatives.map((product) => (
                <ProductCard
                  key={product.id ?? product.name}
                  product={product}
                  onSelect={(product) => setSelectedProduct(product)}
                  isSelected={selectedProduct?.id === product.id}
                  flowType={flowType}
                />
              ))}
            </div>
          )}


            {/* Custom Component (if present) */}
        {hasComponent && DynamicComponent && (
          <div className="mb-6">
            <DynamicComponent />
          </div>
        )}
        
        {componentLoading && (
          <div className="mb-6 text-center text-gray-500">
            Loading component...
          </div>
        )}
        
        {componentError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">Failed to load component: {componentError}</p>
          </div>
        )}





        {/* Privacy text */}
        <PrivacyText />
      </div>

      {/* Continue Button - Hidden for ED flow since EDProductCard has its own button */}
      {flowType !== "ed" && (
        <div className="fixed bottom-0 left-0 right-0 py-4 z-30 bg-white px-5 md:px-0">
          <div className="w-full md:w-[520px] mx-auto">
            {/* Show more/less options button */}
            {showAlternatives && alternatives && alternatives.length > 0 && (
              <button
                onClick={handleShowMoreOptions}
                className="w-full py-3 px-8 rounded-full border border-gray-300 text-black font-medium bg-transparent mb-4"
              >
                {showMoreOptions ? "Show less options" : "Show more options"}
              </button>
            )}
            <button
              className={`w-full py-3 rounded-full font-medium flex items-center justify-center gap-2 ${
                isContinueEnabled
                  ? "bg-black text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick={isContinueEnabled ? onContinue : null}
              disabled={!isContinueEnabled || isLoading}
            >
              {isLoading && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              {isLoading
                ? "Adding to cart..."
                : `Proceed -  ${ `$` + (selectedProduct?.price || "")} →`}
            </button>
          </div>
        </div>
      )}
      
      {/* For ED flow, show more options button and loading state */}
      {flowType === "ed" && (
        <div className="fixed bottom-0 left-0 right-0 py-4 z-30 bg-white px-5 md:px-0">
          <div className="w-full md:w-[520px] mx-auto">
            {/* Show more/less options button for ED */}
            {showAlternatives && alternatives && alternatives.length > 0 && (
              <button
                onClick={handleShowMoreOptions}
                className="w-full py-3 px-8 rounded-full border border-gray-300 text-black font-medium bg-transparent"
              >
                {showMoreOptions ? "Show less options" : "Show more options"}
              </button>
            )}
            
            {/* Show loading overlay when adding to cart */}
            {isLoading && (
              <div className="w-full py-3 rounded-full bg-black text-white font-medium flex items-center justify-center gap-2 mt-4">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Adding to cart...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationStep;
