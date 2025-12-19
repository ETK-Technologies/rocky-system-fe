/**
 * Recommendation Logic Engine
 * Processes quiz answers against logicResults graph to determine product recommendations
 */

/**
 * Process logic results graph to determine recommendations
 * @param {Object} quizData - The complete quiz data with logicResults
 * @param {Object} answers - All user answers collected during quiz
 * @returns {Array} - Array of recommended result objects
 */
export function processRecommendations(quizData, answers) {
  const { logicResults, results } = quizData;
  
  if (!logicResults || !logicResults.edges || !logicResults.nodes) {
    console.warn("No logicResults found in quiz data");
    return [];
  }

  console.log("Processing recommendations with logicResults:", logicResults);
  console.log("Available results:", results);
  console.log("User answers:", answers);

  // Build a map of question IDs to their answers
  const answerMap = {};
  Object.entries(answers).forEach(([questionId, answer]) => {
    // Extract the actual question ID (remove "question-" prefix if exists)
    const cleanId = questionId.replace('question-', '');
    answerMap[cleanId] = answer.value;
  });

  console.log("Answer map:", answerMap);

  // Find result nodes that are reachable based on the edges
  const recommendations = [];
  const processedResults = new Set();

  // Process each edge in the graph
  logicResults.edges.forEach(edge => {
    const { source, target } = edge;
    
    // Check if this is a question-to-result edge
    if (source.startsWith('question-') && target.startsWith('result-')) {
      const questionId = source.replace('question-', '');
      const resultId = parseResultId(target);
      
      console.log(`Checking edge: Q${questionId} → R${resultId}`);
      
      // Check if we have an answer for this question
      if (answerMap[questionId]) {
        console.log(`Answer found for Q${questionId}:`, answerMap[questionId]);
        
        // This edge is satisfied, add the result
        if (!processedResults.has(resultId)) {
          const result = results.find(r => r.id === resultId);
          if (result) {
            console.log(`Adding recommendation:`, result);
            recommendations.push(result);
            processedResults.add(resultId);
          }
        }
      }
    }
  });

  console.log("Final recommendations:", recommendations);
  return recommendations;
}

/**
 * Parse result ID from target string
 * Examples: "result-1-1765829705967" → 1, "result-1765829625360-1765829714210" → 1765829625360
 */
function parseResultId(target) {
  const parts = target.replace('result-', '').split('-');
  // Try to find a numeric ID
  for (const part of parts) {
    const num = parseInt(part);
    if (!isNaN(num)) {
      return num;
    }
  }
  return null;
}

/**
 * Format recommendation for display
 * @param {Object} result - Result object from quiz
 * @returns {Object} - Formatted recommendation
 */
export function formatRecommendation(result) {
  return {
    id: result.id,
    name: result.title || "Product",
    description: result.description || result.note || "",
    image: result.image || result.alertImage || "",
    productId: result.mainProductId || result.selectedProductId,
    resultType: result.resultType,
    redirectUrl: result.redirectUrl,
    hasAddons: result.addons,
    products: result.products || [],
    alertDescription: result.alertDescription || "",
    alertImage: result.alertImage || "",
  };
}

/**
 * Get recommendations from completed quiz response
 * This would typically come from the backend complete endpoint
 * @param {Object} completeResponse - Response from /complete endpoint
 * @returns {Array} - Array of recommendations
 */
export function extractRecommendationsFromResponse(completeResponse) {
  // Handle different possible response structures
  if (completeResponse.recommendations) {
    return completeResponse.recommendations;
  }
  
  if (completeResponse.results) {
    return completeResponse.results;
  }
  
  if (completeResponse.data && completeResponse.data.recommendations) {
    return completeResponse.data.recommendations;
  }
  
  if (completeResponse.data && completeResponse.data.results) {
    return completeResponse.data.results;
  }
  
  return [];
}
