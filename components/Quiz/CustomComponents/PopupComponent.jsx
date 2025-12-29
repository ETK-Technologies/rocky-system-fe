export default function PopupComponent({ step, answer, onAnswerChange }) {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">⚠️</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Important Information</h3>
        <p className="text-gray-700">
          Please read the following information carefully before continuing.
        </p>
      </div>

      <div className="bg-white rounded-lg p-4 mb-6">
        <p className="text-gray-800 leading-relaxed">
          This is an important notice that requires your attention. Make sure you understand
          the information presented before proceeding with the quiz.
        </p>
      </div>

      <button
        onClick={() => onAnswerChange({ answerType: "text", answer: "acknowledged" })}
        className="w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
      >
        I Understand, Continue
      </button>
    </div>
  );
}
