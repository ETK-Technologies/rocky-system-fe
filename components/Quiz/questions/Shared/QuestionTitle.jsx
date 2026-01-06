export default function QuestionTitle({ title, description }) {
  return (
    <div>
      <h2 className="quiz-heading text-[26px] md:text-[32px] subheaders-font font-medium mb-2 md:mb-4">{title}</h2>
      {description && (
        <p className="quiz-subheading text-[16px] md:text-[18px] pt-2 mb-4 font-medium text-[rgb(174,126,86)]">{description}</p>
      )}
    </div>
  );
}