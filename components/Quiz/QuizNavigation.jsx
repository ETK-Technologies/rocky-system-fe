export default function QuizNavigation({
  canGoBack,
  canGoNext,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
}) {
  const handleNextClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onNext();
    }, 50);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
      <div className="w-full md:max-w-[520px]  mx-auto">
        <button
          onClick={handleNextClick}
          disabled={!canGoNext || isSubmitting}
          className={`w-full h-[52px] py-3 rounded-full font-medium transition-colors ${
            canGoNext && !isSubmitting
              ? "bg-black text-white hover:bg-gray-800"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : isLastStep ? (
            "Submit"
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
