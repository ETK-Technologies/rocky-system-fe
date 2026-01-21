"use client";

import Section from "@/components/utils/Section";
import { useState, useMemo } from "react";
import { useSearch } from "@/components/utils/UseSearch";
import CoverSection from "@/components/FAQS/CoverSection";
import CategoryContainer from "@/components/FAQS/CategoryContainer";
import FAQSContainer from "@/components/FAQS/FAQSContainer";
import MoreQuestionContainer from "@/components/FAQS/MoreQuestionContainer";
import SearchResult from "@/components/FAQS/SearchResult";

const FaqsButton = ["all", "hair loss", "weight loss", "sexual health"];

const Faqs = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Get all FAQs data
  const allFaqs = useMemo(() => {
    return [
      ...HomeFaqs.map((faq) => ({ ...faq, category: "all" })),
      ...HairLossFaqs.map((faq) => ({ ...faq, category: "hair loss" })),
      ...WlFaqs.map((faq) => ({ ...faq, category: "weight loss" })),
      ...SexualHealthFaqs.map((faq) => ({ ...faq, category: "sexual health" })),
    ];
  }, []);

  const {
    searchValue,
    setSearchValue,
    debouncedValue,
    isSearching,
    handleSearch,
    highlightText,
  } = useSearch();

  // Filter FAQs based on search or category
  const displayedFaqs = useMemo(() => {
    // If searching (with 3+ characters), search across all FAQs
    if (debouncedValue && debouncedValue.trim().length >= 3) {
      const searchTerm = debouncedValue.toLowerCase().trim();
      return allFaqs
        .filter((faq) => {
          return (
            faq.question.toLowerCase().includes(searchTerm) ||
            faq.answer.toLowerCase().includes(searchTerm)
          );
        })
        .map((faq) => ({
          ...faq,
          // Highlight the matched text
          question: highlightText(faq.question, searchTerm),
          answer: highlightText(faq.answer, searchTerm),
        }));
    }

    // Otherwise, filter by category
    switch (selectedCategory) {
      case "weight loss":
        return WlFaqs;
      case "hair loss":
        return HairLossFaqs;
      case "sexual health":
        return SexualHealthFaqs;
      case "all":
      default:
        return HomeFaqs;
    }
  }, [debouncedValue, selectedCategory, allFaqs, highlightText]);

  const showCategoryFilters =
    !debouncedValue || debouncedValue.trim().length < 3;

  return (
    <>
      <CoverSection
        setSearchValue={setSearchValue}
        searchValue={searchValue}
        handleSearch={handleSearch}
      />
      <Section>
        {/* Show search status if searching */}
        <SearchResult
          debouncedValue={debouncedValue}
          isSearching={isSearching}
          searchValue={searchValue}
          displayedFaqs={displayedFaqs}
        />

        {/* Only show category filters when not searching */}
        {showCategoryFilters && (
          <CategoryContainer
            FaqsButton={FaqsButton}
            setSelectedCategory={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        )}

        {/* Display FAQs or loading skeleton */}
        <FAQSContainer
          debouncedValue={debouncedValue}
          isSearching={isSearching}
          searchValue={searchValue}
          displayedFaqs={displayedFaqs}
        />

        <MoreQuestionContainer
          debouncedValue={debouncedValue}
          displayedFaqs={displayedFaqs}
        />
      </Section>
    </>
  );
};

export default Faqs;

