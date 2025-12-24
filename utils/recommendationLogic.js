/**
 * Recommendation Logic Engine
 * Processes quiz answers against logicResults graph to determine product recommendations
 */

import { logger } from "./devLogger";

/**
 * Process logic results graph to determine recommendations
 * @param {Object} quizData - The complete quiz data with logicResults
 * @param {Object} answers - All user answers collected during quiz
 * @returns {Array} - Array of recommended result objects
 */
export function processRecommendations(quizData, answers) {
  const { logicResults, results, questions } = quizData;
  
  if (!logicResults || !logicResults.edges || !logicResults.nodes) {
    console.warn("No logicResults found in quiz data");
    return [];
  }


  logger.log("quizData ->>>", quizData);

  logger.log("Processing recommendations with logicResults:", logicResults);
  logger.log("Available results:", results);
  logger.log("User answers:", answers);
  logger.log("Answers type:", typeof answers);
  logger.log("Answers is array:", Array.isArray(answers));
  logger.log("Answers keys:", answers ? Object.keys(answers) : 'null');
  logger.log("Questions ->>>>",questions);
  // Validate answers
  if (!answers || Object.keys(answers).length === 0) {
    console.error("No answers provided to processRecommendations");
    return [];
  }

  // Build a map of question IDs to their selected option index (0-based to match sourceHandle)
  const answerMap = {};
  const questionsArray = questions || quizData.steps || [];
  
  Object.entries(answers).forEach(([questionId, answer]) => {
    const cleanId = questionId.replace('question-', '');
    
    // Find the question to access its options array
    const question = questionsArray.find(q => q.id == cleanId);
    
    if (!question || !question.options) {
      logger.log(`Question ${cleanId} not found or has no options, skipping`);
      return;
    }
    
    let optionIndex = null;
    
    // Case 1: Answer value is a string (option text like "Regrowing my hair")
    if (typeof answer.value === 'string') {
      // Find the index in the options array (0-based)
      optionIndex = question.options.findIndex(opt => opt.text === answer.value);
      logger.log(`Q${cleanId}: Text "${answer.value}" → option-${optionIndex}`);
    } 
    // Case 2: Answer value is a number (could be 0-based or 1-based)
    else if (typeof answer.value === 'number') {
      // Check if this looks like a 1-based index (resultsFlow format)
      // by seeing if answer.value - 1 gives us a valid option
      if (answer.value > 0 && answer.value <= question.options.length) {
        // Try 1-based first
        const text = question.options[answer.value - 1]?.text;
        if (text) {
          optionIndex = answer.value - 1; // Convert to 0-based
          logger.log(`Q${cleanId}: 1-based index ${answer.value} → 0-based option-${optionIndex} ("${text}")`);
        }
      }
      // Otherwise assume it's already 0-based
      if (optionIndex === null && answer.value >= 0 && answer.value < question.options.length) {
        optionIndex = answer.value;
        const text = question.options[optionIndex]?.text;
        logger.log(`Q${cleanId}: 0-based index ${answer.value} → option-${optionIndex} ("${text}")`);
      }
    }
    // Case 3: Use answer.index if available
    else if (answer.index !== undefined) {
      optionIndex = answer.index;
      const text = question.options[optionIndex]?.text;
      logger.log(`Q${cleanId}: answer.index=${optionIndex} → option-${optionIndex} ("${text}")`);
    }
    
    // Store the 0-based index that matches sourceHandle format "option-0", "option-1", etc.
    answerMap[cleanId] = optionIndex;
  });

  logger.log("Answer map (0-based indices for sourceHandle matching):", answerMap);

  // Build edge lookup for efficient graph traversal
  const edgesBySource = {};
  logicResults.edges.forEach(edge => {
    if (!edgesBySource[edge.source]) {
      edgesBySource[edge.source] = [];
    }
    edgesBySource[edge.source].push(edge);
  });

  logger.log("Edge map:", edgesBySource);

  // Find all starting questions (questions that are not targets of other questions)
  const targetQuestions = new Set();
  logicResults.edges.forEach(edge => {
    if (edge.target.startsWith('question-')) {
      targetQuestions.add(edge.target);
    }
  });

  // Build list of starting questions from available question data
  let startingQuestions = [];
  
  if (questionsArray && questionsArray.length > 0) {
    startingQuestions = questionsArray
      .map(q => `question-${q.id}`)
      .filter(qId => !targetQuestions.has(qId));
  }
  
  // Fallback: if no starting questions found, find all source questions from edges
  if (startingQuestions.length === 0) {
    logger.log("No questions array found, extracting from edges");
    const allQuestionNodes = new Set();
    logicResults.edges.forEach(edge => {
      if (edge.source.startsWith('question-')) {
        allQuestionNodes.add(edge.source);
      }
    });
    startingQuestions = Array.from(allQuestionNodes).filter(qId => !targetQuestions.has(qId));
  }

  logger.log("Starting questions:", startingQuestions);

  // Traverse the graph from each starting question
  const recommendations = [];
  const processedResults = new Set();

  /**
   * Traverse the graph following user answers
   * @param {string} currentNode - Current node ID
   * @param {Set} pathVisited - Nodes visited in this specific path (prevents loops)
   */
  function traverseGraph(currentNode, pathVisited = new Set()) {
    // Prevent infinite loops in this specific path
    if (pathVisited.has(currentNode)) {
      logger.log(`Loop detected at ${currentNode}, stopping this path`);
      return;
    }
    
    const newPathVisited = new Set(pathVisited);
    newPathVisited.add(currentNode);

    logger.log(`Traversing node: ${currentNode}`);

    // Check if this is a result node
    if (currentNode.startsWith('result-')) {
      const resultId = parseResultId(currentNode);
      logger.log(`Reached result node: ${resultId}`);
      
      if (resultId && !processedResults.has(resultId)) {
        const result = results.find(r => r.id === resultId);
        if (result) {
          logger.log(`Adding recommendation:`, result);
          recommendations.push(result);
          processedResults.add(resultId);
        }
      }

      // Follow result→result chains (for combining multiple results)
      const resultChainEdges = edgesBySource[currentNode] || [];
      resultChainEdges.forEach(edge => {
        if (edge.target.startsWith('result-')) {
          logger.log(`Following result chain: ${currentNode} → ${edge.target}`);
          traverseGraph(edge.target, newPathVisited);
        }
      });
      
      return;
    }

    // This is a question node
    if (currentNode.startsWith('question-')) {
      const questionId = currentNode.replace('question-', '');
      const selectedOption = answerMap[questionId];

      logger.log(`Question ${questionId}, selected option: ${selectedOption}`);

      if (selectedOption === undefined || selectedOption === null) {
        logger.log(`⚠️ No answer found for question ${questionId} - cannot proceed`);
        logger.warn(`Available question IDs in answerMap:`, Object.keys(answerMap));
        return;
      }

      // Find edges that match this question and selected option
      const outgoingEdges = edgesBySource[currentNode] || [];
      logger.log(`Outgoing edges for ${currentNode}:`, outgoingEdges);

      let matchedEdge = false;

      outgoingEdges.forEach(edge => {
        // Check if this edge matches the selected option
        const sourceHandle = edge.sourceHandle;
        
        if (sourceHandle) {
          // Extract option index from sourceHandle (e.g., "option-2" → 2)
          const optionMatch = sourceHandle.match(/option-(\d+)/);
          if (optionMatch) {
            const optionIndex = parseInt(optionMatch[1]);
            
            if (optionIndex === selectedOption) {
              logger.log(`✓ Match! Following edge: ${currentNode} [option-${optionIndex}] → ${edge.target}`);
              matchedEdge = true;
              traverseGraph(edge.target, newPathVisited);
            } else {
              logger.log(`✗ Option mismatch: selected=${selectedOption}, edge requires=${optionIndex}`);
            }
          }
        } else {
          // No sourceHandle - unconditional edge (e.g., result→result chains)
          logger.log(`No sourceHandle, following unconditionally: ${edge.target}`);
          matchedEdge = true;
          traverseGraph(edge.target, newPathVisited);
        }
      });

      if (!matchedEdge && outgoingEdges.length > 0) {
        logger.warn(`⚠️ No matching edge found for question ${questionId} option ${selectedOption}`);
        logger.warn(`Available edges from this question:`, outgoingEdges.map(e => `option-${e.sourceHandle?.match(/\d+/)?.[0]} → ${e.target}`));
      } else if (!matchedEdge && outgoingEdges.length === 0) {
        logger.warn(`⚠️ No outgoing edges from question ${questionId} - dead end!`);
      }
    }
  }

  // Start traversal from each starting question
  startingQuestions.forEach(startNode => {
    logger.log(`\n=== Starting traversal from: ${startNode} ===`);
    traverseGraph(startNode);
  });

  logger.log("\n=== RECOMMENDATION ENGINE SUMMARY ===");
  logger.log("Total recommendations found:", recommendations.length);
  logger.log("Final recommendations:", recommendations);
  
  if (recommendations.length === 0) {
    logger.warn("⚠️ NO RECOMMENDATIONS FOUND!");
    logger.warn("Debug info:");
    logger.warn("- Starting questions:", startingQuestions);
    logger.warn("- Answer map:", answerMap);
    logger.warn("- Total edges:", logicResults.edges.length);
    logger.warn("- Total results:", results.length);
  }
  
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
