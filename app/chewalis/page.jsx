"use client";

import RockyFeatures from "@/components/RockyFeatures";
import CoverSection from "@/components/utils/CoverSection";
import Section from "@/components/utils/Section";
import HowRockyWorks from "@/components/HowRockyWorks";
import RockyInTheNews from "@/components/RockyInTheNews";
import WhyChewalis from "@/components/ChewalisPage/WhyChewalis";
import TeamSection from "@/components/TeamSection";
import ReviewsSection from "@/components/ReviewsSection";
import ChewalisFaqs from "@/components/ChewalisPage/ChewalisFaqs";
import ChewalisProducts from "@/components/ChewalisPage/ChewalisProducts";
import EdTreatment from "@/components/ChewalisPage/EdTreatment";
import TakeRockyChewalis from "@/components/ChewalisPage/TakeRockyChewalis";
import CommonStats from "@/components/ChewalisPage/CommonStats";
import SafeAndSecure from "@/components/ChewalisPage/SafeAndSecure";
import EdAtYourFingertips from "@/components/ChewalisPage/EdAtYourFingertips";
import HeroSection from "@/components/shared/HeroSection";

const heroItems = [
  {
    text: "New discreet dissolvable mint",
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/hospital%201.png",
  },
  {
    text: "Same proven ingredients as Cialis©",
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/stethoscope%201.png",
  },
  {
    text: "No office visit required",
    icon: "https://myrocky.b-cdn.net/WP%20Images/Global%20Images/Pre%20Sell/dns-services%201.png",
  },
];

const chewalisButtons = [
  {
    href: "/ed-flow/",
    text: "Get Started",
    className:
      "h-11 md:px-[24px] py-3 md:py-[11.5px] rounded-[64px] flex items-center space-x-2 transition justify-center bg-black text-white hover:bg-gray-800",
  },
  {
    href: "/quiz/ed-pre-consultation/",
    text: "See if treatment is right for me",
    className:
      "h-11 md:px-[24px] py-3 md:py-[11.5px] rounded-[64px] flex items-center space-x-2 transition justify-center bg-white border border-black text-black hover:bg-gray-100",
  },
];

export default function Home() {
  return (
    <div>
      <CoverSection>
        <HeroSection
          title="Boost intimacy with Chewalis Mints."
          description="Skip the long wait times and get 1:1 support form a licensed healthcare practitioner."
          items={heroItems}
          buttons={chewalisButtons}
          imageSrc="https://myrocky.b-cdn.net/WP%20Images/Sexual%20Health/chewalis-cover-adjusted.webp"
          imageAlt="hero Image"
          hideDescriptionOnMobile={true}
        />
      </CoverSection>
      <RockyFeatures />

      <Section>
        <WhyChewalis />
      </Section>

      <RockyInTheNews />

      <Section bg={"bg-[#f7f9fb]"}>
        <EdTreatment />
      </Section>

      <Section>
        <TakeRockyChewalis />
      </Section>

      <Section>
        <HowRockyWorks
          title="How to get Rocky Chewalis Mints Online"
          subtitle="Quick, simple, convenient. We're here to support your health journey every step of the way through."
        />
      </Section>

      <Section>
        <ChewalisProducts />
      </Section>
      <hr className=" border-t-[0.5px] border-[#E2E2E1]" />
      <Section>
        <TeamSection />
      </Section>

      <Section bg={"bg-[#F5F4EF]"}>
        <ReviewsSection />
      </Section>

      <Section>
        <CommonStats />
      </Section>

      <Section bg={"bg-[#F7F9FB]"}>
        <EdAtYourFingertips />
      </Section>

      <Section>
        <SafeAndSecure />
      </Section>

      <Section>
        <ChewalisFaqs />
      </Section>
    </div>
  );
}
