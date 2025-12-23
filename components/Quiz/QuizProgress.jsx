export default function QuizProgress({ current, total, percentage }) {
  return (
    <div className="mb-8">
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-600">
          {Math.round(percentage)}% complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: '#A7885A' }}
        />
      </div>
    </div>
  );
}
