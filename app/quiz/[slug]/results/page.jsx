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
      if (parsedResults?.recommendations?.[0]) {
        setCurrentResult(parsedResults.recommendations[0]);
      }
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
    if (results?.recommendations?.[0]) {
      logger.log("Recommended product data:", results.recommendations[0]);
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

  /**
   * Transform product data from backend format to ProductCard format
   */
  const transformProductData = (product) => {
    if (!product) return null;

    const productData = product.productData || product;
    // Get the first variant from the variants array (default selection)
    const variant = product.variant || productData.variants?.[0];
    
    // Extract variant ID - this is the WooCommerce variation ID we need for cart
    const variantId = variant?.id || product.variationId;
    
    // Extract image URL (prefer variant image, fallback to product image)
    const imageUrl = variant?.imageUrl ||
                     productData.images?.[0]?.url || 
                     product.image || 
                     '';
    
    // Extract price from variant or product (variants have specific pricing)
    const price = variant?.price || 
                  productData.basePrice ||
                  productData.price || 
                  product.price || 
                  0;
    
    // Extract regular price if available
    const regularPrice = variant?.regularPrice || 
                         productData.regularPrice || 
                         product.regularPrice || 
                         null;

    // Extract product_tagline from metadata
    const productTagline = productData.metadata?.find(meta => meta.key === 'product_tagline')?.value || 
                           product.product_tagline || 
                           productData.shortDescription ||
                           '';

    // Extract description from metadata or product
    const description = productData.metadata?.find(meta => meta.key === 'product_description_0_detailed_description')?.value ||
                        product.description || 
                        productData.description || 
                        '';

    // Map subscription period from WordPress to our format
    const mapSubscriptionPeriod = (period, interval) => {
      if (!period) return '1_month';
      const periodMap = {
        'WEEK': interval === 6 ? '6_week' : `${interval}_week`,
        'MONTH': `${interval || 1}_month`,
        'DAY': `${interval}_day`,
      };
      return periodMap[period] || '1_month';
    };

    // Transform ED-specific data from globalAttributes to ED card format
    const buildEDSpecificData = () => {
      if (flowType !== 'ed' || !productData.globalAttributes) {
        return {};
      }

      // Find Tabs frequency and Subscription Type attributes
      const tabsAttr = productData.globalAttributes.find(attr => 
        attr.slug === 'tabs-frequency' || attr.name === 'Tabs frequency'
      );
      
      const subscriptionAttr = productData.globalAttributes.find(attr => 
        attr.slug === 'subscription-type' || attr.name === 'Subscription Type'
      );

      if (!tabsAttr || !subscriptionAttr) {
        return {};
      }

      // Build frequencies map
      const frequencies = {};
      subscriptionAttr.options?.forEach(option => {
        const key = option.value; // e.g., "monthly-supply", "quarterly-supply"
        frequencies[key] = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      });

      // Build pillOptions structure
      const pillOptions = {};
      subscriptionAttr.options?.forEach(freqOption => {
        const frequencyKey = freqOption.value; // e.g., "monthly-supply"
        pillOptions[frequencyKey] = [];

        // For each tab count, find variants that match this frequency
        tabsAttr.options?.forEach(tabOption => {
          const tabCount = tabOption.value?.replace('-tabs', '').replace('-tab', '');
          
          // Find variants that match both this frequency and tab count
          const matchingVariants = freqOption.variants?.filter(v => {
            // Check if variant is published and matches this tab count
            return v.status === "PUBLISHED" && 
                   (v.sku?.includes(tabCount) || tabOption.variants?.some(tv => tv.id === v.id));
          }) || [];

          if (matchingVariants.length > 0) {
            // Use the first matching variant for generic
            const genericVariant = matchingVariants[0];
            // Brand would typically be a different variant, for now use same
            const brandVariant = matchingVariants[1] || genericVariant;

            pillOptions[frequencyKey].push({
              count: parseInt(tabCount) || tabCount,
              genericPrice: genericVariant.price,
              brandPrice: brandVariant.price,
              genericVariationId: genericVariant.id,
              brandVariationId: brandVariant.id,
            });
          }
        });

        // Sort by count
        pillOptions[frequencyKey].sort((a, b) => {
          const aNum = parseInt(a.count) || 0;
          const bNum = parseInt(b.count) || 0;
          return aNum - bNum;
        });
      });

      // Extract active ingredient from metadata or attributes
      const activeIngredient = productData.metadata?.find(meta => 
        meta.key === 'active_ingredient'
      )?.value || 'Sildenafil';

      // Extract strengths from Dose/Strength attribute
      const strengthsAttr = productData.globalAttributes.find(attr => 
        attr.slug === 'dose-strength' || attr.name === 'Dose/ Strength'
      );
      const strengths = strengthsAttr?.value?.split(',').map(s => s.trim()) || [];

      return {
        activeIngredient,
        strengths,
        preferences: ['generic', 'brand'], // ED products typically have both
        frequencies,
        pillOptions,
      };
    };

    const edData = buildEDSpecificData();

    return {
      id: variantId || productData.id || product.id,
      variationId: variantId, // Use variant ID from WordPress variants array
      productId: productData.id, // Keep reference to parent product
      name: productData.name || product.name || '',
      title: product.title || productData.name || product.name || '',
      product_tagline: productTagline,
      description: description,
      image: imageUrl,
      price: price,
      regularPrice: regularPrice,
      frequency: product.frequency || variant?.subscriptionPeriod || '',
      supply: product.supply || '',
      pills: product.pills || '',
      badge: product.badge || '',
      features: product.features || [],
      isSubscription: productData.type?.includes('SUBSCRIPTION') || product.isSubscription || false,
      subscriptionPeriod: mapSubscriptionPeriod(variant?.subscriptionPeriod, variant?.subscriptionInterval),
      supplyAvailable: product.supplyAvailable !== false,
      available: product.available !== false,
      requireConsultation: product.requireConsultation || false,
      details: product.details || '',
      strengthLevel: product.strengthLevel || 0,
      isPrescription: product.isPrescription || false,
      sku: variant?.sku || productData.sku || '',
      // ED-specific fields
      tagline: product.tagline || productTagline,
      ...edData, // Spread the ED-specific data (activeIngredient, strengths, preferences, frequencies, pillOptions)
    };
  };

  // Transform recommendations to proper format
  // For ED flow, use the special ED product transformer
  let transformedRecommendations;
  
  if (flowType === FLOW_TYPES.ED) {
    logger.log("🔄 Using ED product transformer for recommendations");
    logger.log("📦 User's recommendation:", recommendations);
    logger.log("📦 All products for merging:", results.allProducts?.length || 0);
    
    // Use ALL products for transformation (to enable brand/generic merging)
    // ED products are grouped into brand/generic pairs, show all transformed cards
    const allProducts = results.allProducts || recommendations;
    
    transformedRecommendations = transformEDProducts(allProducts);
    
    logger.log("✅ Transformed ED products:", transformedRecommendations.length);
    logger.log("✅ ED products to display:", transformedRecommendations);
  } else {
    // Use standard transformation for other flows
    transformedRecommendations = recommendations.map(transformProductData).filter(Boolean);
  }
  
  const recommended = transformedRecommendations[0]; // First recommendation as primary
  const alternatives = transformedRecommendations.slice(1); // Rest as alternatives

  const stepData = {
    title: "Your treatment plan",
    description: `Based on your quiz responses for ${quizData?.name || "your health goals"}`,
    recommended: recommended,
    alternatives: alternatives
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
        showAlternatives={alternatives.length > 0}
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
