export default function MedicationPopup({ step, answer, onAnswerChange }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">💊</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Medication Information</h3>
        <p className="text-gray-700">
          Important information about medication interactions
        </p>
      </div>

      <div className="bg-white rounded-lg p-4 mb-6">
        <ul className="space-y-2 text-gray-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Please consult with your healthcare provider about any medications you're currently taking</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Some medications may have interactions with prescribed treatments</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Always inform your doctor of any changes to your medication regimen</span>
          </li>
        </ul>
      </div>

      <button
        onClick={() => onAnswerChange("acknowledged")}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        I Understand, Continue
      </button>
    </div>
  );
}
