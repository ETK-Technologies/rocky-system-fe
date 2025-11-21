"use client";

import { useMemo } from "react";
import PrivacyPolicyHeader from "@/components/PrivacyPolicy/PrivacyPolicyHeader";
import PrivacyPolicyNav from "@/components/PrivacyPolicy/PrivacyPolicyNav";
import Section from "@/components/utils/Section";
import MoreQuestions from "@/components/MoreQuestions";

// Decode HTML entities (works on both server and client)
const decodeHtml = (html) => {
  if (typeof window === "undefined") {
    // Server-side: use string replacement
    return html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  } else {
    // Client-side: use DOM
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  }
};

const PrivacyPolicyContent = ({ pageData }) => {
  // Parse HTML content and extract sections
  const { introContent, sections, navigationItems, lastUpdated, styledContent } = useMemo(() => {
    if (!pageData || !pageData.content) {
      return {
        introContent: "",
        sections: [],
        navigationItems: [],
        lastUpdated: null,
        styledContent: "",
      };
    }

    // Decode the content
    let decodedContent = decodeHtml(pageData.content);

    // Extract navigation items from the ordered list
    const navItems = [];
    const navMatch = decodedContent.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);
    if (navMatch) {
      const navContent = navMatch[1];
      const linkMatches = Array.from(navContent.matchAll(/<a[^>]*href="#([^"]+)"[^>]*>([^<]+)<\/a>/g));
      for (const match of linkMatches) {
        const id = match[1];
        const text = match[2].trim();
        navItems.push({ id, text });
      }
    }

    // Extract intro content (first two paragraphs before the <ol>)
    let introContent = "";
    const introDivMatch = decodedContent.match(/<div[^>]*>([\s\S]*?)<ol/);
    if (introDivMatch) {
      const introDiv = introDivMatch[1];
      const pMatches = Array.from(introDiv.matchAll(/<p[^>]*>(.*?)<\/p>/g));
      if (pMatches.length >= 2) {
        introContent = `${pMatches[0][1]} ${pMatches[1][1]}`;
      }
    }

    // Extract all sections with IDs - need to handle nested divs properly
    const extractedSections = [];
    let remainingContent = decodedContent;

    // Find all divs with id attributes
    const idMatches = Array.from(remainingContent.matchAll(/<div[^>]*id="([^"]+)"[^>]*>/g));

    for (let i = 0; i < idMatches.length; i++) {
      const match = idMatches[i];
      const id = match[1];
      const startIndex = match.index + match[0].length;

      // Find the end of this section (next div with id or end of content)
      let endIndex = remainingContent.length;
      if (i < idMatches.length - 1) {
        endIndex = idMatches[i + 1].index;
      }

      // Extract content between this div and the next
      let content = remainingContent.substring(startIndex, endIndex);

      // Count opening and closing divs to find the proper closing tag
      let divCount = 1; // Start with 1 for the opening div
      let pos = startIndex;
      while (divCount > 0 && pos < remainingContent.length) {
        const nextOpen = remainingContent.indexOf('<div', pos);
        const nextClose = remainingContent.indexOf('</div>', pos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          divCount++;
          pos = nextOpen + 4;
        } else {
          divCount--;
          if (divCount === 0) {
            content = remainingContent.substring(startIndex, nextClose);
            break;
          }
          pos = nextClose + 6;
        }
      }

      content = content.trim();
      if (content) {
        extractedSections.push({ id, content });
      }
    }

    // Format date
    let formattedDate = null;
    if (pageData.publishedAt) {
      try {
        const date = new Date(pageData.publishedAt);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      } catch (e) {
        // Keep null if date parsing fails
      }
    }

    // Build styled content from sections
    let styled = "";

    // Add intro if exists
    if (introContent) {
      styled += `<div class="text-[16px] md:text-[18px] leading-[160%] mb-10 md:mb-14">${introContent}</div>`;
    }

    // Process each section
    for (const section of extractedSections) {
      let sectionHtml = section.content;

      // Style h2 headings (section titles)
      sectionHtml = sectionHtml.replace(
        /<h2[^>]*>(.*?)<\/h2>/gi,
        '<h2 class="text-[18px] md:text-[20px] text-[#AE7E56] leading-[140%] font-[500] mb-4 md:mb-6">$1</h2>'
      );

      // Style div elements that are section subtitles (check for specific patterns)
      sectionHtml = sectionHtml.replace(
        /<div[^>]*>([^<]+)<\/div>/g,
        (match, text) => {
          const trimmed = text.trim();
          // Check if it looks like a subtitle (short, capitalized, no ending punctuation)
          if (trimmed.length < 80 && !trimmed.endsWith(".") && !trimmed.endsWith(":") && trimmed.match(/^[A-Z]/)) {
            return `<div class="text-[32px] md:text-[40px] leading-[115%] tracking-[-0.01em] md:tracking-[-0.02em] mb-4 md:mb-6 headers-font">${trimmed}</div>`;
          }
          // Regular div with content
          if (trimmed.length > 0) {
            return `<div class="text-[16px] mb-4 md:text-[18px] leading-[160%] font-[400]">${trimmed}</div>`;
          }
          return match;
        }
      );

      // Style paragraphs
      sectionHtml = sectionHtml.replace(
        /<p[^>]*>(.*?)<\/p>/gi,
        '<p class="text-[16px] md:text-[18px] leading-[160%] font-[400] text-[#000000D9] mb-6">$1</p>'
      );

      // Style spans (definition terms) - preserve content
      sectionHtml = sectionHtml.replace(
        /<span[^>]*>(.*?)<\/span>/gi,
        '<span class="font-[600] opacity-100 mt-4 mb-4">$1</span>'
      );

      // Style definition divs (divs containing spans)
      sectionHtml = sectionHtml.replace(
        /<div[^>]*>(<span[^>]*>.*?<\/span>.*?)<\/div>/gi,
        '<div class="text-[16px] mb-4 md:text-[18px] leading-[160%] font-[400]">$1</div>'
      );

      // Style lists
      sectionHtml = sectionHtml.replace(/<ul[^>]*>/gi, '<ul class="list-disc pl-6 mb-6 space-y-2">');
      sectionHtml = sectionHtml.replace(
        /<li[^>]*>(.*?)<\/li>/gi,
        '<li class="text-[16px] md:text-[18px] leading-[160%] font-[400] mb-2">$1</li>'
      );

      // Style links
      sectionHtml = sectionHtml.replace(
        /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
        '<a href="$1" class="duration-300 hover:text-gray-800 underline">$2</a>'
      );

      // Wrap section in container
      styled += `<div id="${section.id}" class="mb-10 md:mb-14">${sectionHtml}</div>`;
    }

    return {
      introContent,
      sections: extractedSections,
      navigationItems: navItems,
      lastUpdated: formattedDate,
      styledContent: styled,
    };
  }, [pageData]);

  // If no data, show fallback or loading
  if (!pageData) {
    return (
      <Section>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading privacy policy...</p>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <PrivacyPolicyHeader lastUpdated={lastUpdated} />
      <div className="md:flex gap-[120px]">
        <div className="md:w-[784px]">
          {/* Mobile Navigation */}
          <PrivacyPolicyNav variant="mobile" navigationItems={navigationItems} />

          {/* Render Styled Content (includes intro and all sections) */}
          <div
            className="privacy-policy-content"
            dangerouslySetInnerHTML={{ __html: styledContent }}
          />
        </div>
        {/* Desktop Navigation */}
        <PrivacyPolicyNav variant="desktop" navigationItems={navigationItems} />
      </div>
      <div className="md:hidden">
        <MoreQuestions buttonText="Start Free Consultation" />
      </div>
    </Section>
  );
};

export default PrivacyPolicyContent;