// Keep your existing FAQ data arrays here
const HomeFaqs = [
  {
    question: "What is Rocky?",
    answer:
      "Rocky is a 100% online platform with a focus to normalize men's health and eliminate the stigma surrounding it. At Rocky, we make it easy for patients to connect to licensed healthcare professionals. We specialize in medical conditions commonly experienced by men including Erectile Dysfunction and Hair Loss. We've built a simple & convenient online process which helps you connect to healthcare professionals in order to get customized treatment plans, shipped right to your door.",
  },
  {
    question: "How does Rocky work?",
    answer:
      "Rocky offers prescription and over-the-counter products. For Prescription medication, you will need to complete an online medical intake/ questionnaire pertaining to the medical condition you are interested in treating. This step covers your medical history, medical conditions, medication you currently take, etc. A licensed healthcare provider then takes a look at your information and assesses whether or not you are a good candidate for any particular treatment. If a healthcare professional determines a treatment is right for you, it is delivered by Rocky Pharmacy straight to your doorstep.",
  },
  {
    question: "Who looks after you at Rocky?",
    answer:
      "Rocky is operated by Healthcare Professionals including Doctors, Nurse Practitioners, and Pharmacists. Our team is experienced and readily available to ensure your needs are met. You can contact any member of the team by portal message, or emailing the respective departments directly.",
  },
  {
    question: "How does Rocky ensure patient privacy?",
    answer:
      "Rocky handles the privacy and security of all our customers with great care. Our platform meets all required regulatory compliance, as well having systems in place to ensure all information provided is secured. Any medical or personal information provided is only accessed by the medical team managing your care.",
  },
  {
    question: "What products does Rocky offer?",
    answer: `
      <div class="pb-4 text-gray-700">
        
        <p>Rocky offers a range of treatments across the following categories:</p>
        
        <div><span class="font-[700]">Sexual health:</span> Sildenafil (Generic), Tadalafil (Generic) </div>
        <div><span class="font-[700]">Hair loss:</span> Finasteride & Minoxidil Topical Foam </div>
        <div><span class="font-[700]">Body optimization:</span> Ozempic®, Mounjaro®, Wegovy®, Rybelsus®. </div>
      </div>
    `,
  },
  {
    question: "How do I get started with Rocky?",
    answer:
      "To get started, take the treatment quiz or choose your desired product. Then, create a profile by providing some basic information. Rocky offers fast, free delivery—no in-person visit required.",
  },
  {
    question: "Do I need an in-person visit to receive treatment?",
    answer:
      "No, all care is 100% online. You can manage your treatment securely through our platform—no in-person visits required.",
  },
  {
    question: "How can I track my order?",
    answer:
      "Track your order by logging into the Rocky platform. You’ll be able to check order status and manage your treatment.",
  },
  {
    question: "How can I contact Rocky for support?",
    answer:
      "For support, message us through the portal, email the appropriate department, or call +1 (416) 900-1444 (Mon–Fri, 6 PM–8 PM EST)",
  },
  {
    question: "What is the name and address of our affiliate partner pharmacy?",
    answer:
      "Affiliate Partner Pharmacy: Dania Discount Drugs Inc.5420 NW 33rd Ave Suite 7B Fort Lauderdale, FL 33309",
  },
];
const HairLossFaqs = [
  {
    question: "What are the common causes of hair loss?",
    answer:
      "The most common cause tends to be hereditary which becomes evident as you age, typically starting in your 20’s. Another name for this type of hair loss is male pattern baldness or androgenetic alopecia. The first sign of male pattern hair loss may be a receding hairline or thinning around the temples or crown of the head. Other causes of hair loss include iron deficiency, thyroid disease and autoimmune disease. In some instances, it could be a local scalp problem such as seborrhoeic dermatitis, fungal infections or psoriasis. Here at Rocky, we focus on male pattern baldness and treat this using clinically proven/FDA approved medications consisting of pharmaceutical and non-pharmaceutical products.",
  },
  {
    question: "What is DHT and how is it contributing to my hair loss?",
    answer:
      "Testosterone is the hormone that contributes to the formation of male characteristics, like your beard growing and your voice getting deeper. Testosterone gets broken down into dihydrotestosterone (DHT) and DHT seems to contribute to hair loss by shrinking hair follicles which makes it harder for hair to regrow.",
  },
  {
    question: "How do I know what type of hair loss I have?",
    answer:
      "Male pattern baldness is usually diagnosed by its characteristic features. This includes a slowly receding hairline or thinning at the crown and temples. Hair loss that is sudden or accompanied by local symptoms, such as itching or appearance of a rash, generally indicates a different cause that requires discussion with a doctor. If you are feeling generally unwell and experiencing hair loss, this may require additional investigations.",
  },
  {
    question: "What treatment exist for hair loss?",
    answer:
      "The answer to this depends on the cause of your hair loss. When it comes to male pattern baldness, there are two FDA approved medications, Minoxidil (Rogaine) and Finasteride (Propecia). Minoxidil is a topical solution applied to the scalp, which improves blood flow to your hair follicles. This stimulates hair regrowth and is best used for new hair loss. Finasteride is an oral medication that works by blocking the hormone DHT, which is the main cause behind androgenic alopecia. By doing so, it prevents hair loss from happening. When used alone they are effective. However, using the two medications together provides a synergistic effect, leading to better results. For men experiencing hair loss due to other conditions, treating the root cause may be necessary and best done with the help of a medical practitioner.",
  },
  {
    question: "Can hair loss be cured?",
    answer:
      "The simple answer is no. But there are effective medications, which may stop hair loss and restore new hair. There are also procedures available such as hair transplants which may a suitable option for you.",
  },
  {
    question: "Can certain hairstyles cause hair loss?",
    answer:
      "Yes – this type of hair loss if known as “traction alopecia” which results due to constant pulling your hair. It may result from wearing your hair in a bun, dreadlocks/braids or any other type of hairstyle that puts stress on your hair follicles. Avoiding these hairstyles may help prevent or stop this type of hair loss.",
  },
  {
    question: "Is hair restoration treatment better than hair loss medication?",
    answer:
      "The honest answer is, it depends. They each have their own advantages and it comes down to what is right for you. The great thing about hair transplantation is that it is generally a permanent solution. However it requires time off for recovery, can cause permanent scarring and is expensive. In comparison, hair loss medication is unlikely to cause any long-lasting side effects, is more affordable and not time consuming. However, the effects fade away once treatment is stopped.",
  },
];
const SexualHealthFaqs = [
  {
    question: "What causes ED?",
    answer:
      "Erectile dysfunction can be caused by a variety of issues such as psychological distress, medical conditions, or medications. Situational anxiety and stress tend to be the leading causes in younger men and may restrict blood flow to the penis at the wrong moment. As you age, ED may become persistent due to underlying problems with nerves, blood vessels or hormone production. Our online medical assessment can help establish the cause and treat your ED.",
  },
  {
    question: "How do ED medications work?",
    answer:
      "Get the party started; the pills will do the rest. When sexually aroused, the body releases a substance called nitric oxide which works to relax the blood vessels in the penis. When the blood vessels relax, the blood rushes to the penis, leaving it hard and ready for penetration. When sexual intercourse is complete, an enzyme called PDE5 shuts this process off. ED pills work by blocking PDE5, which makes it easier for your erection to go longer and stronger.",
  },
  {
    question: "What is the safest medication for ED?",
    answer:
      "All medications go through extensive clinical trials and quality checks before getting approved by the U.S. FDA. The safety and effectiveness of erectile dysfunction medications is well established, which is why it is an excellent treatment option for most men. Our online questionnaire will take into account your personal medical history and determine if these pills are right for you!",
  },
  {
    question: "What is the most effective medication for ED?",
    answer:
      "While both Sildenafil (Viagra) and Tadalafil (Cialis) are equally effective, there are a few differences. Sildenafil (Viagra) can take between 30-60 mins to work after ingestion, but sometimes can be delayed up to 2 hours with its effects lasting an average of 4 hours; food affects its effects. Tadalafil (Cialis), on the other hand, may act faster, last longer and it works regardless of when you had your last meal. With enough information, Rocky can help you find an ED medication and dosage that is right for you. Our platform provides ongoing care from our healthcare providers.",
  },
  {
    question: "What are the side effects of ED medications?",
    answer:
      "In general, ED treatment is well tolerated. However, if side effects occur, they are usually mild and temporary. This includes headaches, flushed skin, a runny nose and upset stomach. ED medications can very rarely cause serious side effects such as priapism (a prolonged erection lasting more than 4 hours after stimulation has ended) which can result in permanent damage to your penis if not treated immediately. Other rare events include sudden loss of vision or loss of hearing.",
  },
  {
    question: "Which ED medication is best for me?",
    answer:
      "There is no particular medication that is superior to the other; they are equally effective. However, one option vs another may have a particular advantage that is best suited for your needs. Our medical experts can help find the best treatment for each case.",
  },
  {
    question: "Are ED medications available OTC?",
    answer:
      "In the United States, erectile dysfunction medications are not available over-the-counter (OTC) and can only be obtained with a prescription. ED medications sold without a prescription are illegal and could potentially result in harm; ED medication in the counterfeit market does not undergo the correct production, testing, and approval and thus is not safe. Rocky provides access to a licensed health care team so you can be certain that you are getting safe and effective care. Through our online platform, you will be guided through a series of medical questions which are then reviewed by a licensed U.S. physician. Once the medical questionnaire is reviewed, you will be notified if you have been approved, and if so, the appropriate treatment is delivered to your doorstep.",
  },
  {
    question: "How can I improve my ED?",
    answer:
      "There are multiple factors that promote your sexual health. There are certainly ways in which you can improve your erectile dysfunction. Lifestyle changes that promote overall health are a great place to start. Eating a healthy diet that promotes heart vitality, regularly exercising and cutting down on health-harming behavior, such as cigarette smoking and recreational drug usage, can have an impactful change. Of course, there is also your mental well-being and intimate relationships that you should take into consideration. Therapy may be useful in these instances to help identify the root cause of any psychological difficulties you may be experiencing. Lastly, we have to mention alcohol. Its widely enjoyed and we wouldn’t want you to miss out on the fun, but if you notice that it may be hampering your experience in the bedroom, maybe give it a miss or reduce your consumption next time.",
  },
];
const WlFaqs = [
  {
    question: "How much does the Body Optimization Program cost?",
    answer:
      "The initial consultation fee is $99. The cost of medication along with a $40 program fee is charged monthly. The program fee includes access to clinicians, new prescriptions and pharmacy counselling.",
  },
  {
    question: "Do you accept insurance?",
    answer:
      "To determine insurance coverage you will need to contact your insurance provider directly. We can provide you with a detailed invoice upon request, which you can submit to your insurance for reimbursement purposes.",
  },
  {
    question: "What can I expect after I sign up?",
    answer:
      "Upon completing the initial online consultation, a Rocky Healthcare provider will assess this and determine if you are eligible. Please check your account for messages from your clinician.",
  },
  {
    question: "Why do I need a blood test?",
    answer:
      "Blood tests give insight into your current health and allows your clinician to better understand your needs. This helps them tailor their advice to meet your specific situation.",
  },
  {
    question: "What are the side effects of GLP-1 medications?",
    answer:
      "Common side effects include nausea, vomiting, abdominal pain, constipation and/or diarrhea. More severe side effects are rare but can include pancreatitis, gallbladder disease, low blood sugar, severe allergies, visual disturbances, rapid heartbeat, and mood disturbances. This is not a full list and we encourage you to please consult with a clinician for further information.",
  },
  {
    question: "How do I schedule a call with my provider?",
    answer:
      "After submitting your questionnaire, you will be able to schedule a call with a licensed U.S. prescriber. To request this, simply send a message to your prescriber through your account by clicking on messages. They will send you a link to schedule a call at your convenience.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Cancellations can be made at any time to avoid future charges. However, previously incurred monthly fees are nonrefundable.",
  },
  {
    question: "How do GLP-1s work?",
    answer:
      "Body Optimization injections available through Rocky belong to the GLP-1 class of medications, mimicking the natural hormone GLP-1. They work by reducing appetite and promoting a feeling of fullness, leading to reduced food intake and body optimization.",
  },
  {
    question: "How can I get a GLP-1 prescription at Rocky?",
    answer:
      'Simply click <a href="/quiz/wlprecons" class="underlined-link">here</a> and get started today!',
  },
  {
    question: "Which GLP-1s does Rocky offer?",
    answer:
      "Rocky provides prescriptions for several GLP-1 medications, including Ozempic, Mounjaro® and Wegovy.",
  },
];
