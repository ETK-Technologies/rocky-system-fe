import { useMemo } from "react";
import FaqItem from "@/components/FaqItem";

const FaqsSection = ({
  title = "FAQs",
  subtitle,
  name,
  nameWithLineBreak,
  isFirstCardOpen,
}) => {
  const faqs = [
    {
      question: "What is the cause of ED?",
      answer:
        "Erectile dysfunction can be caused by a variety of issues such as psychological distress, medical conditions or medications. Situational anxiety and stress tend to be the leading causes in younger men and may restrict blood flow to the penis at the wrong moment. As you age, ED may become persistent due to underlying problems with nerves, blood vessels or hormone production. Our online medical assessment can help establish the cause and treat your ED.",
    },
    {
      question: "How do ED pills work?",
      answer:
        "Get the party started and the pills will do the rest. When sexually aroused, the body releases a substance called nitric oxide which works to relax the blood vessels in penis. This results in a blood rush to the penis, leaving it hard for penetration. When sex is over, an enzyme shuts this process off. ED pills work by blocking this enzyme (PDE5), making it easier to get your erection going longer and stronger.",
    },
    {
      question: "What is the safest drug for ED?",
      answer:
        "All medications go through extensive clinical trials and quality checks before getting approved by Health Canada. The safety and effectiveness for ED medications is well established, making it an excellent treatment for most men. Our online questionnaire will take into account your personal medical history and determine if these pills are right for you!",
    },
    {
      question: "What is the most effective pill for ED?",
      answer:
        "While both Sildenafil and Tadalafil are equally effective, there are a few differences. Viagra takes anywhere between 30-60 mins to work after ingestion but sometimes can be delayed up to 2 hours and its effects lasts on average 4 hours. Cialis on the other hand , some may act faster, last longer or work regardless of when you had your last meal. With enough information, Rocky can help you find an ED medication and dosage that is right for you. You may connect with providers and receive ongoing care through our platform.",
    },
    {
      question: "What are the side effects of ED medications?",
      answer:
        "In general, ED treatment is well tolerated. However if side effects occur, they are usually mild and temporary. This includes headaches, flushed skin, runny nose and upset stomach. ED medications can very rarely cause serious side effects such as priapism (a prolonged erection lasting hours after stimulation has ended) which can result in permanent damage to your penis if not treated immediately. Other rare events include sudden loss of vision or loss of hearing.",
    },
    {
      question: "Which ED drug is the best?",
      answer:
        "There is no particular medication that is superior to the other, they are all equally effective. However, some of the tablets may have a particular advantage that is best suited for your needs.",
    },
    {
      question: "Are ED drugs available OTC?",
      answer:
        "In the United States, erectile dysfunction medications are not available over-the-counter and can only be obtained with a prescription. ED medications that are sold without a prescription is illegal and could potentially result in harm from counterfeit drugs. Rocky provides access to a licensed health care team so you can be certain that you are getting safe and effective care. Through our online platform, you will be guided through a series of medical questions which is then received by a Canadian licensed doctor. They will review this information, and once approved, treatment is delivered straight to your home.",
    },
    {
      question: "How can I improve my ED?",
      answer:
        "There are multiple factors that contribute to your sexual health. With this in mind, there are certainly ways in which you can improve your erectile dysfunction. Lifestyle changes that promote overall health is a great place to start. Eating a healthy diet that promotes heart vitality and non-inflammatory, regular exercise and with cutting down on health-harming behaviour such as cigarette smoking and recreational drugs can make impactful change. Of course, there is also your mental well-being and intimate relationships that you should take into consideration. Therapy may be useful in these circumstances to help identify the root cause of any psychological difficulties you may be experiencing. Lastly, we have to mention alcohol. Its widely enjoyed and we wouldn’t want you to miss out on the fun, but if you notice that it may hampering your experience in the bedroom, maybe give it a miss or reduce it down next time.",
    },
  ];
  const groupedFaqs = useMemo(() => {
    if (!faqs || faqs.length === 0) return [];

    const hasSections = faqs.some((faq) => faq.section);

    if (!hasSections) {
      return [{ title: null, faqs }];
    }

    const sections = {};
    faqs.forEach((faq) => {
      const sectionTitle = faq.section || "Other";
      if (!sections[sectionTitle]) {
        sections[sectionTitle] = [];
      }
      sections[sectionTitle].push(faq);
    });

    return Object.entries(sections).map(([title, sectionFaqs]) => ({
      title,
      faqs: sectionFaqs,
    }));
  }, [faqs]);

  return (
    <div className="max-w-[1184px] mx-auto px-5 md:px-0 py-7 md:py-12">
      <h2 className="text-[32px] text-center md:text-[48px] leading-[36.8px] md:leading-[55.2px] max-w-xs lg:max-w-full tracking-[-0.01em] md:tracking-[-0.02em] font-[550] mb-3 md:mb-4 headers-font">
        {title}
      </h2>
      <p className="text-[18px] md:text-[20px] leading-[25.2px] md:leading-[28px] font-[400] mb-[40px] md:mb-[80px]">
        {subtitle}
      </p>

      <div
        className={`mx-auto grid ${
          name && !groupedFaqs.some((section) => section.title)
            ? "md:grid-cols-2 lg:grid-cols-3 gap-[24px] lg:gap-[174px]"
            : ""
        } items-start`}
      >
        {name && !groupedFaqs.some((section) => section.title) && (
          <div>
            <h3 className="text-[20px] md:text-[24px] leading-[23px] md:leading-[27.6px] font-[450] md:pt-4 headers-font">
              {nameWithLineBreak ? (
                <>
                  {nameWithLineBreak.firstLine}
                  <br />
                  {nameWithLineBreak.secondLine}
                </>
              ) : (
                name
              )}
            </h3>
          </div>
        )}
        <div
          className={`${
            name && !groupedFaqs.some((section) => section.title)
              ? "self-start lg:col-span-2"
              : "mx-auto md:w-3/4"
          }`}
        >
          {groupedFaqs.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className={`mb-8 last:mb-0 ${
                section.title
                  ? "grid md:grid-cols-2 lg:grid-cols-3 gap-[24px] lg:gap-[174px] items-start"
                  : ""
              }`}
            >
              {section.title && (
                <div>
                  <h3 className="text-[20px] md:text-[24px] leading-[23px] md:leading-[27.6px] font-[450] md:pt-4 headers-font text-[#8B6F47]">
                    {section.title}
                  </h3>
                </div>
              )}
              <div
                className={`${section.title ? "self-start lg:col-span-2" : ""}`}
              >
                {section.faqs.map((faq, index) => (
                  <FaqItem
                    key={`${sectionIndex}-${index}`}
                    question={faq.question}
                    answer={faq.answer}
                    isFirstCardOpen={
                      isFirstCardOpen && sectionIndex === 0 && index === 0
                    }
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FaqsSection;
