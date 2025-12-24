export default function QuizLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading Quiz...
        </h2>
        <p className="text-gray-600">Please wait while we prepare your quiz</p>
      </div>
    </div>
  );
}
