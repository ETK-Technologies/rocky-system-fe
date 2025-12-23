"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function QuizBuilderTestPage() {
  const [quizSlug, setQuizSlug] = useState("test-quiz");
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  
  // Start quiz session state
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [quizSessionData, setQuizSessionData] = useState(null);
  const [startQuizError, setStartQuizError] = useState(null);

  // Runtime quiz state
  const [loadingRuntime, setLoadingRuntime] = useState(false);
  const [runtimeQuizData, setRuntimeQuizData] = useState(null);
  const [runtimeError, setRuntimeError] = useState(null);

  // Active tab for response viewer
  const [activeTab, setActiveTab] = useState("quiz");

  const fetchQuiz = async () => {
    if (!quizSlug.trim()) {
      toast.error("Please enter a quiz slug");
      return;
    }

    setLoading(true);
    setError(null);
    setQuizData(null);
    setRawResponse(null);

    try {
      const response = await fetch(`/api/quizzes/slug/${quizSlug.trim()}`);
      const data = await response.json();

      setRawResponse(data);

      if (response.ok && data.success) {
        setQuizData(data.data);
        toast.success("Quiz loaded successfully!");
      } else {
        setError(data.error || "Failed to load quiz");
        toast.error(data.error || "Failed to load quiz");
      }
    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchQuiz();
    }
  };

  const startQuiz = async (quizId) => {
    if (!quizId) {
      toast.error("Quiz ID is required to start");
      return;
    }

    setStartingQuiz(true);
    setStartQuizError(null);
    setQuizSessionData(null);

    try {
      const response = await fetch(`/api/quizzes/${quizId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Add any start params if needed
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQuizSessionData(data.data);
        toast.success("Quiz session started successfully!");
      } else {
        setStartQuizError(data.error || "Failed to start quiz");
        toast.error(data.error || "Failed to start quiz");
      }
    } catch (err) {
      setStartQuizError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setStartingQuiz(false);
    }
  };

  const fetchRuntimeQuiz = async () => {
    if (!quizSlug.trim()) {
      toast.error("Please enter a quiz slug");
      return;
    }

    setLoadingRuntime(true);
    setRuntimeError(null);
    setRuntimeQuizData(null);

    try {
      const response = await fetch(`/api/quizzes/runtime/${quizSlug.trim()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setRuntimeQuizData(data.data);
        toast.success("Runtime quiz loaded successfully!");
      } else {
        setRuntimeError(data.error || "Failed to load runtime quiz");
        toast.error(data.error || "Failed to load runtime quiz");
      }
    } catch (err) {
      setRuntimeError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoadingRuntime(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quiz Builder - Test View
          </h1>
          <p className="text-gray-600">
            Test endpoint: <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/quizzes/slug/&#123;slug&#125;</code>
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quiz Slug
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={quizSlug}
              onChange={(e) => setQuizSlug(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter quiz slug (e.g., test-quiz)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || loadingRuntime}
            />
            <button
              onClick={fetchQuiz}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {loading ? "Loading..." : "Fetch Quiz"}
            </button>
            <button
              onClick={fetchRuntimeQuiz}
              disabled={loadingRuntime}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loadingRuntime
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {loadingRuntime ? "Loading..." : "🎮 Fetch Runtime"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Try common slugs: ed-quiz, hair-quiz, mh-quiz, test-quiz, wlprecons
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-600 mb-3">{error}</p>
            {rawResponse && (
              <div className="mt-3 bg-white border border-red-300 rounded p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Debug Info:</p>
                {rawResponse.requestedUrl && (
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">URL:</span> {rawResponse.requestedUrl}
                  </p>
                )}
                {rawResponse.baseUrl && (
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">Base URL:</span> {rawResponse.baseUrl}
                  </p>
                )}
                {rawResponse.details && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Backend Response:</p>
                    <pre className="text-xs text-gray-600 overflow-auto bg-gray-50 p-2 rounded">
                      {rawResponse.details}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quiz Data Display */}
        {quizData && (
          <div className="space-y-6">
            {/* Quiz Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Quiz Information
                </h2>
                <button
                  onClick={() => startQuiz(quizData.id || quizData._id || quizData.quiz_id)}
                  disabled={startingQuiz || !(quizData.id || quizData._id || quizData.quiz_id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    startingQuiz || !(quizData.id || quizData._id || quizData.quiz_id)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {startingQuiz ? "Starting..." : "🚀 Start Quiz Session"}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Quiz ID</p>
                  <p className="font-semibold text-gray-900">
                    {quizData.id || quizData._id || quizData.quiz_id || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Title</p>
                  <p className="font-semibold text-gray-900">
                    {quizData.title || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Slug</p>
                  <p className="font-semibold text-gray-900">
                    {quizData.slug || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-semibold text-gray-900">
                    {quizData.description || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Questions</p>
                  <p className="font-semibold text-gray-900">
                    {quizData.questions?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Quiz Session Data */}
            {quizSessionData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-green-900 mb-4">
                  ✅ Quiz Session Started
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700">Session ID</p>
                    <p className="font-semibold text-green-900">
                      {quizSessionData.session_id || quizSessionData.sessionId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Status</p>
                    <p className="font-semibold text-green-900">
                      {quizSessionData.status || "Active"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-white border border-green-300 rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Full Session Data:</p>
                  <pre className="text-xs text-gray-600 overflow-auto bg-gray-50 p-2 rounded max-h-48">
                    {JSON.stringify(quizSessionData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Start Quiz Error */}
            {startQuizError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">
                  Start Quiz Error
                </h3>
                <p className="text-red-600">{startQuizError}</p>
              </div>
            )}

            {/* Runtime Quiz Data */}
            {runtimeQuizData && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-purple-900 mb-4">
                  🎮 Runtime Quiz Data
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-purple-700">Title</p>
                    <p className="font-semibold text-purple-900">
                      {runtimeQuizData.title || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">Slug</p>
                    <p className="font-semibold text-purple-900">
                      {runtimeQuizData.slug || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">Questions Count</p>
                    <p className="font-semibold text-purple-900">
                      {runtimeQuizData.questions?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-purple-300 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700">Full Runtime Data:</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(runtimeQuizData, null, 2));
                        toast.success("Runtime data copied to clipboard!");
                      }}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                    >
                      📋 Copy JSON
                    </button>
                  </div>
                  <pre className="text-xs text-gray-600 overflow-auto bg-gray-50 p-2 rounded max-h-96">
                    {JSON.stringify(runtimeQuizData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Runtime Error */}
            {runtimeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">
                  Runtime Quiz Error
                </h3>
                <p className="text-red-600">{runtimeError}</p>
              </div>
            )}

            {/* Questions Display */}
            {quizData.questions && quizData.questions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Questions ({quizData.questions.length})
                </h2>
                <div className="space-y-4">
                  {quizData.questions.map((question, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {question.question || question.text || "No question text"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Type: <span className="font-medium">{question.type || "N/A"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Options/Answers */}
                      {(question.options || question.answers) && (
                        <div className="ml-11 mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Options:</p>
                          <div className="space-y-1">
                            {(question.options || question.answers).map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="w-6 h-6 border-2 border-gray-300 rounded flex items-center justify-center text-xs">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className="text-gray-700">
                                  {typeof option === "string" ? option : option.text || option.label || JSON.stringify(option)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Question Properties */}
                      {question.required !== undefined && (
                        <div className="ml-11 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${question.required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                            {question.required ? "Required" : "Optional"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Responses - Tabbed View */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                📊 All API Responses
              </h2>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("quiz")}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === "quiz"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📝 Quiz Data
                </button>
                <button
                  onClick={() => setActiveTab("runtime")}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === "runtime"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🎮 Runtime Data
                </button>
                <button
                  onClick={() => setActiveTab("session")}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === "session"
                      ? "text-green-600 border-b-2 border-green-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🚀 Session Data
                </button>
              </div>

              {/* Tab Content */}
              <div className="bg-gray-50 p-4 rounded-lg">
                {activeTab === "quiz" && (
                  <div>
                    {rawResponse ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Endpoint: <code className="bg-gray-200 px-2 py-1 rounded text-xs">GET /api/quizzes/slug/{"{slug}"}</code>
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${rawResponse.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {rawResponse.success ? "✓ Success" : "✗ Failed"}
                          </span>
                        </div>
                        <pre className="bg-white p-4 rounded border border-gray-200 overflow-auto text-xs max-h-96">
                          {JSON.stringify(rawResponse, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No quiz data fetched yet. Click "Fetch Quiz" to load data.</p>
                    )}
                  </div>
                )}

                {activeTab === "runtime" && (
                  <div>
                    {runtimeQuizData ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Endpoint: <code className="bg-gray-200 px-2 py-1 rounded text-xs">GET /api/v1/runtime/quizzes/{"{slug}"}</code>
                          </p>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            ✓ Success
                          </span>
                        </div>
                        <pre className="bg-white p-4 rounded border border-gray-200 overflow-auto text-xs max-h-96">
                          {JSON.stringify({ success: true, data: runtimeQuizData }, null, 2)}
                        </pre>
                      </div>
                    ) : runtimeError ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Endpoint: <code className="bg-gray-200 px-2 py-1 rounded text-xs">GET /api/v1/runtime/quizzes/{"{slug}"}</code>
                          </p>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                            ✗ Failed
                          </span>
                        </div>
                        <pre className="bg-white p-4 rounded border border-red-200 overflow-auto text-xs max-h-96">
                          {JSON.stringify({ success: false, error: runtimeError }, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No runtime data fetched yet. Click "🎮 Fetch Runtime" to load data.</p>
                    )}
                  </div>
                )}

                {activeTab === "session" && (
                  <div>
                    {quizSessionData ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Endpoint: <code className="bg-gray-200 px-2 py-1 rounded text-xs">POST /api/v1/quizzes/{"{quizId}"}/start</code>
                          </p>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            ✓ Success
                          </span>
                        </div>
                        <pre className="bg-white p-4 rounded border border-gray-200 overflow-auto text-xs max-h-96">
                          {JSON.stringify({ success: true, data: quizSessionData }, null, 2)}
                        </pre>
                      </div>
                    ) : startQuizError ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Endpoint: <code className="bg-gray-200 px-2 py-1 rounded text-xs">POST /api/v1/quizzes/{"{quizId}"}/start</code>
                          </p>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                            ✗ Failed
                          </span>
                        </div>
                        <pre className="bg-white p-4 rounded border border-red-200 overflow-auto text-xs max-h-96">
                          {JSON.stringify({ success: false, error: startQuizError }, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No session started yet. Fetch a quiz first, then click "🚀 Start Quiz Session".</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!quizData && !error && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-blue-900 font-semibold mb-2">
              📋 How to use:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Enter a quiz slug in the input field above</li>
              <li>Click "Fetch Quiz" or press Enter</li>
              <li>Review the quiz data structure in the response</li>
              <li>Use this data to plan the quiz builder implementation</li>
            </ol>
            <div className="mt-4 p-4 bg-white rounded border border-blue-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Backend Endpoint:
              </p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                GET {"{BASE_URL}"}/wp-json/api/v1/quizzes/slug/&#123;slug&#125;
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
