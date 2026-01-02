"use client";

import { useState, useEffect } from "react";
import { logger } from "@/utils/devLogger";
import React from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "../EdQuestionnaire/ProgressBar";
import { QuestionLayout } from "../EdQuestionnaire/QuestionLayout";
import { QuestionOption } from "../EdQuestionnaire/QuestionOption";
import QuestionnaireNavbar from "../EdQuestionnaire/QuestionnaireNavbar";
import QuestionOne from "./QuestionOne";
import EdProductCards from "./EdProductCards";
import { FAQItem } from "./FAQItem";
import EdDosageSelection from "./EdDosageSelectionModal";
import CrossSellModal from "../EDPlans/CrossSellModal";
import {
  handleEdProductCheckout,
  buildEdCheckoutUrl,
} from "@/utils/edCartHandler";
import { addToCartEarly, finalizeFlowCheckout } from "@/utils/flowCartHandler";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import FaqsSection from "../FaqsSection";
import { transformEdFlowProducts } from "@/utils/transformEdFlowProducts";

const EDPreConsultationQuiz = () => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [recommendedProduct, setRecommendedProduct] = useState(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductOptions, setSelectedProductOptions] = useState(null);
  const [showDosagePopup, setShowDosagePopup] = useState(false);
  const [selectedDose, setSelectedDose] = useState(null);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [isBackNavigation, setIsBackNavigation] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [initialCartData, setInitialCartData] = useState(null);
  
  // Products fetched from API
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  const maxPage = 6;
  const progress = Math.max(10, Math.ceil((currentPage / maxPage) * 100));

  const toggleMoreOptions = () => {
    setShowMoreOptions(!showMoreOptions);
  };

  // Fetch products from API on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        setProductsError(null);

        logger.log("[ED PreConsultation] Fetching products from API");

        const response = await fetch("/api/products/ed-flow");

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.products || data.products.length === 0) {
          throw new Error("No products returned from API");
        }

        logger.log(`[ED PreConsultation] Received ${data.products.length} product(s) from API`);

        // Transform products to expected format
        const transformed = transformEdFlowProducts(data.products);

        if (!transformed || transformed.length === 0) {
          throw new Error("Failed to transform products");
        }

        logger.log(`[ED PreConsultation] Transformed ${transformed.length} product(s)`);

        setProducts(transformed);
      } catch (err) {
        logger.error("[ED PreConsultation] Error fetching products:", err);
        setProductsError(err.message || "Failed to load products");
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Helper to get products by name
  const getProductByName = (name) => {
    return products.find(
      (p) => 
        p.name === name || 
        p.name.toLowerCase() === name.toLowerCase() ||
        (name === "Cialis + Viagra" && (p.isPack || p.slug === "variety-pack"))
    );
  };

  // Get individual products
  const cialisProduct = getProductByName("Cialis");
  const viagraProduct = getProductByName("Viagra");
  const varietyPackProduct = getProductByName("Cialis + Viagra") || products.find(p => p.isPack || p.slug === "variety-pack");

  useEffect(() => {
    if (showDosagePopup) {
      // Disable background scroll
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scroll
      document.body.style.overflow = "auto";
    }

    // Very important: Clean up when component unmounts
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showDosagePopup]);

  const handleProductSelect = (product, options) => {
    setSelectedProduct(product);
    setSelectedProductOptions(options);

    // Set default dose if not already set
    if (!selectedDose) {
      const defaultDose =
        product.name === "Cialis"
          ? "10mg"
          : product.name === "Viagra"
          ? "50mg"
          : product.name === "Cialis + Viagra"
          ? "10/50mg"
          : null;
      setSelectedDose(defaultDose);
      setShowDosagePopup(true);
      // logger.log("selectd dose", selectedDose);
    }
  };

  const handleDoseSelect = (dose) => {
    setSelectedDose(dose);
    setSelectedProduct((prev) => ({
      ...prev,
      selectedDose: dose,
    }));
  };

  const handleCheckout = async () => {
    try {
      logger.log(
        "🎯 ED PreConsultation - Proceeding to checkout (cart already populated)"
      );

      // Start loading state
      setIsCheckoutLoading(true);

      // Product and any addons are already in cart
      // Just generate checkout URL and redirect
      const checkoutUrl = finalizeFlowCheckout("ed", true);

      logger.log("Redirecting to:", checkoutUrl);

      // Close modal and navigate on success
      setShowCrossSellModal(false);
      setIsCheckoutLoading(false);
      window.location.href = checkoutUrl;
    } catch (error) {
      logger.error("Error during ED PreConsultation checkout:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsCheckoutLoading(false);
    }
  };

  const handleOptionChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });

    if (currentPage < maxPage) {
      if (questionId === 2) {
        if (value === "4 or more times a week") {
          setTimeout(() => {
            setCurrentPage(3);
          }, 300);
        } else {
          setTimeout(() => {
            setCurrentPage(4);
          }, 300);
        }
      } else if (questionId === 3 && answers[2] === "4 or more times a week") {
        setTimeout(() => {
          setCurrentPage(5);
        }, 300);
      } else {
        setTimeout(() => {
          setCurrentPage(currentPage + 1);
        }, 300);
      }
    }
  };

  const handleBackClick = () => {
    if (currentPage > 1) {
      setIsBackNavigation(true);
      if (
        currentPage === 4 &&
        answers[2] &&
        answers[2] !== "4 or more times a week"
      ) {
        setCurrentPage(2);
      } else if (currentPage === 5 && answers[2] === "4 or more times a week") {
        setCurrentPage(3);
      } else {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleContinueClick = () => {
    if (currentPage < maxPage) {
      if (currentPage === 2) {
        if (answers[2] === "4 or more times a week") {
          setCurrentPage(3);
        } else {
          setCurrentPage(4);
        }
      } else if (currentPage === 3 && answers[2] === "4 or more times a week") {
        setCurrentPage(5);
      } else {
        setCurrentPage(currentPage + 1);
      }
    }
    setIsBackNavigation(false);
  };

  useEffect(() => {
    if (currentPage === 6) {
      // Wait for products to load before showing recommendations
      if (productsLoading || products.length === 0) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        const product = getRecommendedProduct();
        
        if (!product) {
          logger.error("[ED PreConsultation] Failed to get recommended product");
          setError("Failed to load product recommendations. Please try again.");
          setIsLoading(false);
          return;
        }

        setRecommendedProduct(product);

        // Instead of just setting selectedProduct, we need to properly select it
        // by calling handleProductSelect with the default options
        const defaultPreference = product.selectedPreference || "generic";
        const defaultFrequency = "monthly-supply";
        const defaultPills = product.pillOptions[defaultFrequency][0];

        // Calculate price and variationId based on preference
        const price =
          defaultPreference === "generic"
            ? defaultPills.genericPrice
            : defaultPills.brandPrice;

        const variationId =
          defaultPreference === "generic"
            ? defaultPills.genericVariationId
            : defaultPills.brandVariationId;

        // Set the product with proper options
        setSelectedProduct(product);
        setSelectedProductOptions({
          preference: defaultPreference,
          frequency: defaultFrequency,
          pills: defaultPills,
          pillCount: defaultPills.count,
          price: price,
          variationId: variationId,
        });

        setShowProducts(true);
        setIsLoading(false);
      }, 2000);
    }
  }, [currentPage, products, productsLoading]);

  // Function to check if Continue button should be enabled
  const isContinueEnabled = selectedProduct !== null;

  const getRecommendedProduct = () => {
    const takenBefore = answers[1];
    const frequency = answers[2];
    const preference = answers[3];
    const duration = answers[4];
    const brandType = answers[5];

    let product = null;

    // Make sure products are loaded
    if (!cialisProduct || !viagraProduct || !varietyPackProduct) {
      return null;
    }

    if (takenBefore === "No") {
      product = { ...varietyPackProduct };
    } else {
      if (frequency === "4 or more times a week" && preference === "Daily") {
        product = { ...cialisProduct };
        product.selectedPreference = "generic";
      } else {
        if (duration === "Long-lasting") {
          product = { ...cialisProduct };
          product.selectedPreference = brandType?.toLowerCase() || "generic";
        } else if (duration === "Short-lasting") {
          product = { ...viagraProduct };
          product.selectedPreference = brandType?.toLowerCase() || "generic";
        }
      }
    }

    return product;
  };

  // Show loading state while fetching products
  if (productsLoading && currentPage === 6) {
    return (
      <div className="flex flex-col min-h-screen bg-white subheaders-font font-medium">
        <QuestionnaireNavbar
          onBackClick={handleBackClick}
          currentPage={currentPage}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if products failed to load
  if (productsError && currentPage === 6) {
    return (
      <div className="flex flex-col min-h-screen bg-white subheaders-font font-medium">
        <QuestionnaireNavbar
          onBackClick={handleBackClick}
          currentPage={currentPage}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading products: {productsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showProducts && recommendedProduct && cialisProduct && viagraProduct && varietyPackProduct) {
    return (
      <div className="flex flex-col min-h-screen bg-white subheaders-font font-medium">
        <ToastContainer
          position="top-center"
          pauseOnHover={true}
          style={{ zIndex: 9999 }}
        />
        <QuestionnaireNavbar
          onBackClick={handleBackClick}
          currentPage={currentPage}
        />
        <div className="w-full md:w-[520px] px-5 md:px-0 mx-auto">
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
        <div className="quiz-page-wrapper text-center relative w-full md:w-[520px] px-5 md:px-0 mx-auto bg-[#FFFFFF] subheaders-font">
          <h2 className="text-[26px] md:text-[32px] my-4">
            Your treatment plan
          </h2>

          <div className="flex flex-col items-center">
            <div className="w-full md:w-[380px] relative ">
              <div className="bg-[#AE7E56] absolute top-0 right-0 left-0 h-10 md:py-1 text-white  rounded-t-xl text-center z-0">
                <span className="-translate-y-1 inline-block text-[12px] leading-[140%]">
                  Recommended
                </span>
              </div>
              <div className="w-full md:w-[380px] mt-[20px] rounded-lg relative z-10 ">
                <EdProductCards
                  product={recommendedProduct}
                  isRecommended={true}
                  onSelect={handleProductSelect}
                  isSelected={selectedProduct?.name === recommendedProduct.name}
                />
              </div>
            </div>

            {showMoreOptions && cialisProduct && viagraProduct && varietyPackProduct && (
              <div className="flex flex-col gap-4 my-6 w-[380px]">
                {recommendedProduct.name !== "Cialis" && cialisProduct && (
                  <EdProductCards
                    product={cialisProduct}
                    onSelect={handleProductSelect}
                    isSelected={selectedProduct?.name === cialisProduct.name}
                  />
                )}
                {recommendedProduct.name !== "Viagra" && viagraProduct && (
                  <EdProductCards
                    product={viagraProduct}
                    onSelect={handleProductSelect}
                    isSelected={selectedProduct?.name === viagraProduct.name}
                  />
                )}
                {recommendedProduct.name !== "Cialis + Viagra" && recommendedProduct.name !== "Variety Pack" && varietyPackProduct && (
                  <EdProductCards
                    product={varietyPackProduct}
                    onSelect={handleProductSelect}
                    isSelected={
                      selectedProduct?.name === varietyPackProduct.name
                    }
                  />
                )}
              </div>
            )}

            <div className="w-full mt-4 flex justify-center">
              <button
                onClick={toggleMoreOptions}
                className="py-3 px-8 w-[380px] rounded-full border border-gray-300 text-black font-medium bg-transparent"
              >
                {showMoreOptions ? "Show less options" : "Show more options"}
              </button>
            </div>

            {showDosagePopup && (
              <EdDosageSelection
                isOpen={showDosagePopup}
                onClose={() => setShowDosagePopup(false)}
                product={selectedProduct}
                selectedDose={selectedDose}
                setSelectedDose={handleDoseSelect}
                handleBackClick={handleBackClick}
                isLoading={isCheckoutLoading}
                onContinue={async () => {
                  if (selectedDose) {
                    // Set loading state to show spinner in button
                    setIsCheckoutLoading(true);

                    // Small delay to ensure UI updates
                    await new Promise((resolve) => setTimeout(resolve, 150));

                    try {
                      // Validate product options
                      if (
                        !selectedProductOptions ||
                        !selectedProductOptions.variationId
                      ) {
                        logger.error(
                          "Cannot proceed: Missing variation ID",
                          selectedProductOptions
                        );
                        setError("Product selection error. Please try again.");
                        setIsCheckoutLoading(false);
                        return;
                      }

                      const productId = selectedProductOptions.variationId;

                      // Check if this is a variety pack product
                      const isVarietyPack = productId.includes(",");
                      let varietyPackId = null;

                      if (isVarietyPack) {
                        varietyPackId = `variety_pack_${Date.now()}_${Math.random()
                          .toString(36)
                          .substr(2, 9)}`;
                        logger.log(
                          `Detected variety pack product with ID: ${varietyPackId}`
                        );
                      }

                      // Create main product data
                      const mainProduct = {
                        id: productId,
                        name: selectedProduct?.name,
                        price: selectedProductOptions?.price || 0,
                        image: selectedProduct?.image,
                        isSubscription:
                          selectedProductOptions?.frequency ===
                          "monthly-supply",
                        variationId: productId,
                        isVarietyPack: isVarietyPack,
                        varietyPackId: varietyPackId,
                        // Add variation data for display
                        variation: [
                          {
                            attribute: "Subscription Type",
                            value:
                              selectedProductOptions?.frequency ===
                              "monthly-supply"
                                ? "Monthly Supply"
                                : "Quarterly Supply",
                          },
                          {
                            attribute: "Tabs frequency",
                            value: `${selectedProductOptions?.pillCount || 8} ${
                              selectedProduct?.selectedPreference === "brand"
                                ? "(Brand)"
                                : "(Generic)"
                            }`,
                          },
                        ],
                      };

                      logger.log(
                        "🛒 ED PreConsultation - Adding product to cart early:",
                        mainProduct
                      );

                      // Add product to cart early (before cross-sell popup)
                      const result = await addToCartEarly(mainProduct, "ed", {
                        requireConsultation: true,
                        varietyPackId: varietyPackId,
                      });

                      if (result.success) {
                        logger.log(
                          "✅ Product added to cart, opening cross-sell popup"
                        );
                        // Store the cart data to pass to the modal
                        if (result.cartData) {
                          setInitialCartData(result.cartData);
                        }

                        // Close dosage popup
                        setShowDosagePopup(false);

                        // Small delay before opening cross-sell modal
                        await new Promise((resolve) =>
                          setTimeout(resolve, 300)
                        );

                        setShowCrossSellModal(true);
                      } else {
                        logger.error(
                          "❌ Failed to add product to cart:",
                          result.error
                        );
                        setError(
                          result.error ||
                            "Failed to add product to cart. Please try again."
                        );
                      }
                    } catch (error) {
                      logger.error("Error adding product to cart:", error);
                      setError(
                        "There was an issue adding the product to cart. Please try again."
                      );
                    } finally {
                      setIsCheckoutLoading(false);
                    }
                  }
                }}
              />
            )}

            {showCrossSellModal && (
              <CrossSellModal
                isOpen={showCrossSellModal}
                onClose={() => setShowCrossSellModal(false)}
                selectedProduct={{
                  name: selectedProduct?.name,
                  activeIngredient:
                    selectedProduct?.name === "Cialis"
                      ? "Tadalafil"
                      : selectedProduct?.name === "Viagra"
                      ? "Sildenafil"
                      : "Tadalafil & Sildenafil",
                  preference: selectedProduct?.selectedPreference || "generic",
                  frequency:
                    selectedProductOptions?.frequency || "monthly-supply",
                  pills: selectedProductOptions?.pillCount || 8,
                  price: selectedProductOptions?.price || 0,
                  image:
                    selectedProduct?.image ||
                    (selectedProduct?.name === "Cialis"
                      ? "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/chewalis-ed.webp"
                      : selectedProduct?.name === "Viagra"
                      ? "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/webp-images/viagra-ed.webp"
                      : "https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/webp-images/variety-pack-ed.webp"),
                  dosage: selectedDose,
                  productIds: selectedProductOptions?.variationId || "",
                }}
                onCheckout={handleCheckout}
                isLoading={isCheckoutLoading}
                initialCartData={initialCartData}
              />
            )}

            <div className="w-full md:w-[688px] mt-14 md:mt-16 mb-14 md:mb-10">
              <div className="mx-auto">
                <FaqsSection faqs={faqs} title="FAQs" />
              </div>
            </div>
          </div>

          <div
            className="fixed bottom-0 w-full p-4 bg-white border-t  flex items-center justify-center"
            style={{
              visibility: isContinueEnabled ? "visible" : "hidden",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (selectedProduct) {
                  setShowDosagePopup(true);
                }
              }}
              className="w-[335px] md:w-[520px] mx-auto bg-black text-white py-3 px-6 rounded-full font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-white subheaders-font font-medium"
      suppressHydrationWarning={true}
    >
      <ToastContainer
        position="top-center"
        pauseOnHover={true}
        style={{ zIndex: 9999 }}
      />

      {/* Loading overlay during transition between dosage popup and cross-sell */}
      {isCheckoutLoading && !showDosagePopup && !showCrossSellModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4 max-w-sm mx-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#704e37] rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Preparing your order...
              </h3>
              <p className="text-sm text-gray-600">Just a moment</p>
            </div>
          </div>
        </div>
      )}

      <QuestionnaireNavbar
        onBackClick={handleBackClick}
        currentPage={currentPage}
      />
      <ProgressBar progress={progress} />

      <div className="quiz-page-wrapper relative w-full md:w-[520px] px-5 md:px-0 mx-auto bg-[#FFFFFF]">
        <QuestionOne
          currentPage={currentPage}
          answer={answers[1]}
          onAnswerChange={handleOptionChange}
        />

        <QuestionLayout
          title="How often do you have sex?"
          currentPage={currentPage}
          pageNo={2}
          questionId={2}
          inputType="radio"
        >
          <QuestionOption
            id="2_1"
            name="2"
            value="Once a week or less"
            checked={answers[2] === "Once a week or less"}
            onChange={() => handleOptionChange(2, "Once a week or less")}
            type="radio"
            label="Once a week or less"
            className="mb-4"
          />
          <QuestionOption
            id="2_2"
            name="2"
            value="2-3 times a week"
            checked={answers[2] === "2-3 times a week"}
            onChange={() => handleOptionChange(2, "2-3 times a week")}
            type="radio"
            label="2-3 times a week"
            className="mb-4"
          />
          <QuestionOption
            id="2_3"
            name="2"
            value="4 or more times a week"
            checked={answers[2] === "4 or more times a week"}
            onChange={() => handleOptionChange(2, "4 or more times a week")}
            type="radio"
            label="4 or more times a week"
          />
        </QuestionLayout>

        <QuestionLayout
          title="Which option do you prefer?"
          currentPage={currentPage}
          pageNo={3}
          questionId={3}
          inputType="radio"
        >
          <QuestionOption
            id="3_1"
            name="3"
            value="Daily"
            checked={answers[3] === "Daily"}
            onChange={() => handleOptionChange(3, "Daily")}
            type="radio"
            label="Take a daily tablet so I am always ready"
            className="mb-4"
          />
          <QuestionOption
            id="3_2"
            name="3"
            value="When-needed"
            checked={answers[3] === "When-needed"}
            onChange={() => handleOptionChange(3, "When-needed")}
            type="radio"
            label="Take a tablet when needed before sex"
          />
        </QuestionLayout>

        <QuestionLayout
          title="Are you looking for a medication that is long-lasting (up to 36hrs) or short lasting (up to 8hrs)?"
          currentPage={currentPage}
          pageNo={4}
          questionId={4}
          inputType="radio"
        >
          <QuestionOption
            id="4_1"
            name="4"
            value="Long-lasting"
            checked={answers[4] === "Long-lasting"}
            onChange={() => handleOptionChange(4, "Long-lasting")}
            type="radio"
            label="Long-lasting"
            className="mb-4"
          />
          <QuestionOption
            id="4_2"
            name="4"
            value="Short-lasting"
            checked={answers[4] === "Short-lasting"}
            onChange={() => handleOptionChange(4, "Short-lasting")}
            type="radio"
            label="Short-lasting"
          />
        </QuestionLayout>

        <QuestionLayout
          title="Do you prefer a brand name or generic?"
          subtitle="Generic is up to 68% cheaper, no difference in performance."
          currentPage={currentPage}
          pageNo={5}
          questionId={5}
          inputType="radio"
        >
          <QuestionOption
            id="5_1"
            name="5"
            value="Generic"
            checked={answers[5] === "Generic"}
            onChange={() => handleOptionChange(5, "Generic")}
            type="radio"
            label="Generic works for me (more bang for your buck)"
            className="mb-4"
          />
          <QuestionOption
            id="5_2"
            name="5"
            value="Brand"
            checked={answers[5] === "Brand"}
            onChange={() => handleOptionChange(5, "Brand")}
            type="radio"
            label="I prefer the brand name"
          />
        </QuestionLayout>

        {currentPage === 6 && (
          <div className="quiz-page recommendation-preloader" data-pageno="6">
            <div className="quiz-heading-wrapper px-3 mx-auto pt-10 pb-0">
              <h2 className="quiz-heading text-lg text-center font-medium">
                Please wait while we are loading the recommended ED product...
              </h2>
            </div>
            <p className="text-center p-5 pb-[150px]">
              <img
                src="https://myrocky.com/wp-content/themes/salient-child/img/preloader-wheel.svg"
                className="block w-[100px] h-auto m-auto"
                alt="Preloader Wheel"
              />
            </p>
          </div>
        )}
        {error && (
          <p className="error-box text-red-500 m-2 text-center text-sm">
            {error}
          </p>
        )}
        {currentPage < 6 && (
          <div
            className="fixed bottom-0 w-full p-4 bg-white border-t flex items-start justify-center"
            style={{
              visibility:
                isBackNavigation && answers[currentPage] ? "visible" : "hidden",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={handleContinueClick}
              className=" w-[335px] md:w-[520px] mx-auto bg-black text-white py-3 px-6 rounded-full font-medium"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EDPreConsultationQuiz;

const faqs = [
  {
    question: "What is the cause of ED?",
    answer:
      "Erectile dysfunction can be caused by a variety of issues such as psychological distress, medical conditions or medications. Situational anxiety and stress tend to be the leading causes in younger men and may restrict blood flow to the penis at the wrong moment. As you age, ED may become persistent due to underlying problems with nerves, blood vessels or hormone production. Our online medical assessment can help establish the cause and treat your ED.",
  },
  {
    question: "How do ED pills work?",
    answer:
      "Get the party started and the pills will do the rest. When sexually aroused, the body releases a substance called nitric oxide which works to relax the blood vessels in penis. This results in a blood rush to the penis, leaving it hard for penetration. When sex is over, an enzyme shuts this process off. ED pills work by blocking this enzyme (PDE5), making it easier to get your erection going longer and stronger.",
  },
  {
    question: "What is the safest drug for ED?",
    answer:
      "All medications go through extensive clinical trials and quality checks before getting approved by Health Canada. The safety and effectiveness for ED medications is well established, making it an excellent treatment for most men. Our online questionnaire will take into account your personal medical history and determine if these pills are right for you!",
  },
  {
    question: "What is the most effective pill for ED?",
    answer:
      "While both Sildenafil and Tadalafil are equally effective, there are a few differences. Viagra takes anywhere between 30-60 mins to work after ingestion but sometimes can be delayed up to 2 hours and its effects lasts on average 4 hours. Cialis on the other hand , some may act faster, last longer or work regardless of when you had your last meal. With enough information, Rocky can help you find an ED medication and dosage that is right for you. You may connect with providers and receive ongoing care through our platform.",
  },
  {
    question: "What are the side effects of ED medications?",
    answer:
      "In general, ED treatment is well tolerated. However if side effects occur, they are usually mild and temporary. This includes headaches, flushed skin, runny nose and upset stomach. ED medications can very rarely cause serious side effects such as priapism (a prolonged erection lasting hours after stimulation has ended) which can result in permanent damage to your penis if not treated immediately. Other rare events include sudden loss of vision or loss of hearing.",
  },
  {
    question: "Which ED drug is the best?",
    answer:
      "There is no particular medication that is superior to the other, they are all equally effective. However, some of the tablets may have a particular advantage that is best suited for your needs.",
  },
  {
    question: "Are ED drugs available OTC?",
    answer:
      "In the United States, erectile dysfunction medications are not available over-the-counter and can only be obtained with a prescription. ED medications that are sold without a prescription is illegal and could potentially result in harm from counterfeit drugs. Rocky provides access to a licensed health care team so you can be certain that you are getting safe and effective care. Through our online platform, you will be guided through a series of medical questions which is then received by a Canadian licensed doctor. They will review this information, and once approved, treatment is delivered straight to your home.",
  },
  {
    question: "How can I improve my ED?",
    answer:
      "There are multiple factors that contribute to your sexual health. With this in mind, there are certainly ways in which you can improve your erectile dysfunction. Lifestyle changes that promote overall health is a great place to start. Eating a healthy diet that promotes heart vitality and non-inflammatory, regular exercise and with cutting down on health-harming behaviour such as cigarette smoking and recreational drugs can make impactful change. Of course, there is also your mental well-being and intimate relationships that you should take into consideration. Therapy may be useful in these circumstances to help identify the root cause of any psychological difficulties you may be experiencing. Lastly, we have to mention alcohol. Its widely enjoyed and we wouldn’t want you to miss out on the fun, but if you notice that it may hampering your experience in the bedroom, maybe give it a miss or reduce it down next time.",
  },
];
