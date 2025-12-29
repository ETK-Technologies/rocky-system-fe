"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/utils/devLogger";
import { toast } from "react-toastify";
import RecommendationStep from "@/components/Quiz/questions/RecommendationStep";
import ProductCard from "@/components/Quiz/ProductCard";
import CrossSellModal from "@/components/Quiz/CrossSellPopup/CrossSellModal";
import { addToCartDirectly } from "@/utils/flowCartHandler";
import { transformEDProducts } from "@/components/Quiz/functions/transformEdProducts";
import { transformProductDataForCard } from "@/utils/recommendationRulesEngine";

export default function QuizResultsPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [initialCartData, setInitialCartData] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);

  // Flow type mapping
  const FLOW_TYPES = {
    ED: "ed",
    HAIR: "hair",
    WL: "wl",
    MH: "mh",
    SKINCARE: "skincare",
  };

  // Detect flow type from slug
  const getFlowTypeFromSlug = (slug) => {
    if (!slug) return null;
    const slugLower = slug.toLowerCase();
    
    if (slugLower.includes("ed")) return FLOW_TYPES.ED;
    if (slugLower.includes("hair")) return FLOW_TYPES.HAIR;
    if (slugLower.includes("wl")) return FLOW_TYPES.WL;
    if (slugLower.includes("mh")) return FLOW_TYPES.MH;
    if (slugLower.includes("skincare") || slugLower.includes("skin")) return FLOW_TYPES.SKINCARE;
    
    return null;
  };

  const flowType = getFlowTypeFromSlug(slug);

  logger.log("FlowType: ->", flowType);

  useEffect(() => {
    // Load results from sessionStorage
    const storedResults = sessionStorage.getItem('quiz-results');

    logger.log("Loaded stored quiz results from sessionStorage:", storedResults);
    
    if (!storedResults) {
      toast.error("No quiz results found");
      router.push(`/quiz/${slug}`);
      return;
    }





    try {
      const parsedResults = JSON.parse(storedResults);
      logger.log("Loaded quiz results:", parsedResults);
      logger.log("Is pre-quiz:", parsedResults.preQuiz);
      logger.log("Main quiz ID:", parsedResults.mainQuizId);
      
      // Check if this is a pre-quiz (product recommendation flow)
      if (!parsedResults.preQuiz) {
        logger.warn("Results page should only be used for pre-quizzes");
        toast.error("Invalid quiz flow");
        router.push(`/quiz/${slug}`);
        return;
      }
      
      setResults(parsedResults);
      
      // Find the matching result for the selected product (will be set after product selection)
      if (parsedResults?.recommendations) {
        setCurrentResult(transformProductDataForCard(parsedResults?.recommendations, flowType));
      }


      logger.log("Transformed quiz results set in state", transformProductDataForCard(parsedResults?.recommendations, flowType));

    } catch (error) {
      logger.error("Error parsing quiz results:", error);
      toast.error("Invalid quiz results");
      router.push(`/quiz/${slug}`);
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  // Debug: Log the data to see what we're receiving
  useEffect(() => {
    if (results?.recommendations) {
      logger.log("Recommended product data:", results.recommendations);
      logger.log("All recommendations:", results.recommendations);
    }
  }, [results]);

  // Auto-select first product by default
  useEffect(() => {
    if (results?.recommendations?.[0] && !selectedProduct) {
      let transformedProduct;
      
      // For ED flow, use ED transformer for auto-selection
      if (flowType === FLOW_TYPES.ED) {
        // Use ALL products for transformation
        const allProducts = results.allProducts || results.recommendations;
        const transformedProducts = transformEDProducts(allProducts);
        
        logger.log("🔍 Auto-select: All transformed ED products:", transformedProducts.length);
        
        // For ED, show all transformed products - just auto-select the first one
        transformedProduct = transformedProducts[0];
        logger.log("Auto-selected first ED product (transformed):", transformedProduct);
      } else {
        transformedProduct = transformProductData(results.recommendations[0]);
        logger.log("Auto-selected first product:", transformedProduct);
      }
      
      if (transformedProduct) {
        setSelectedProduct(transformedProduct);
      } else {
        logger.error("⚠️ No transformed product available for auto-selection");
      }
    }
  }, [results, selectedProduct, flowType]);

  const handleContinue = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    // Validate product has required fields
    if (!selectedProduct.id && !selectedProduct.variationId) {
      logger.error("Product missing required ID fields:", selectedProduct);
      toast.error("Invalid product data. Please try again.");
      return;
    }

    // Check if cross-sell should be shown
    const hasAddons = currentResult?.productsData && 
                      Array.isArray(currentResult.productsData) && 
                      currentResult.productsData.length > 0;
    
    logger.log(`📊 Cross-sell check - hasAddons: ${hasAddons}`, currentResult);

    setIsAddingToCart(true);
    
    try {
      logger.log(
        `🛒 Quiz Results (${slug}) - Selected Product:`,
        selectedProduct
      );
      
      // Prepare product data for cart addition
      const productForCart = {
        id: selectedProduct.productId,
        productId: selectedProduct.productId,
        variationId: selectedProduct.variationId,
        quantity: 1,
        name: selectedProduct.name || selectedProduct.title,
        price: selectedProduct.price,
        image: selectedProduct.image,
        isSubscription: selectedProduct.isSubscription,
        subscriptionPeriod: selectedProduct.subscriptionPeriod,
        requireConsultation: selectedProduct.requireConsultation,
      };

      logger.log(`🛒 Quiz Results (${slug}) - Preparing to add to cart`, productForCart);

      logger.log(
        `🛒 Quiz Results (${slug}) - Product for cart:`,
        productForCart
      );
      
      logger.log("Detected flow type from slug:", flowType);
      
      // Add product to cart using the universal flow handler
      const result = await addToCartDirectly(
        productForCart,
        [],
        flowType,
        {
          requireConsultation: selectedProduct.requireConsultation || false,
          subscriptionPeriod: selectedProduct.subscriptionPeriod || null,
          preserveExistingCart: flowType === FLOW_TYPES.WL ? false : true,
        }
      );

      if (result.success) {
        logger.log(`🎉 Quiz Results (${slug}) - SUCCESS! Result:`, result);
        toast.success(`${selectedProduct.name || selectedProduct.title} added to cart`);
        
        // Check if we should show cross-sell modal
        if (false) {
          logger.log(`🎁 Showing cross-sell modal with ${currentResult.productsData.length} addons`);
          setTimeout(() => {
            setIsAddingToCart(false);
            setShowCrossSellModal(true);
          }, 100);
        } else {
          // No addons, redirect to checkout directly
          logger.log(`➡️ No addons, redirecting to checkout`);
          setIsAddingToCart(false);
          window.location.href = result.redirectUrl;
        }
      } else {
        logger.error(`❌ Quiz Results (${slug}) - FAILED! Error:`, result.error);
        toast.error(
          result.error ||
            "There was an issue adding the product to cart. Please try again."
        );
        setIsAddingToCart(false);
      }
    } catch (error) {
      logger.error(`Error during ${slug} quiz checkout:`, error);
      toast.error(error.message || "Failed to add product to cart. Please try again.");
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">Loading your recommendations...</p>
        </div>
      </div>
    );
  }

  if (!results || !results.recommendations || results.recommendations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-yellow-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Recommendations Available
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any product recommendations based on your quiz responses.
          </p>
          <button
            onClick={() => router.push(`/quiz/${slug}`)}
            className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  const { recommendations, quizData } = results;

  
  const stepData = {
    title: "Your treatment plan",
    description: `Based on your quiz responses for ${quizData?.name || "your health goals"}`,
    recommended: currentResult,
    alternatives: []
  };

  // Create a custom setSelectedProduct handler that works with ED product selections
  const handleProductSelection = (product, options) => {
    logger.log("📦 Product selection:", { product, options });
    
    // For ED products, options will contain { preference, frequency, pills, pillCount, price, variationId }
    if (options && flowType === FLOW_TYPES.ED) {
      // Merge the product with the selection options
      const updatedProduct = {
        ...product,
        price: options.price,
        variationId: options.variationId,
        productId: product.id, // Original product ID
        selectedPreference: options.preference,
        selectedFrequency: options.frequency,
        selectedPills: options.pills,
        pillCount: options.pillCount,
      };
      logger.log("✅ Updated ED product with selections:", updatedProduct);
      setSelectedProduct(updatedProduct);
    } else {
      // For non-ED products, just set the product as-is
      setSelectedProduct(product);
    }
  };

  return (
    <>
      <RecommendationStep
        step={stepData}
        selectedProduct={selectedProduct}
        setSelectedProduct={handleProductSelection}
        onContinue={handleContinue}
        ProductCard={ProductCard}
        showAlternatives={false}
        variations={[]}
        showIncluded={true}
        isLoading={isAddingToCart}
        flowType={flowType}
      />

      {/* Cross-Sell Modal */}
      {showCrossSellModal && selectedProduct && currentResult?.productsData && (
        <CrossSellModal
          isOpen={showCrossSellModal}
          onClose={() => setShowCrossSellModal(false)}
          selectedProduct={{
            productId: selectedProduct.productId || selectedProduct.id,
            variantId: selectedProduct.variationId || selectedProduct.id,
            price: selectedProduct.price,
            name: selectedProduct.name || selectedProduct.title,
            image: selectedProduct.image,
          }}
          addonProducts={currentResult.productsData || []}
          flowType={flowType || slug}
          onCheckout={() => {
            setShowCrossSellModal(false);
            // Checkout will be handled by the modal's checkout function
          }}
          isLoading={false}
          initialCartData={initialCartData}
        />
      )}
    </>
  );
}
